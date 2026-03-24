const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, 'service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkCounts() {
  try {
    const allUsers = await db.collection('users').get();
    const result = [];

    for (const userDoc of allUsers.docs) {
      const userId = userDoc.id;
      const userNotes = await db.collection('users').doc(userId).collection('notes').get();
      result.push({
        userId,
        notesCount: userNotes.size,
        chars: userId.split('').map(c => `${c}(${c.charCodeAt(0)})`)
      });
    }

    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Check failed:', err);
    process.exit(1);
  }
}

checkCounts();
