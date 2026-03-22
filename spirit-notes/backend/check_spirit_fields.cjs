const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccount = JSON.parse(fs.readFileSync(path.join(__dirname, 'service-account.json'), 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function checkFields() {
  const snapshot = await db.collection('spirits').limit(5).get();
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    console.log(`\n--- Spirit: ${data.name} (${doc.id}) ---`);
    console.log('Fields:', JSON.stringify(Object.keys(data), null, 2));
    console.log('distillery:', data.distillery);
    console.log('brand:', data.brand);
  });
  process.exit(0);
}

checkFields().catch(err => { console.error(err); process.exit(1); });
