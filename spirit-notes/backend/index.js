/* eslint-env node */
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Firebase Admin 초기화 (환경 변수 또는 로컬 파일)
const serviceAccountPath = path.join(__dirname, 'service-account.json');
if (fs.existsSync(serviceAccountPath)) {
  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath))
  });
  console.log('Firebase Admin initialized using local service-account.json');
} else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    // Replace literal \n with actual newlines in private key
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin initialized using environment variable');
  } catch (err) {
    console.error('Failed to initialize Firebase Admin from env:', err);
  }
} else {
  console.warn('FIREBASE_SERVICE_ACCOUNT environment variable is missing and no local service-account.json found.');
}

const db = admin.apps.length > 0 ? admin.firestore() : null;

// Gemini AI 초기화 로직 (Lazy initialization with diagnostics)
let _genAIInstance = null;
const getGenAI = () => {
  if (!_genAIInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[getGenAI Error] GEMINI_API_KEY is missing in backend process.env');
      return null;
    }
    // 보안을 위해 키의 일부만 노출
    const maskedKey = `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`;
    console.log(`[getGenAI] API Key loaded successfully. Key: ${maskedKey}`);
    _genAIInstance = new GoogleGenerativeAI(apiKey);
  }
  return _genAIInstance;
};

app.use(cors());
app.use(express.json());

// --- Core Logic ---

/**
 * Flavor DNA 계산 로직 (Core Domain Rules 적용)
 * @param {Array} notes - 사용자의 최근 테이스팅 노트 배열 (최대 20개)
 * @returns {Object} - 계산된 Flavor DNA (Peat, Floral, Fruity, Woody, Spicy, Sweet)
 */
