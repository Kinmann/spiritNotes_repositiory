require('dotenv').config({ path: require('path').resolve(__dirname, '.env'), override: true });
const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Global options for all functions
setGlobalOptions({ region: "asia-northeast3" });

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());

// Gemini AI 초기화 (Secret Manager에서 환경변수로 제공됨)
// Lazy initialization helper for genAI
const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    return new GoogleGenerativeAI(apiKey);
  }
  return null;
};

// --- Helper Functions ---

const calculateFlavorDNA = (notes) => {
  let dna = { peat: 0, floral: 0, fruity: 0, woody: 0, spicy: 0, sweet: 0 };
  const validNotes = notes.filter(n => (n.totalRating || n.rating) > 0);
  if (!validNotes || validNotes.length === 0) return dna;

  let totalWeight = 0;
  const lambda = 0.05;
  const now = Date.now();

  validNotes.forEach(note => {
    const noteTime = note.createdAt?.toMillis ? note.createdAt.toMillis() : (new Date(note.createdAt).getTime() || now);
    const daysSince = Math.max(0, (now - noteTime) / (1000 * 60 * 60 * 24));
    const timeWeight = Math.exp(-lambda * daysSince);
    const ratingWeight = (note.totalRating || note.rating || 0) / 5.0;
    const finalWeight = timeWeight * ratingWeight;

    totalWeight += finalWeight;
    Object.keys(dna).forEach(key => {
      const flavorScore = note.flavor_axes?.[key] || 0;
      dna[key] += (flavorScore * finalWeight);
    });
  });

  if (totalWeight > 0) {
    Object.keys(dna).forEach(key => {
      dna[key] = Math.round((dna[key] / totalWeight) * 10) / 10;
    });
  }
  return dna;
};

// --- Helper Functions for Data Enrichment ---

const buildHierarchy = (id, dataMap) => {
  let currentId = id;
  let path = [];
  while (currentId && dataMap[currentId]) {
    path.unshift(dataMap[currentId].name);
    currentId = dataMap[currentId].parentId;
  }
  return path.join(' > ');
};

const getEnrichmentMaps = async (db) => {
  const categoriesMap = {};
  const locationsMap = {};
  
  const catsSnapshot = await db.collection('categories').get();
  const catsDocData = {};
  catsSnapshot.forEach(doc => catsDocData[doc.id] = doc.data());
  catsSnapshot.forEach(doc => {
    categoriesMap[doc.id] = buildHierarchy(doc.id, catsDocData);
  });

  const locsSnapshot = await db.collection('locations').get();
  const locsDocData = {};
  locsSnapshot.forEach(doc => locsDocData[doc.id] = doc.data());
  locsSnapshot.forEach(doc => {
    locationsMap[doc.id] = buildHierarchy(doc.id, locsDocData);
  });
  
  return { categoriesMap, locationsMap };
};

const enrichSpirit = (s, categoriesMap, locationsMap) => ({
  ...s,
  category: (s.categoryId && categoriesMap[s.categoryId]) || s.category || '위스키 > 스카치 > 싱글몰트',
  origin: (s.locationId && locationsMap[s.locationId]) || s.origin || '스코틀랜드 > 스페이사이드'
});

// --- API Routes ---

const router = express.Router();

