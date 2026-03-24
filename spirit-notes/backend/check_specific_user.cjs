const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, 'service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkSpecificUser() {
  try {
    const allUsers = await db.collection('users').get();
    for (const userDoc of allUsers.docs) {
      if (userDoc.id.startsWith('Y6yrkpo')) {
        const userId = userDoc.id;
        const userNotes = await db.collection('users').doc(userId).collection('notes').get();
        console.log(`MATCHED USER ID: ${userId}`);
        const debugChars = userId.split('').map(c => `${c}(${c.charCodeAt(0)})`).join(' ');
        console.log(`DEBUG CHARS: ${debugChars}`);
        console.log(`NOTES COUNT: ${userNotes.size}`);
      }
    }
    process.exit(0);
  } catch (err) {
    console.error('Check failed:', err);
    process.exit(1);
  }
}

checkSpecificUser();