const calculateFlavorDNA = (notes) => {
  let dna = { peat: 0, floral: 0, fruity: 0, woody: 0, spicy: 0, sweet: 0 };

  // Rating 0 인 항목 제외
  const validNotes = notes.filter(n => (n.totalRating || n.rating) > 0);
  if (!validNotes || validNotes.length === 0) return dna;

  let totalWeight = 0;
  const lambda = 0.05; // 0.05 per day
  const now = Date.now();

  console.log(`[calculateFlavorDNA] Calculating for ${validNotes.length} notes`);
  validNotes.forEach((note, index) => {
    let noteTime;
    try {
      if (note.createdAt?.toMillis) {
        noteTime = note.createdAt.toMillis();
      } else if (note.createdAt) {
        noteTime = new Date(note.createdAt).getTime();
      } else {
        noteTime = now;
      }
    } catch (e) {
      console.warn(`[calculateFlavorDNA] Date parsing failed for note ${index}:`, e.message);
      noteTime = now;
    }
    
    if (isNaN(noteTime)) noteTime = now;

    const daysSince = Math.max(0, (now - noteTime) / (1000 * 60 * 60 * 24));
    const timeWeight = Math.exp(-lambda * daysSince);
    const ratingWeight = (note.totalRating || note.rating || 0) / 5.0;
    const finalWeight = timeWeight * ratingWeight;

    if (!isNaN(finalWeight)) {
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
  console.log('[calculateFlavorDNA] Result:', dna);

  return dna;
};

/**
 * AI를 사용하여 취향 페르소나를 생성하는 헬퍼 함수
 */
const generatePersona = async (flavorDNA) => {
  try {
    const genAI = getGenAI();
    if (!flavorDNA || !genAI) {
      console.warn('[generatePersona] Skipping: flavorDNA or genAI is missing');
      return null;
    }

    const modelName = "gemini-2.5-flash";
    console.log(`[generatePersona] Calling Gemini with model: ${modelName}`);
    const model = genAI.getGenerativeModel({ model: modelName });
    // ... (rest of prompt and generation logic)
    const prompt = `
      Analyze this Whiskey Flavor DNA with extreme precision: ${JSON.stringify(flavorDNA)}.
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
    if (!result || !result.response) {
      console.error('[generatePersona Error] Empty response from Gemini API');
      return null;
    }

    const text = result.response.text();
    console.log('[generatePersona] Raw AI response:', text);
    
    const jsonStr = text.match(/\{[\s\S]*\}/)?.[0];
    if (!jsonStr) {
      console.error('[generatePersona Error] No JSON block found in response');
      return null;
    }

    const aiPersona = JSON.parse(jsonStr);
    if (aiPersona && aiPersona.title) {
      console.log('[generatePersona] Success:', aiPersona.title);
      return aiPersona;
    } else {
      console.error('[generatePersona Error] Parsed JSON missing title');
    }
  } catch (error) {
    console.error('[generatePersona Exception]:', error.message);
  }
  return null;
};


/**
 * Cosine Similarity 계산
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
  console.log('[DEBUG] Starting getEnrichmentMaps');
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
      console.log(`[DEBUG] Categories loaded: ${Object.keys(categoriesMap).length}`);

      const locsSnapshot = await db.collection('locations').get();
      const locsDocData = {};
      locsSnapshot.forEach(doc => locsDocData[doc.id] = doc.data());
      locsSnapshot.forEach(doc => {
        locationsMap[doc.id] = {
          path: buildHierarchy(doc.id, locsDocData),
          description: locsDocData[doc.id]?.description || ''
        };
      });
      console.log(`[DEBUG] Locations loaded: ${Object.keys(locationsMap).length}`);

      const distsSnapshot = await db.collection('distilleries').get();
      distsSnapshot.forEach(doc => {
        const data = doc.data();
        distilleriesMap[doc.id] = {
          name: data.name || '',
          description: data.description || ''
        };
      });
      console.log(`[DEBUG] Distilleries loaded: ${Object.keys(distilleriesMap).length}`);
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

// --- Endpoints ---

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Spirit Notes Backend is running' });
});

/**
 * 모든 주류 목록 조회 API (Enriched)
 */
app.get('/api/spirits', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not initialized' });

    const { categoriesMap, locationsMap, distilleriesMap } = await getEnrichmentMaps(db);
    const allSpiritsSnapshot = await db.collection('spirits').get();

    const spirits = allSpiritsSnapshot.docs.map(doc =>
      enrichSpirit({ id: doc.id, ...doc.data() }, categoriesMap, locationsMap, distilleriesMap)
    );

    res.json({ success: true, spirits });
  } catch (error) {
    console.error('[ERROR] GET /api/spirits failed:', error);
    res.status(500).json({ error: 'Failed to fetch spirits', details: error.message });
  }
});

/**
 * 개별 주류 상세 조회 API (Enriched)
 */
app.get('/api/spirits/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!db) return res.status(500).json({ error: 'Database not initialized' });

    const spiritDoc = await db.collection('spirits').doc(id).get();
    if (!spiritDoc.exists) {
      return res.status(404).json({ error: 'Spirit not found' });
    }

    const { categoriesMap, locationsMap, distilleriesMap } = await getEnrichmentMaps(db);
    const spirit = enrichSpirit({ id: spiritDoc.id, ...spiritDoc.data() }, categoriesMap, locationsMap, distilleriesMap);

    res.json({ success: true, spirit });
  } catch (error) {
    console.error('Error fetching spirit detail:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Flavor DNA 업데이트 API
 */
app.post('/api/flavor-dna/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!db) return res.status(500).json({ error: 'Database not initialized' });

    // Get notes from user's subcollection
    const notesSnapshot = await db.collection('users').doc(userId).collection('notes').get();

    const notes = notesSnapshot.docs.map(doc => doc.data());
    const flavorDNA = calculateFlavorDNA(notes);

    // Flavor DNA가 업데이트될 때 페르소나도 함께 생성하여 저장
    const persona = await generatePersona(flavorDNA);

    const updateData = {
      flavorDNA,
      lastUpdated: FieldValue.serverTimestamp()
    };
    if (persona) {
      updateData.persona = persona;
      console.log(`[Backend] Persona updated for user ${userId}`);
    }

    // Create/Update user document
    await db.collection('users').doc(userId).set(updateData, { merge: true });

    res.json({ success: true, flavorDNA, persona });

  } catch (error) {
    console.error(`[Backend Error in POST /api/flavor-dna/${req.params.userId}]:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

/**
 * 사용자의 모든 테이스팅 노트 조회 API (Spirit 정보 Join)
 */
app.get('/api/notes/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!db) return res.status(500).json({ error: 'Database not initialized' });

    const notesSnapshot = await db.collection('users').doc(userId).collection('notes')
      .orderBy('createdAt', 'desc')
      .get();

    if (notesSnapshot.empty) {
      return res.json({ success: true, notes: [] });
    }

    const { categoriesMap, locationsMap, distilleriesMap } = await getEnrichmentMaps(db);
    const spiritsSnapshot = await db.collection('spirits').get();
    const spiritsMap = {};
    spiritsSnapshot.forEach(doc => {
      spiritsMap[doc.id] = enrichSpirit({ id: doc.id, ...doc.data() }, categoriesMap, locationsMap, distilleriesMap);
    });
    console.log(`[DEBUG] spiritsMap size: ${Object.keys(spiritsMap).length}`);
    console.log(`[DEBUG] First 5 keys: ${Object.keys(spiritsMap).slice(0, 5).join(', ')}`);

    const notes = notesSnapshot.docs.map(doc => {
      const noteData = doc.data();
      const spiritId = noteData.spirit_id;
      const spiritInfo = spiritId ? spiritsMap[spiritId] : null;

      // Spirit 정보가 있으면 최신 정보로 덮어쓰기 (동기화)
      return {
        id: doc.id,
        ...noteData,
        // Spirit metadata fields prioritized from the spirits collection
        name: spiritInfo?.name || noteData.name,
        distillery: spiritInfo?.distillery || noteData.distillery,
        category: spiritInfo?.category || noteData.category,
        categoryHierarchy: spiritInfo?.categoryHierarchy || noteData.categoryHierarchy || [],
        locationHierarchy: spiritInfo?.locationHierarchy || noteData.locationHierarchy || [],
        abv: spiritInfo?.abv || noteData.abv,
        volume: spiritInfo?.volume || noteData.volume,
        // image는 spirit의 기본 이미지를 사용하되, 노트에 저장된 imageUrl(사용자 사진)이 있으면 그것을 우선함
        image: noteData.imageUrl || spiritInfo?.image || noteData.image || null
      };
    });

    res.json({ success: true, notes });
  } catch (error) {
    console.error('Error fetching joined notes:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 개별 테이스팅 노트 상세 조회 API (Spirit 정보 Join)
 */
app.get('/api/notes/:userId/:noteId', async (req, res) => {
  try {
    const { userId, noteId } = req.params;
    if (!db) return res.status(500).json({ error: 'Database not initialized' });

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
        const { categoriesMap, locationsMap, distilleriesMap } = await getEnrichmentMaps(db);
        spiritInfo = enrichSpirit({ id: spiritDoc.id, ...spiritDoc.data() }, categoriesMap, locationsMap, distilleriesMap);
      }
    }

    const enrichedNote = {
      id: noteDoc.id,
      ...noteData,
      name: spiritInfo?.name || noteData.name,
      distillery: spiritInfo?.distillery || noteData.distillery,
      category: spiritInfo?.category || noteData.category,
      categoryHierarchy: spiritInfo?.categoryHierarchy || noteData.categoryHierarchy || [],
      locationHierarchy: spiritInfo?.locationHierarchy || noteData.locationHierarchy || [],
      abv: spiritInfo?.abv || noteData.abv,
      volume: spiritInfo?.volume || noteData.volume,
      image: noteData.imageUrl || spiritInfo?.image || noteData.image || null
    };

    res.json({ success: true, note: enrichedNote });
  } catch (error) {
    console.error('Error fetching joined note detail:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 노트 삭제 API
 */
app.delete('/api/notes/:userId/:noteId', async (req, res) => {
  try {
    const { userId, noteId } = req.params;
    if (!db) return res.status(500).json({ error: 'Database not initialized' });

    await db.collection('users').doc(userId).collection('notes').doc(noteId).delete();
    res.json({ success: true, message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Gemini 기반 추천 생성 API
 */
app.post('/api/recommendations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!db) return res.status(500).json({ error: 'Database not initialized' });

    const { categoriesMap, locationsMap, distilleriesMap } = await getEnrichmentMaps(db);
    let recs = [];

    let userDNA = null;
    let tastedSpiritIds = new Set();
    // ... (lines 359-368 omitted for clarity, but they should be preserved)
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
        candidates.push({ ...spiritData, similarity: 0.5 + Math.random() * 0.4 });
      }
    });

    candidates.sort((a, b) => b.similarity - a.similarity);
    const top3 = candidates.slice(0, 3);
    if (top3.length === 0) return res.json({ success: true, recommendations: [] });

    const genAI = getGenAI();
    if (!genAI) {
      console.warn('Gemini AI not initialized. Falling back to simple matching.');
      recs = top3.map(c => ({
        id: c.id,
        name: c.name,
        reason: `${c.category || '취향'} 카테고리에서 당신의 취향과 ${(c.similarity * 100).toFixed(0)}% 일치하는 가장 가까운 맛의 술입니다.`
      }));
    } else {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const dnaInfo = userDNA ? `User DNA: ${JSON.stringify(userDNA)}` : "Guest user (no specific DNA)";
      const candidatesText = top3.map(c => `- ${c.name} (Category: ${c.category}, Origin: ${c.origin})`).join('\n');
      const prompt = `${dnaInfo}\nCandidates:\n${candidatesText}\nProvide a unique recommendation reason for each in 1-2 sentences. Output valid JSON array: [{ "id": "spiritId", "name": "Name", "reason": "Reason" }]`;

      try {
        console.log('[recommendations] Calling Gemini API...');
        const result = await model.generateContent(prompt);
        if (result && result.response) {
          const text = result.response.text();
          console.log('[recommendations] AI Response received');
          const jsonStr = text.match(/\[[\s\S]*\]/)?.[0] || '[]';
          recs = JSON.parse(jsonStr);
        } else {
          throw new Error('Empty response from AI');
        }
      } catch (aiError) {
        console.error('[recommendations API AI Error]:', aiError.message);
        recs = top3.map(c => ({
          id: c.id,
          name: c.name,
          reason: `${c.category || '취향'} 카테고리에서 당신의 취향과 ${(c.similarity * 100).toFixed(0)}% 일치하는 가장 가까운 맛의 술입니다.`
        }));
      }
    }

    recs = top3.map((spirit, i) => {
      const aiRec = Array.isArray(recs) ? recs.find(r => r.id === spirit.id) || recs[i] : {};
      const enriched = {
        ...spirit,
        reason: aiRec?.reason || `${spirit.category} 카테고리에서 추천하는 주류입니다.`,
        matchRate: Math.round(spirit.similarity * 100)
      };
      return enriched;
    });

    res.json({ success: true, recommendations: recs });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Gemini 기반 취향 페르소나 분석 API
 */
/**
 * 저장된 취향 페르소나 조회 API
 */
app.get('/api/persona/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!db) return res.json({ success: true, persona: null });

    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return res.json({ success: true, persona: null });

    const userData = userDoc.data();
    const persona = userData.persona || null;
    res.json({ success: true, persona });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Gemini 기반 취향 페르소나 분석 API (최적화: 저장된 데이터 우선 사용)
 */
app.post('/api/persona/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!db) return res.json({ success: true, persona: null });

    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return res.json({ success: true, persona: null });

    const userData = userDoc.data();
    const persona = userData.persona || null;

    res.json({ success: true, persona });
  } catch (error) {
    console.error('Error in persona API:', error);
    res.status(500).json({ error: error.message });
  }
});


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