// GET all spirits with category and location metadata
router.get('/spirits', async (req, res) => {
  try {
    const { categoriesMap, locationsMap } = await getEnrichmentMaps(db);
    const spiritsSnapshot = await db.collection('spirits').get();
    
    const spirits = spiritsSnapshot.docs.map(doc => {
      const data = doc.id ? { id: doc.id, ...doc.data() } : doc.data();
      return enrichSpirit(data, categoriesMap, locationsMap);
    });

    res.json({ success: true, spirits });
  } catch (error) {
    console.error('Error fetching spirits:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /notes/:userId - Fetch all notes for a specific user
router.get('/notes/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { categoriesMap, locationsMap } = await getEnrichmentMaps(db);
    
    // Query the user's notes subcollection
    const notesSnapshot = await db.collection('users').doc(userId).collection('notes')
      .orderBy('createdAt', 'desc')
      .get();
    
    const notes = notesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Enrich spirit data within the note if it exists
        spirit: data.spirit ? enrichSpirit(data.spirit, categoriesMap, locationsMap) : null
      };
    });

    res.json({ success: true, notes });
  } catch (error) {
    console.error('Error fetching user notes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /notes/:userId/:noteId - Fetch a single note
router.get('/notes/:userId/:noteId', async (req, res) => {
  try {
    const { userId, noteId } = req.params;
    const { categoriesMap, locationsMap } = await getEnrichmentMaps(db);
    
    const noteDoc = await db.collection('users').doc(userId).collection('notes').doc(noteId).get();
    
    if (!noteDoc.exists) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    const data = noteDoc.data();
    const note = {
      id: noteDoc.id,
      ...data,
      spirit: data.spirit ? enrichSpirit(data.spirit, categoriesMap, locationsMap) : null
    };

    res.json({ success: true, note });
  } catch (error) {
    console.error('Error fetching note detail:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update Flavor DNA for a user
router.post('/flavor-dna/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const notesSnapshot = await db.collection('users').doc(userId).collection('notes').get();
    
    const notes = notesSnapshot.docs.map(doc => doc.data());
    const flavorDNA = calculateFlavorDNA(notes);

    await db.collection('users').doc(userId).set({ flavorDNA }, { merge: true });
    res.json({ success: true, flavorDNA });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Calculate recommendations based on Flavor DNA
router.get('/recommendations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const userDoc = await db.collection('users').doc(userId).get();
    const userDNA = userDoc.data()?.flavorDNA;

    const notesSnapshot = await db.collection('users').doc(userId).collection('notes').get();
    const tastedSpiritIds = new Set();
    notesSnapshot.forEach(doc => tastedSpiritIds.add(doc.data().spirit_id));

    const spiritsSnapshot = await db.collection('spirits').get();
    const { categoriesMap, locationsMap } = await getEnrichmentMaps(db);
    const spirits = spiritsSnapshot.docs.map(doc => enrichSpirit({ id: doc.id, ...doc.data() }, categoriesMap, locationsMap));

    // Simple similarity calculation (Euclidean distance) if DNA exists
    const scoredSpirits = spirits.map(spirit => {
      let similarity = 0;
      if (userDNA && spirit.flavor_axes) {
        let sumSquaredDiff = 0;
        let count = 0;
        Object.keys(userDNA).forEach(key => {
          if (spirit.flavor_axes[key] !== undefined) {
            sumSquaredDiff += Math.pow(userDNA[key] - spirit.flavor_axes[key], 2);
            count++;
          }
        });
        similarity = count > 0 ? 1 / (1 + Math.sqrt(sumSquaredDiff)) : 0;
      } else {
        // Fallback for new users: popularity or random
        similarity = 0.5; 
      }
      return { ...spirit, similarity };
    });

    // Sort by similarity and take top 3
    const top3 = scoredSpirits
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3);

    // Get AI-powered recommendation reasons if Gemini is configured
    let recs = [];
    const genAI = getGenAI();
    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const dnaInfo = userDNA ? `User DNA: ${JSON.stringify(userDNA)}` : "Guest user";
        const candidatesText = top3.map(c => `- ${c.name} (Category: ${c.category || 'Unknown'})`).join('\n');
        const prompt = `${dnaInfo}\nCandidates:\n${candidatesText}\nProvide a unique recommendation reason for each in 1-2 Japanese or Korean sentences (based on context, default to Korean). Output JSON: [{ "id": "...", "name": "...", "reason": "..." }]`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonStr = text.match(/\[[\s\S]*\]/)?.[0] || '[]';
        recs = JSON.parse(jsonStr);
      } catch (aiError) {
        console.error("AI Recommendation error:", aiError);
        // Fallback if AI generation fails
        recs = top3.map(c => ({
          id: c.id,
          name: c.name,
          reason: `${c.category || ' whiskey'} 카테고리에서 추천하는 특별한 주류입니다.`
        }));
      }
    }

    const finalRecs = top3.map((spirit, i) => {
      const aiRec = Array.isArray(recs) ? recs.find(r => r.id === spirit.id) || recs[i] : {};
      return { 
        ...spirit, 
        reason: aiRec?.reason || `${spirit.category} 카테고리에서 추천하는 주류입니다.`,
        matchRate: Math.round(spirit.similarity * 100) 
      };
    });
    res.json({ success: true, recommendations: finalRecs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET all notes for a user (Joined with spirit metadata)
router.get('/notes/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const notesSnapshot = await db.collection('users').doc(userId).collection('notes')
      .orderBy('createdAt', 'desc')
      .get();
    
    if (notesSnapshot.empty) {
      return res.json({ success: true, notes: [] });
    }

    const { categoriesMap, locationsMap } = await getEnrichmentMaps(db);
    const spiritsSnapshot = await db.collection('spirits').get();
    const spiritsMap = {};
    spiritsSnapshot.forEach(doc => {
      spiritsMap[doc.id] = enrichSpirit({ id: doc.id, ...doc.data() }, categoriesMap, locationsMap);
    });

    const notes = notesSnapshot.docs.map(doc => {
      const noteData = doc.data();
      const spiritId = noteData.spirit_id;
      const spiritInfo = spiritId ? spiritsMap[spiritId] : null;

      return {
        id: doc.id,
        ...noteData,
        name: spiritInfo?.name || noteData.name,
        distillery: spiritInfo?.distillery || noteData.distillery,
        category: spiritInfo?.category || noteData.category,
        abv: spiritInfo?.abv || noteData.abv,
        volume: spiritInfo?.volume || noteData.volume,
        image: noteData.imageUrl || spiritInfo?.image || noteData.image || null
      };
    });

    res.json({ success: true, notes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET a single note detail
router.get('/notes/:userId/:noteId', async (req, res) => {
  try {
    const { userId, noteId } = req.params;
    const noteDoc = await db.collection('users').doc(userId).collection('notes').doc(noteId).get();
    
    if (!noteDoc.exists) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const noteData = noteDoc.data();
    const spiritId = noteData.spirit_id;
    
    let spiritInfo = null;
    if (spiritId) {
      const spiritDoc = await db.collection('spirits').doc(spiritId).get();
      if (spiritDoc.exists) {
        const { categoriesMap, locationsMap } = await getEnrichmentMaps(db);
        spiritInfo = enrichSpirit({ id: spiritDoc.id, ...spiritDoc.data() }, categoriesMap, locationsMap);
      }
    }

    const enrichedNote = {
      id: noteDoc.id,
      ...noteData,
      name: spiritInfo?.name || noteData.name,
      distillery: spiritInfo?.distillery || noteData.distillery,
      category: spiritInfo?.category || noteData.category,
      abv: spiritInfo?.abv || noteData.abv,
      volume: spiritInfo?.volume || noteData.volume,
      image: noteData.imageUrl || spiritInfo?.image || noteData.image || null
    };

    res.json({ success: true, note: enrichedNote });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE a note
router.delete('/notes/:userId/:noteId', async (req, res) => {
  try {
    const { userId, noteId } = req.params;
    await db.collection('users').doc(userId).collection('notes').doc(noteId).delete();
    res.json({ success: true, message: 'Note deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/persona/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    let persona = {
      title: "섬세한 미식가",
      description: "다양한 맛의 균형을 중요하게 생각하며, 특히 복합적인 풍미를 즐기는 취향입니다.",
      characteristics: ["균형 잡힌 선호도", "새로운 도전에 개방적"],
      recommendationFocus: ["복합미", "질감", "피니시"]
    };

    const genAI = getGenAI();
    if (userData && userData.flavorDNA && genAI) {
      try {
        const { flavorDNA } = userData;
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const prompt = `Analyze this Whiskey Flavor DNA: ${JSON.stringify(flavorDNA)}. Create a poetic Taste Persona in Korean. Output JSON: { "title": "...", "description": "...", "characteristics": ["..."], "recommendationFocus": ["..."] }`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonStr = text.match(/\{[\s\S]*\}/)?.[0] || '{}';
        const aiPersona = JSON.parse(jsonStr);
        if (aiPersona && aiPersona.title) {
          persona = aiPersona;
        }
      } catch (aiError) {
        console.error("AI Persona error:", aiError);
      }
    }
    
    res.json({ success: true, persona });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Support both production (with /api prefix from Hosting) and local (without /api prefix from Emulator)
app.use('/api', router);
app.use('/', router);

// Export the function
exports.api = onRequest({
  secrets: ["GEMINI_API_KEY"],
  invoker: "public"
}, app);
