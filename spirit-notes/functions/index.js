require('dotenv').config({ path: require('path').resolve(__dirname, '.env'), override: true });
const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');
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
// Initialize Gemini AI lazily to ensure secrets are loaded
let _genAIInstance = null;
const getGenAI = () => {
  if (!_genAIInstance) {
    let apiKey;
    try {
      // Attempt to get API key from Secret Manager (if configured)
      // This assumes 'geminiKey' is a secret variable accessible in the environment
      // For local development/emulators, this might throw, hence the fallback.
      apiKey = process.env.GEMINI_API_KEY_SECRET_MANAGER; // Placeholder for actual secret manager access
      if (!apiKey) { // Fallback if secret manager key isn't directly available or fails
        apiKey = process.env.GEMINI_API_KEY;
        console.log('[getGenAI] Using API key from process.env (Emulator mode or direct env var)');
      }
    } catch (e) {
      // Emulator fallback: use process.env
      apiKey = process.env.GEMINI_API_KEY;
      console.log('[getGenAI] Using API key from process.env (Emulator mode fallback)');
    }

    if (!apiKey) {
      console.error('[Schema Error] GEMINI_API_KEY is not defined in any source');
      return null;
    }
    _genAIInstance = new GoogleGenerativeAI(apiKey);
  }
  return _genAIInstance;
};

// --- Helper Functions ---

const calculateFlavorDNA = (notes) => {
  const now = new Date();
  const dna = { peat: 0, floral: 0, fruity: 0, woody: 0, spicy: 0, sweet: 0 };
  let totalWeight = 0;

  console.log(`[calculateFlavorDNA] Processing ${notes ? notes.length : 0} notes`);

  if (!notes || !Array.isArray(notes)) return dna;

  notes.forEach((note, index) => {
    // Robust date parsing (Firestore Timestamp, serialized Timestamp, Date object, or String)
    let createdAt = new Date();
    const rawDate = note.createdAt;
    
    if (rawDate) {
      if (typeof rawDate.toDate === 'function') {
        createdAt = rawDate.toDate();
      } else if (rawDate._seconds) {
        createdAt = new Date(rawDate._seconds * 1000);
      } else if (rawDate.seconds) {
        createdAt = new Date(rawDate.seconds * 1000);
      } else {
        createdAt = new Date(rawDate);
      }
    }

    // Ensure we have a valid Date
    if (isNaN(createdAt.getTime())) {
      createdAt = new Date();
    }
    
    // Calculate weight based on recency (last 30 days get full weight, older notes decay)
    const daysOld = Math.max(0, (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    
    // Weight calculation: linear decay over 90 days. Minimum weight 0.1
    const weight = Math.max(0.1, 1 - (daysOld / 90));
    
    // Rating weight: notes with better ratings have more influence (normalized 0-1, default 1 if no rating)
    const ratingScore = note.totalRating || note.rating;
    const ratingFactor = ratingScore ? (Number(ratingScore) / 5) : 1;
    
    const finalWeight = weight * ratingFactor;

    if (!isNaN(finalWeight) && finalWeight > 0) {
      totalWeight += finalWeight;
      Object.keys(dna).forEach(key => {
        const flavorScore = Number(note.flavor_axes?.[key]) || 0;
        dna[key] += (flavorScore * finalWeight);
      });
    }
  });

  if (totalWeight > 0 && !isNaN(totalWeight)) {
    Object.keys(dna).forEach(key => {
      dna[key] = Math.round((dna[key] / totalWeight) * 10) / 10;
      if (isNaN(dna[key])) dna[key] = 0;
    });
  }

  console.log('[calculateFlavorDNA] Final Weighted Result:', dna);
  return dna;
};

const generatePersona = async (flavorDNA) => {
  try {
    const genAI = getGenAI();
    if (!flavorDNA || !genAI) return null;

    const modelName = "gemini-2.5-flash";
    console.log(`[generatePersona] Calling Gemini with model: ${modelName}`);
    const model = genAI.getGenerativeModel({ model: modelName });
    const prompt = `
      Analyze this Persona's Whiskey Flavor DNA with extreme precision: ${JSON.stringify(flavorDNA)}.
      The DNA consists of 6 axes: Peat, Floral, Fruity, Woody, Spicy, Sweet (Scale: 0.0 to 10.0+).
      
      Guidelines for Micro-Sensitivity:
      1. Numerical Precision: Treat even a 0.1 difference between axes as a significant nuance.
      2. Tiered Interpretation:
         - 0.0 - 2.0: Minimal/Subtle (a ghostly hint)
         - 2.1 - 4.0: Light/Moderate (noticeable but polite)
         - 4.1 - 6.0: Sturdy/Dominant (the heart of the palate)
         - 6.1 - 8.0: High/Intense (the defining character)
         - 8.1 - 10.0+: Extreme/Absolute (an obsession)
      3. Threshold Effects: Emphasize shifts when an axis crosses into a new tier.
      4. Relational Dynamics: Compare axes (e.g. if Fruity 7.0 and Wood 8.0, explain how woody essence slightly overpowers fruit).
      
      Create a simple but whitty and highly specific "Taste Persona" in KOREAN.
      - The "title" should be very short and punchy (under 10 chars).
      - The "description" should be approximately 120 characters long (very concise).
      Output valid JSON: { "title": "...", "description": "...", "characteristics": ["..."], "recommendationFocus": ["..."] }
    `;

    const result = await model.generateContent(prompt);
    if (result && result.response) {
      const text = result.response.text();
      console.log('[generatePersona] Raw AI response:', text);
      const jsonStr = text.match(/\{[\s\S]*\}/)?.[0] || '{}';
      const aiPersona = JSON.parse(jsonStr);
      if (aiPersona && aiPersona.title) {
        console.log('[generatePersona] Parsed Persona:', aiPersona.title);
        return aiPersona;
      }
    }
  } catch (error) {
    console.error('[Helper: generatePersona Error]:', error.message, error.stack);
  }
  return null;
};


/**
 * Cosine Similarity calculation for flavor profile matching
 */
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
  const distilleriesMap = {};

  if (db) {
    try {
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
        locationsMap[doc.id] = {
          path: buildHierarchy(doc.id, locsDocData),
          description: locsDocData[doc.id]?.description || ''
        };
      });

      const distsSnapshot = await db.collection('distilleries').get();
      distsSnapshot.forEach(doc => {
        const data = doc.data();
        distilleriesMap[doc.id] = {
          name: data.name || '',
          description: data.description || ''
        };
      });
    } catch (err) {
      console.error('[ERROR] Failed to fetch enrichment maps:', err);
    }
  }

  return { categoriesMap, locationsMap, distilleriesMap };
};

