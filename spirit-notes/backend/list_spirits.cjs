const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccount = JSON.parse(fs.readFileSync(path.join(__dirname, 'service-account.json'), 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function listAllSpirits() {
  const snapshot = await db.collection('spirits').get();
  console.log(`Total spirits: ${snapshot.size}\n`);
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    console.log(`ID: ${doc.id} | Name: ${data.name}`);
  });
  process.exit(0);
}

listAllSpirits().catch(err => { console.error(err); process.exit(1); });
