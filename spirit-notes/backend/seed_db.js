const admin = require('firebase-admin');
const path = require('path');
const axios = require('axios');

// Using the service account from the local directory
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const uid = 'Y6yrkpoSFBPbyWR9GIeCxElAKQk2';

const spiritsToSeed = [
  {
    name: "Laphroaig 10Y",
    category: "Single Malt Scotch",
    categoryId: "S9p3SaMqyZfPrInRWRj8", // Using Single Malt category from Macallan
    locationId: "Vr1tGCQAZQT60ENKEq7m", // Scotland
    abv: 40,
    volume: 700,
    description: "아일라 섬의 상징적인 피트 감을 선사하는 위스키. 강렬한 연기 향과 해초, 약품 같은 독특한 풍미가 특징.",
    image: "https://images.unsplash.com/photo-1527281405159-45ebe562c5af?w=600&auto=format&fit=crop",
    flavor_axes: { peat: 9, floral: 1, fruity: 2, woody: 4, spicy: 3, sweet: 2 },
    aroma: 9, taste: 8, finish: 9, body: 8, sweetness: 2
  },
  {
    name: "Hendrick's Gin",
    category: "Gin",
    categoryId: "uOBhkB4r6dHqX1i4lmXJ", // Placeholder category
    locationId: "Vr1tGCQAZQT60ENKEq7m", // Scotland
    abv: 44,
    volume: 700,
    description: "장미 꽃잎과 오이 에센스를 첨가하여 독특하고 상쾌한 풍미를 자랑하는 프리미엄 진.",
    image: "https://images.unsplash.com/photo-1514361892635-6b07e31e75f9?w=600&auto=format&fit=crop",
    flavor_axes: { peat: 0, floral: 9, fruity: 4, woody: 1, spicy: 3, sweet: 3 },
    aroma: 9, taste: 7, finish: 7, body: 5, sweetness: 4
  },
  {
    name: "Lagavulin 16Y",
    category: "Single Malt Scotch",
    categoryId: "S9p3SaMqyZfPrInRWRj8",
    locationId: "Vr1tGCQAZQT60ENKEq7m",
    abv: 43,
    volume: 700,
    description: "깊고 풍부한 피트 향과 부드러운 쉐리 단맛의 완벽한 조화. '아일라의 왕'이라 불리는 위스키.",
    image: "https://images.unsplash.com/photo-1599490659223-930b447ffad6?w=600&auto=format&fit=crop",
    flavor_axes: { peat: 8, floral: 1, fruity: 3, woody: 5, spicy: 3, sweet: 4 },
    aroma: 10, taste: 9, finish: 10, body: 9, sweetness: 4
  }
];

const tastingNotesToSeed = [
  {
    spirit_id: "54nXY3Lgkfab2R80zdxS", // Macallan 12Y
    spiritName: "Macallan 12Y Sherry Oak",
    totalRating: 4.5,
    note: "쉐리 캐스크의 달콤함과 말린 과일 향이 아주 좋습니다. 입안에서 느껴지는 질감이 부드러워요.",
    flavor_axes: { peat: 1, floral: 2, fruity: 8, woody: 6, spicy: 4, sweet: 8 },
    createdAt: admin.firestore.Timestamp.now(),
    uid: uid
  },
  {
    spirit_id: "8hw5ee2dQstVuu8J2leP", // Balvenie 12Y
    spiritName: "Balvenie 12Y DoubleWood",
    totalRating: 4.0,
    note: "꿀과 바닐라의 부드러운 단맛이 일품입니다. 초보자에게도 추천할 만한 위스키.",
    flavor_axes: { peat: 1, floral: 3, fruity: 6, woody: 5, spicy: 3, sweet: 7 },
    createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 86400000)), // 1 day ago
    uid: uid
  },
  {
    spirit_id: "SEED_LAPHROAIG_ID", // Will be replaced
    spiritName: "Laphroaig 10Y",
    totalRating: 5.0,
    note: "강렬한 피트 향이 호불호가 갈리겠지만, 저에게는 최고의 위스키입니다. 소독약 같은 향 뒤에 오는 단맛이 매력적이에요.",
    flavor_axes: { peat: 10, floral: 1, fruity: 2, woody: 4, spicy: 3, sweet: 4 },
    createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 172800000)), // 2 days ago
    uid: uid
  }
];

async function seed() {
  console.log('Starting seed process...');

  try {
    // 1. Add Spirits
    const spiritIds = [];
    for (const spirit of spiritsToSeed) {
      const docRef = await db.collection('spirits').add(spirit);
      console.log(`Added spirit: ${spirit.name} (ID: ${docRef.id})`);
      spiritIds.push(docRef.id);
    }

    // Update Laphroaig ID in notes
    tastingNotesToSeed[2].spirit_id = spiritIds[0];

    // 2. Add Tasting Notes to the user's subcollection
    const userNotesRef = db.collection('users').doc(uid).collection('notes');
    for (const note of tastingNotesToSeed) {
      await userNotesRef.add(note);
      // Also add to global notes collection if needed by the app
      await db.collection('notes').add(note);
      console.log(`Added note for ${note.spiritName}`);
    }

    console.log('Database seeding completed successfully!');
    
    // 3. Trigger Flavor DNA calculation (via local API if server is running, or we can just finish here)
    console.log('Remember to call /api/flavor-dna/' + uid + ' to update the profile.');

  } catch (error) {
    console.error('Error during seeding:', error);
  } finally {
    process.exit();
  }
}

seed();
