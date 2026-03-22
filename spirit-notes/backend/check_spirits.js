const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, 'service-account.json');
let serviceAccount;

if (fs.existsSync(serviceAccountPath)) {
  serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
} else {
  console.error('Service account file not found!');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkAll() {
  console.log(`\n--- Checking path: users ---`);
  try {
    const snapshot = await db.collection('users').get();
    if (snapshot.empty) {
      console.log('No users found.');
    } else {
      snapshot.forEach(doc => {
        console.log(`User ID: ${doc.id}`);
        console.log('Flavor DNA:', JSON.stringify(doc.data().flavorDNA, null, 2));
      });
    }
  } catch (error) {
    console.error(`Error fetching users:`, error.message);
  }

  console.log(`\n--- Checking path: spirits (first 5) ---`);
  try {
    const snapshot = await db.collection('spirits').limit(5).get();
    if (snapshot.empty) {
      console.log('No spirits found.');
    } else {
      snapshot.forEach(doc => {
        console.log(`Spirit: ${doc.data().name} (${doc.id})`);
        console.log('Flavor Axes:', JSON.stringify(doc.data().flavor_axes, null, 2));
      });
    }
  } catch (error) {
    console.error(`Error fetching spirits:`, error.message);
  }
  process.exit(0);
}

checkAll();
