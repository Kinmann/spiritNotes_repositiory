const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, 'service-account.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('Service account file not found at:', serviceAccountPath);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkSpirits() {
  try {
    const snapshot = await db.collection('spirits').limit(5).get();
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`Spirit: ${data.name}`);
      console.log(`Flavor Axes:`, JSON.stringify(data.flavor_axes));
      console.log('---');
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkSpirits();
