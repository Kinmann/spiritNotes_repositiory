const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccount = JSON.parse(fs.readFileSync(path.join(__dirname, 'service-account.json'), 'utf8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function listAllData() {
  try {
    console.log('--- Root Collections ---');
    const collections = await db.listCollections();
    for (const coll of collections) {
      const snapshot = await coll.limit(5).get();
      console.log(`Collection: ${coll.id} (approx size: ${snapshot.size}+)`);
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`  - Doc ID: ${doc.id} (Email: ${data.email || 'N/A'})`);
        if (coll.id === 'users') {
          // ...
        }
      });
    }

    console.log('\n--- Checking for test user notes ---');
    const targetUid = 'uVLU2cAx5j75vRHT491p';
    const subColSnapshot = await db.collection('users').doc(targetUid).collection('notes').get();
    console.log(`Subcollection users/${targetUid}/notes size: ${subColSnapshot.size}`);

    const rootNotesSnapshot = await db.collection('notes').where('uid', '==', targetUid).get();
    console.log(`Root collection notes (where uid==${targetUid}) size: ${rootNotesSnapshot.size}`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

listAllData();
