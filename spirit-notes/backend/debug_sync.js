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

async function debugSync() {
  console.log('--- DEBUG SYNC: DISTILLERIES ---');
  
  try {
    const colRef = prodDb.collection('distilleries');
    console.log('Fetching distilleries from production...');
    const snapshot = await colRef.get();
    
    console.log(`Snapshot size: ${snapshot.size}`);
    console.log(`Snapshot empty: ${snapshot.empty}`);
    
    if (snapshot.empty) {
      console.log('Collection reported as empty.');
      // Try listing documents using another method if possible? 
      // No, this should work.
    } else {
      const batch = localDb.batch();
      snapshot.forEach(doc => {
        console.log(`- Found: ${doc.id}`);
        batch.set(localDb.collection('distilleries').doc(doc.id), doc.data());
      });
      await batch.commit();
      console.log('Batch committed to local emulator.');
    }
  } catch (err) {
    console.error('Error during debug sync:', err);
  } finally {
    process.exit(0);
  }
}

debugSync();