const enrichSpirit = (s, categoriesMap, locationsMap, distilleriesMap) => {
  const locInfo = s.locationId ? locationsMap[s.locationId] : null;
  const distInfo = s.distilleryId ? distilleriesMap[s.distilleryId] : null;

  return {
    ...s,
    category: (s.categoryId && categoriesMap[s.categoryId]) || s.category || '위스키 > 스카치 > 싱글몰트',
    origin: locInfo?.path || s.origin || '스코틀랜드 > 스페이사이드',
    originDescription: locInfo?.description || s.originDescription || '',
    distillery: distInfo?.name || s.distillery || 'Unknown Distillery',
    distilleryName: distInfo?.name || s.distillery || 'Unknown Distillery',
    distilleryDescription: distInfo?.description || s.distilleryDescription || '',
    productionTitle: s.info?.title || '',
    productionDescription: s.info?.description || ''
  };
};

// --- API Routes ---

const router = express.Router();

// [TEMP] Migration Endpoint
router.get('/admin/migrate-spirits', async (req, res) => {
  try {
    const spiritMigrationData = {
      '4SfepyxW7Ye1Q46FFLw2': { distilleryId: 'springbank-distillery', info: { title: 'Slow Matured', description: '전통적인 캄벨타운 방식으로 숙성되어 46% ABV의 풍부한 힘을 고스란히 간직하고 있습니다.' } },
      '54nXY3Lgkfab2R80zdxS': { distilleryId: 'macallan-distillery', info: { title: 'Sherry Oak Cask', description: '최고급 쉐리 오크통에서 숙성되어 깊고 풍부한 풍미를 자랑합니다.' } },
      'M8k94sltZgy1Hz9nNliw': { distilleryId: 'ardbeg-distillery', info: { title: 'Ultimate Islay Malt', description: '강렬한 피트 향과 섬세한 단맛이 완벽한 균형을 이루는 아일라의 대표 주자입니다.' } },
      '7Rt8a8KXxyZQBOEbcHBL': { distilleryId: 'suntory', info: { title: 'Japanese Harmony', description: '일본의 사계를 담은 24절기를 상징하는 병 디자인과 정교한 블렌딩이 특징입니다.' } },
      'VNsUCMo9JjHxufGRCNlC': { distilleryId: 'aberlour-distillery', info: { title: 'Double Cask Matured', description: '쉐리 캐스크와 버번 캐스크에서 각각 숙성된 원액을 합쳐 과일 향과 스파이시함이 조화롭습니다.' } },
      'VY07i1pXQFkGjrJJARvP': { distilleryId: 'glenfiddich-distillery', info: { title: 'Pioneering Spirit', description: '세계에서 가장 많이 팔리는 싱글 몰트로, 신선한 배의 향과 부드러운 목넘김이 일품입니다.' } },
      'cE27L2aZaBjZR2GMXzPC': { distilleryId: 'lagavulin-distillery', info: { title: 'King of Islay', description: '긴 숙성 시간만큼이나 깊고 묵직한 탄 향과 드라이한 풍미를 지니고 있습니다.' } },
      '8hw5ee2dQstVuu8J2leP': { distilleryId: 'william-grant-sons', info: { title: 'DoubleWood 12', description: '전통적인 오크통에서 쉐리 오크통으로 옮겨 숙성하는 \'피니시\' 기법의 선구자입니다.' } },
      'B0uxTSDBTjjij2swmHUH': { distilleryId: 'suntory-yamazaki-distillery', info: { title: 'Deep & Multi-layered', description: '미즈나라 오크통 숙성 특유의 향기로운 나무 향과 과일의 단맛이 층층이 쌓여있습니다.' } },
      'Dn9V6u75icRxwdIiE0ZP': { distilleryId: 'ballantines', info: { title: 'The Original', description: '40여 가지 이상의 엄선된 몰트와 그레인 위스키를 블렌딩하여 우아하고 균형 잡힌 맛을 냅니다.' } },
      'GtcfupHukVQMDG4fe1Gx': { distilleryId: 'william-grant-sons', info: { title: 'Curiously Small Batch', description: '장미 꽃잎과 오이 추출물을 더해 기존 진에서는 찾아볼 수 없는 독특하고 상쾌한 향이 느껴집니다.' } },
      '5u8YlHFDKIyUfwVz4PvH': { distilleryId: 'opus-one-winery', info: { title: 'Napa Valley Red Wine', description: '로버트 먼다비와 바론 필립 드 로칠드가 합작하여 만든 전설적인 나파 밸리 레드 와인입니다.' } },
      'XX9othMhxTceNK3uHWy3': { distilleryId: 'chateau-margaux', info: { title: 'Premier Grand Cru Classé', description: '5대 샤토 중 가장 우아하고 여성적이라고 평가받으며, 실크처럼 부드러운 타닌이 특징입니다.' } },
      'diuDpqTAgz4tTzfQSK5N': { distilleryId: 'screaming-eagle-winery', info: { title: 'Cult Wine', description: '미국 컬트 와인의 정점으로 불리며, 매년 극소량만 생산되어 전 세계 수집가들의 목표가 됩니다.' } }
    };

    const batch = db.batch();
    for (const [id, data] of Object.entries(spiritMigrationData)) {
      const ref = db.collection('spirits').doc(id);
      batch.update(ref, {
        distilleryId: data.distilleryId,
        info: data.info,
        distillery: FieldValue.delete(),
        description: FieldValue.delete()
      });
    }
    await batch.commit();
    res.json({ success: true, message: 'Spirit migration completed successfully' });
  } catch (error) {
    console.error('Migration failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET all spirits with category and location metadata
router.get('/spirits', async (req, res) => {
  try {
    const { categoriesMap, locationsMap, distilleriesMap } = await getEnrichmentMaps(db);
    const allSpiritsSnapshot = await db.collection('spirits').get();

    const spirits = allSpiritsSnapshot.docs.map(doc =>
      enrichSpirit({ id: doc.id, ...doc.data() }, categoriesMap, locationsMap, distilleriesMap)
    );
    res.json({ success: true, spirits });
  } catch (error) {
    console.error('Error fetching spirits:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /spirits/:id - Fetch a single spirit by ID with category and location metadata
router.get('/spirits/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Fetching spirit detail for ID: ${id}`);
    const spiritDoc = await db.collection('spirits').doc(id).get();

    if (!spiritDoc.exists) {
      console.warn(`Spirit not found with ID: ${id}`);
      return res.status(404).json({ success: false, error: 'Spirit not found' });
    }

    const { categoriesMap, locationsMap, distilleriesMap } = await getEnrichmentMaps(db);
    const spirit = enrichSpirit({ id: spiritDoc.id, ...spiritDoc.data() }, categoriesMap, locationsMap, distilleriesMap);

    res.json({ success: true, spirit });
  } catch (error) {
    console.error('Error fetching spirit detail:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /notes/:userId - Fetch all notes for a specific user
router.get('/notes/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { categoriesMap, locationsMap, distilleriesMap } = await getEnrichmentMaps(db);

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
        spirit: data.spirit ? enrichSpirit(data.spirit, categoriesMap, locationsMap, distilleriesMap) : null
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
    const { categoriesMap, locationsMap, distilleriesMap } = await getEnrichmentMaps(db);

    const noteDoc = await db.collection('users').doc(userId).collection('notes').doc(noteId).get();

    if (!noteDoc.exists) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    const data = noteDoc.data();
    const note = {
      id: noteDoc.id,
      ...data,
      spirit: data.spirit ? enrichSpirit(data.spirit, categoriesMap, locationsMap, distilleriesMap) : null
    };

    res.json({ success: true, note });
  } catch (error) {
    console.error('Error fetching note detail:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update Flavor DNA for a user
router.post('/flavor-dna/:userId', async (req, res) => {
  const { userId } = req.params;
  console.log(`[Functions] >>> START POST /flavor-dna/${userId}`);
  try {
    console.log(`[Functions] 1. Fetching notes subcollection for ${userId}`);
    const notesSnapshot = await db.collection('users').doc(userId).collection('notes').get();
    
    console.log(`[Functions] 2. Mapping notes data (Count: ${notesSnapshot.size})`);
    const notes = notesSnapshot.docs.map(doc => doc.data());
    
    console.log(`[Functions] 3. Calculating Flavor DNA`);
    const flavorDNA = calculateFlavorDNA(notes);
    console.log(`[Functions] 4. DNA Calculated:`, JSON.stringify(flavorDNA));

    // Flavor DNA가 업데이트될 때 페르소나도 함께 생성하여 저장
    console.log(`[Functions] 5. Calling generatePersona`);
    const persona = await generatePersona(flavorDNA);
    console.log(`[Functions] 6. Persona result:`, persona ? persona.title : 'NULL');

    const updateData = {
      flavorDNA,
      lastUpdated: FieldValue.serverTimestamp()
    };

    if (persona) {
      updateData.persona = persona;
      console.log(`[Functions] 7. Persona added to updateData`);
    }

    console.log(`[Functions] 8. Writing to Firestore user doc: ${userId}`);
    console.log(`[Functions] Data to set:`, JSON.stringify(updateData, null, 2));
    
    await db.collection('users').doc(userId).set(updateData, { merge: true });
    
    console.log(`[Functions] 9. Firestore update SUCCESS`);
    res.json({ success: true, flavorDNA, persona });

  } catch (error) {
    console.error(`[Functions] !!! ERROR in POST /flavor-dna/${userId}:`, error.message);
    console.error(error.stack);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: error.stack,
      step: "Check emulator logs for step number"
    });
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
    const { categoriesMap, locationsMap, distilleriesMap } = await getEnrichmentMaps(db);
    const spirits = spiritsSnapshot.docs.map(doc => enrichSpirit({ id: doc.id, ...doc.data() }, categoriesMap, locationsMap, distilleriesMap));

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
    try {
      const model = getGenAI().getGenerativeModel({ model: "gemini-2.0-flash" });
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

// POST /recommendations/:userId - Generate personalized recommendations
router.post('/recommendations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    let recs = [];

    let userDNA = null;
    let tastedSpiritIds = new Set();

    if (userId && userId !== 'guest') {
      const userDoc = await db.collection('users').doc(userId).get();
      const userData = userDoc.data();
      if (userData && userData.flavorDNA) {
        userDNA = userData.flavorDNA;
        // Query user's subcollection for tasted spirits
        const notesSnapshot = await db.collection('users').doc(userId).collection('notes').get();
        notesSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.spirit_id) tastedSpiritIds.add(data.spirit_id);
        });
      }
    }

    const { categoriesMap, locationsMap, distilleriesMap } = await getEnrichmentMaps(db);
    const allSpiritsSnapshot = await db.collection('spirits').get();
    const candidates = [];

    allSpiritsSnapshot.forEach(doc => {
      const spiritData = enrichSpirit({ id: doc.id, ...doc.data() }, categoriesMap, locationsMap, distilleriesMap);

      if (userDNA && spiritData.flavor_axes) {
        if (!tastedSpiritIds.has(doc.id)) {
          const similarity = calculateCosineSimilarity(userDNA, spiritData.flavor_axes);
          candidates.push({ ...spiritData, similarity });
        }
      } else {
        // Random similarity for users without DNA
        candidates.push({ ...spiritData, similarity: 0.5 + Math.random() * 0.4 });
      }
    });

    candidates.sort((a, b) => b.similarity - a.similarity);
    const top4 = candidates.slice(0, 4);

    if (top4.length === 0) {
      return res.json({ success: true, recommendations: [] });
    }

    try {
      // Use the lazy-loaded genAI
      const model = getGenAI().getGenerativeModel({ model: "gemini-2.5-flash" });
      const dnaInfo = userDNA ? `User DNA: ${JSON.stringify(userDNA)}` : "Guest user (no specific DNA)";
      const candidatesText = top4.map(c => `- ${c.name} (Category: ${c.category}, Origin: ${c.origin})`).join('\n');

      const prompt = `${dnaInfo}\nCandidates:\n${candidatesText}\nProvide a unique recommendation reason for each in Korean (1-2 sentences). Return ONLY a JSON array: [{ "id": "spiritId", "reason": "..." }]`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonStr = text.match(/\[[\s\S]*\]/)?.[0] || '[]';
      const aiRecs = JSON.parse(jsonStr);

      recs = top4.map(spirit => {
        const aiRec = aiRecs.find(r => r.id === spirit.id);
        return {
          ...spirit,
          reason: aiRec?.reason || `${spirit.category} 카테고리에서 추천하는 주류입니다.`,
          matchRate: Math.round(spirit.similarity * 100)
        };
      });
    } catch (aiError) {
      console.error("AI Recommendation error:", aiError);
      recs = top4.map(c => ({
        ...c,
        reason: `${c.category || '취향'} 카테고리에서 추천하는 주류입니다.`,
        matchRate: Math.round(c.similarity * 100)
      }));
    }

    res.json({ success: true, recommendations: recs });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/persona/:userId - Retrieve cached taste persona
router.get('/persona/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return res.json({ success: true, persona: null });
    }

    const userData = userDoc.data();
    // 저장된 페르소나 데이터가 있으면 반환, 없으면 null 반환 (AI 호출하지 않음)
    const persona = userData.persona || null;

    res.json({ success: true, persona });
  } catch (error) {
    console.error('Error retrieving persona:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/persona/:userId - Legacy support for persona generation (now just redirects to GET logic or handles as needed)
router.post('/persona/:userId', async (req, res) => {
  // 동일한 로직 수행 (프론트엔드 호환성 유지)
  try {
    const { userId } = req.params;
    const userDoc = await db.collection('users').doc(userId).get();
    const persona = userDoc.exists ? (userDoc.data().persona || null) : null;
    res.json({ success: true, persona });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// Support both production (with /api prefix from Hosting) and local (without /api prefix from Emulator)
app.use('/api', router);
app.use('/', router);

// Export the function
exports.api = onRequest({
  secrets: ["GEMINI_API_KEY"], // Use secrets for Gemini API key
  cors: true,
  region: "asia-northeast3",
  invoker: "public"
}, app);
