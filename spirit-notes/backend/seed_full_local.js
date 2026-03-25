const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Target the local emulator
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

admin.initializeApp({
  projectId: 'antigravity-dd7c2' // Use the project ID from your config
});

const db = admin.firestore();
const auth = admin.auth();
const uid = 'Y6yrkpoSFBPbyWR9GIeCxElAKQk2'; // Standard test UID used in existing scripts
const email = 'test@example.com';

async function seedAuth() {
  console.log('Checking/Creating test user in Auth...');
  try {
    await auth.getUser(uid);
    console.log('Test user already exists in Auth.');
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      await auth.createUser({
        uid: uid,
        email: email,
        password: 'password123',
        displayName: 'Test User'
      });
      console.log('Test user created in Auth.');
    } else {
      throw error;
    }
  }
}

async function seed() {
  console.log('--- Starting Comprehensive Local Seeding ---');

  try {
    // 0. Seed Auth
    await seedAuth();

    // 1. Seed Categories (Hierarchy)
    console.log('Seeding categories...');
    const categories = {
      'root_whiskey': { name: '위스키', parentId: null },
      'S9p3SaMqyZfPrInRWRj8': { name: '싱글몰트', parentId: 'scotch_whiskey' },
      'scotch_whiskey': { name: '스카치', parentId: 'root_whiskey' },
      'uOBhkB4r6dHqX1i4lmXJ': { name: '진', parentId: null },
      'nTEbJVyppPvAjtb8DlA3': { name: '재패니즈', parentId: 'blended_whiskey' },
      'blended_whiskey': { name: '블렌디드', parentId: 'root_whiskey' }
    };

    for (const [id, data] of Object.entries(categories)) {
      await db.collection('categories').doc(id).set(data);
    }

    // 2. Seed Locations (Hierarchy)
    console.log('Seeding locations...');
    const locations = {
      'root_scotland': { name: '스코틀랜드', parentId: null },
      'Vr1tGCQAZQT60ENKEq7m': { name: '스코틀랜드', parentId: null }, // Used in seed_db.js
      'yaxx5i6wO76rwToFVBXK': { name: '스페이사이드', parentId: 'Vr1tGCQAZQT60ENKEq7m' },
      'ahYt8XWOiAEDDmo0BhiU': { name: '야마나시', parentId: 'root_japan' },
      'root_japan': { name: '일본', parentId: null }
    };

    for (const [id, data] of Object.entries(locations)) {
      await db.collection('locations').doc(id).set(data);
    }

    // 3. Seed Spirits
    console.log('Seeding spirits...');
    const spirits = [
      {
        id: 'macallan_12_sherry',
        name: "Macallan 12Y Sherry Oak",
        categoryId: "S9p3SaMqyZfPrInRWRj8",
        locationId: "yaxx5i6wO76rwToFVBXK",
        abv: 40,
        volume: 700,
        distillery: "The Macallan Distillery",
        description: "쉐리 오크통에서 숙성된 깊고 풍부한 과일 향과 스파이스가 일품인 싱글 몰트 위스키.",
        image: "https://images.unsplash.com/photo-1599490659223-930b447ffad6?w=600&auto=format&fit=crop",
        flavor_axes: { peat: 2, floral: 4, fruity: 9, woody: 7, spicy: 8, sweet: 8 }
      },
      {
        id: 'laphroaig_10',
        name: "Laphroaig 10Y",
        categoryId: "S9p3SaMqyZfPrInRWRj8",
        locationId: "Vr1tGCQAZQT60ENKEq7m",
        abv: 40,
        volume: 700,
        distillery: "Laphroaig Distillery",
        description: "아일라 섬의 상징적인 피트 감을 선사하는 위스키. 강렬한 연기 향.",
        image: "https://images.unsplash.com/photo-1527281405159-45ebe562c5af?w=600&auto=format&fit=crop",
        flavor_axes: { peat: 9.5, floral: 2, fruity: 3, woody: 6, spicy: 5, sweet: 3 }
      },
      {
        id: 'hibiki_harmony',
        name: "Hibiki Japanese Harmony",
        categoryId: "nTEbJVyppPvAjtb8DlA3",
        locationId: "ahYt8XWOiAEDDmo0BhiU",
        abv: 43,
        volume: 700,
        distillery: "Suntory",
        description: "정교하고 세련된 꽃 향과 꿀의 달콤함.",
        image: "https://images.unsplash.com/photo-1614313511387-1436a7484ff3?w=600&auto=format&fit=crop",
        flavor_axes: { peat: 2, floral: 8, fruity: 7, woody: 7, spicy: 6, sweet: 7 }
      }
    ];

    for (const spirit of spirits) {
      const { id, ...data } = spirit;
      await db.collection('spirits').doc(id).set(data);
    }

    // 4. Seed Notes
    console.log('Seeding tasting notes...');
    const notes = [
      {
        spirit_id: "macallan_12_sherry",
        spiritName: "Macallan 12Y Sherry Oak",
        totalRating: 4.5,
        note: "로컬 테스트용 메모: 쉐리향이 아주 좋습니다.",
        flavor_axes: { peat: 2, floral: 4, fruity: 9, woody: 7, spicy: 8, sweet: 8 },
        createdAt: admin.firestore.Timestamp.now(),
        uid: uid
      },
      {
        spirit_id: "laphroaig_10",
        spiritName: "Laphroaig 10Y",
        totalRating: 5.0,
        note: "피트향이 강력합니다!",
        flavor_axes: { peat: 10, floral: 2, fruity: 2, woody: 5, spicy: 4, sweet: 2 },
        createdAt: admin.firestore.Timestamp.now(),
        uid: uid
      }
    ];

    for (const note of notes) {
      await db.collection('users').doc(uid).collection('notes').add(note);
    }

    console.log('--- Seeding Completed Successfully! ---');
    console.log(`Test Email: ${email}`);
    console.log(`Test Password: password123`);
    console.log(`Test UID: ${uid}`);
    console.log('Check Emulator UI at: http://localhost:4000');

  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    process.exit();
  }
}

seed();
