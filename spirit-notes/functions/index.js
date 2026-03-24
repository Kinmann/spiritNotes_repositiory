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
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

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

const calculateCosineSimilarity = (vecA, vecB) => {
  const keys = ['peat', 'floral', 'fruity', 'woody', 'spicy', 'sweet'];
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  keys.forEach(k => {
    const a = vecA[k] || 0;
    const b = vecB[k] || 0;
    dotProduct += a * b;
    normA += Math.pow(a, 2);
    normB += Math.pow(b, 2);
  });
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

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

router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Spirit Notes Cloud Function is running' });
});

router.get('/spirits', async (req, res) => {
  try {
    const { categoriesMap, locationsMap } = await getEnrichmentMaps(db);
    const allSpiritsSnapshot = await db.collection('spirits').get();
    const spirits = allSpiritsSnapshot.docs.map(doc => 
      enrichSpirit({ id: doc.id, ...doc.data() }, categoriesMap, locationsMap)
    );
    res.json({ success: true, spirits });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/spirits/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const spiritDoc = await db.collection('spirits').doc(id).get();
    if (!spiritDoc.exists) return res.status(404).json({ error: 'Spirit not found' });
    const { categoriesMap, locationsMap } = await getEnrichmentMaps(db);
    const spirit = enrichSpirit({ id: spiritDoc.id, ...spiritDoc.data() }, categoriesMap, locationsMap);
    res.json({ success: true, spirit });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/flavor-dna/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const notesSnapshot = await db.collection('users').doc(userId).collection('notes').get();
    const notes = notesSnapshot.docs.map(doc => doc.data());
    const flavorDNA = calculateFlavorDNA(notes);
    await db.collection('users').doc(userId).set({ 
      flavorDNA, 
      lastUpdated: admin.firestore.FieldValue.serverTimestamp() 
    }, { merge: true });
    res.json({ success: true, flavorDNA });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/notes/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const notesSnapshot = await db.collection('users').doc(userId).collection('notes')
      .orderBy('createdAt', 'desc').get();
    
    if (notesSnapshot.empty) return res.json({ success: true, notes: [] });

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

router.get('/notes/:userId/:noteId', async (req, res) => {
  try {
    const { userId, noteId } = req.params;
    const noteDoc = await db.collection('users').doc(userId).collection('notes').doc(noteId).get();
    if (!noteDoc.exists) return res.status(404).json({ error: 'Note not found' });

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

router.delete('/notes/:userId/:noteId', async (req, res) => {
  try {
    const { userId, noteId } = req.params;
    await db.collection('users').doc(userId).collection('notes').doc(noteId).delete();
    res.json({ success: true, message: 'Note deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/recommendations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { categoriesMap, locationsMap } = await getEnrichmentMaps(db);
    let userDNA = null;
    let tastedSpiritIds = new Set();

    if (userId && userId !== 'guest') {
      const userDoc = await db.collection('users').doc(userId).get();
      const userData = userDoc.data();
      if (userData && userData.flavorDNA) {
        userDNA = userData.flavorDNA;
        const notesSnapshot = await db.collection('users').doc(userId).collection('notes').get();
        notesSnapshot.forEach(doc => tastedSpiritIds.add(doc.data().spirit_id));
      }
    }

    const allSpiritsSnapshot = await db.collection('spirits').get();
    const candidates = [];
    allSpiritsSnapshot.forEach(doc => {
      const spiritData = enrichSpirit({ id: doc.id, ...doc.data() }, categoriesMap, locationsMap);
      if (userDNA && spiritData.flavor_axes) {
        if (!tastedSpiritIds.has(doc.id)) {
          const similarity = calculateCosineSimilarity(userDNA, spiritData.flavor_axes);
          candidates.push({ ...spiritData, similarity });
        }
      } else {
        candidates.push({ ...spiritData, similarity: 0.5 + Math.random() * 0.4 });
      }
    });

    candidates.sort((a, b) => b.similarity - a.similarity);
    const top3 = candidates.slice(0, 3);
    
    let recs = [];
    if (!genAI) {
      // Fallback if AI is disabled or key is missing
      recs = top3.map(c => ({
        id: c.id,
        name: c.name,
        reason: `${c.category || ' whiskey'} 카테고리에서 당신의 취향과 가장 잘 어울리는 평점을 받은 주류입니다.`
      }));
    } else {
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

app.use('/api', router);

// Export the function
exports.api = onRequest({
  secrets: ["GEMINI_API_KEY"],
  invoker: "public"
}, app);
