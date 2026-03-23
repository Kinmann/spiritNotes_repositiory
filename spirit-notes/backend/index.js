/* eslint-env node */
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
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

// Gemini AI 초기화
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

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

  validNotes.forEach(note => {
    // 1. Time-Decay Weighting
    const noteTime = note.createdAt?.toMillis ? note.createdAt.toMillis() : (new Date(note.createdAt).getTime() || now);
    const daysSince = Math.max(0, (now - noteTime) / (1000 * 60 * 60 * 24));
    const timeWeight = Math.exp(-lambda * daysSince);

    // 2. Rating Weighting & Combine
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
      // 3. Normalize and round to 1 decimal place
      dna[key] = Math.round((dna[key] / totalWeight) * 10) / 10;
    });
  }

  return dna;
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
  const categoriesMap = {};
  const locationsMap = {};
  
  if (db) {
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
  }
  
  return { categoriesMap, locationsMap };
};

const enrichSpirit = (s, categoriesMap, locationsMap) => ({
  ...s,
  category: (s.categoryId && categoriesMap[s.categoryId]) || s.category || '위스키 > 스카치 > 싱글몰트',
  origin: (s.locationId && locationsMap[s.locationId]) || s.origin || '스코틀랜드 > 스페이사이드'
});

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

    const { categoriesMap, locationsMap } = await getEnrichmentMaps(db);
    const allSpiritsSnapshot = await db.collection('spirits').get();
    
    const spirits = allSpiritsSnapshot.docs.map(doc => 
      enrichSpirit({ id: doc.id, ...doc.data() }, categoriesMap, locationsMap)
    );

    res.json({ success: true, spirits });
  } catch (error) {
    console.error('Error fetching spirits:', error);
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
    
    // Create/Update user document
    await db.collection('users').doc(userId).set({ 
      flavorDNA, 
      lastUpdated: admin.firestore.FieldValue.serverTimestamp() 
    }, { merge: true });

    res.json({ success: true, flavorDNA });
  } catch (error) {
    console.error('Error calculating Flavor DNA:', error);
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

    const { categoriesMap, locationsMap } = await getEnrichmentMaps(db);
    let recs = [];

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
    if (top3.length === 0) return res.json({ success: true, recommendations: [] });

    if (!genAI) {
      console.warn('Gemini AI not initialized. Falling back to simple matching.');
      recs = top3.map(c => ({
        id: c.id,
        name: c.name,
        reason: `${c.category || '취향'} 카테고리에서 당신의 취향과 ${(c.similarity * 100).toFixed(0)}% 일치하는 가장 가까운 맛의 술입니다.`
      }));
    } else {
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const dnaInfo = userDNA ? `User DNA: ${JSON.stringify(userDNA)}` : "Guest user (no specific DNA)";
      const candidatesText = top3.map(c => `- ${c.name} (Category: ${c.category}, Origin: ${c.origin})`).join('\n');
      const prompt = `${dnaInfo}\nCandidates:\n${candidatesText}\nProvide a unique recommendation reason for each in 1-2 sentences. Output valid JSON array: [{ "id": "spiritId", "name": "Name", "reason": "Reason" }]`;

      try {
        const result = await model.generateContent(prompt).catch(e => { throw e; });
        if (result && result.response) {
          const text = result.response.text();
          const jsonStr = text.match(/\[[\s\S]*\]/)?.[0] || '[]';
          recs = JSON.parse(jsonStr);
        } else {
          throw new Error('No response from AI');
        }
      } catch (aiError) {
        console.error('Inner AI catch:', aiError.message);
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
app.post('/api/persona/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!db) {
      console.warn('Database not initialized for persona. Returning default persona.');
      return res.json({ 
        success: true, 
        persona: {
          title: "섬세한 미식가",
          description: "다양한 맛의 균형을 중요하게 생각하며, 특히 복합적인 풍미를 즐기는 취향입니다.",
          characteristics: ["균형 잡힌 선호도", "새로운 도전에 개방적"],
          recommendationFocus: ["복합미", "질감", "피니시"]
        }
      });
    }

    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    if (!userData || !userData.flavorDNA) {
      console.warn('User flavor DNA not found for persona. Returning default.');
      return res.json({ 
        success: true, 
        persona: {
          title: "섬세한 미식가",
          description: "다양한 맛의 균형을 중요하게 생각하며, 특히 복합적인 풍미를 즐기는 취향입니다.",
          characteristics: ["균형 잡힌 선호도", "새로운 도전에 개방적"],
          recommendationFocus: ["복합미", "질감", "피니시"]
        }
      });
    }

    if (!genAI) {
      console.warn('Gemini AI not initialized for persona. Using default persona.');
      persona = {
        title: "섬세한 미식가",
        description: "다양한 맛의 균형을 중요하게 생각하며, 특히 복합적인 풍미를 즐기는 취향입니다.",
        characteristics: ["균형 잡힌 선호도", "새로운 도전에 개방적"],
        recommendationFocus: ["복합미", "질감", "피니시"]
      };
    } else {
      const { flavorDNA } = userData;
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const prompt = `Analyze this Whiskey Flavor DNA: ${JSON.stringify(flavorDNA)}. Create a poetic Taste Persona. Output valid JSON: { "title": "...", "description": "...", "characteristics": ["..."], "recommendationFocus": ["..."] }`;

      try {
        const result = await model.generateContent(prompt).catch(e => { throw e; });
        if (result && result.response) {
          const text = result.response.text();
          const jsonStr = text.match(/\{[\s\S]*\}/)?.[0] || '{}';
          persona = JSON.parse(jsonStr);
        } else {
          throw new Error('No response from AI');
        }
      } catch (aiError) {
        console.error('Inner AI catch (persona):', aiError.message);
        persona = {
          title: "섬세한 미식가",
          description: "다양한 맛의 균형을 중요하게 생각하며, 특히 복합적인 풍미를 즐기는 취향입니다.",
          characteristics: ["균형 잡힌 선호도", "새로운 도전에 개방적"],
          recommendationFocus: ["복합미", "질감", "피니시"]
        };
      }
    }

    res.json({ success: true, persona });
  } catch (error) {
    console.error('Error generating persona:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
