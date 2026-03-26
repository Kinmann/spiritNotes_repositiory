const admin = require('firebase-admin');

// 1. Initialize Production App
const serviceAccount = require('./service-account.json');
const prodApp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'antigravity-dd7c2'
}, 'production');

// 2. Initialize Emulator App
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
const localApp = admin.initializeApp({
  projectId: 'antigravity-dd7c2'
}, 'local');

const prodDb = prodApp.firestore();
const localDb = localApp.firestore();

async function syncCollection(name) {
  console.log(`\nSyncing collection: ${name}`);
  try {
    const colRef = prodDb.collection(name);
    let snapshot = await colRef.get();
    
    if (snapshot.empty) {
      console.log(`- ${name} was empty via get(). Trying listDocuments()...`);
      const docRefs = await colRef.listDocuments();
      console.log(`- listDocuments() found ${docRefs.length} documents.`);
      
      let count = 0;
      for (const docRef of docRefs) {
        const doc = await docRef.get();
        await localDb.collection(name).doc(doc.id).set(doc.data());
        count++;
        if (count % 10 === 0) console.log(`  ... synced ${count}`);
      }
      console.log(`- Successfully synced ${count} documents via listDocuments().`);
    } else {
      console.log(`- Found ${snapshot.size} documents via get().`);
      const batch = localDb.batch();
      snapshot.forEach(doc => {
        batch.set(localDb.collection(name).doc(doc.id), doc.data());
      });
      await batch.commit();
      console.log(`- Successfully synced ${snapshot.size} documents via batch commit.`);
    }
  } catch (err) {
    console.error(`Error syncing ${name}:`, err.message);
  }
}

async function run() {
  console.log('--- ENHANCED FIREBASE DATA SYNC ---');
  
  await syncCollection('categories');
  await syncCollection('locations');
  await syncCollection('distilleries');
  await syncCollection('spirits');
  
  console.log('\n--- Sync Finished ---');
  process.exit(0);
}

run().catch(err => {
  console.error('\nFatal error during sync:', err);
  process.exit(1);
});
