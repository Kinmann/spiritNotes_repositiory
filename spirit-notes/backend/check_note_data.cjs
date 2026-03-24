const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, 'service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkNoteData() {
  const userId = 'Y6yrkpoSFBPbyWR9GleCxElAKQk2';
  try {
    const notesSnapshot = await db.collection('users').doc(userId).collection('notes').get();
    console.log(`User ID: ${userId}, Notes count: ${notesSnapshot.size}`);
    if (notesSnapshot.size > 0) {
      const firstNote = notesSnapshot.docs[0].data();
      console.log('First note data keys:', Object.keys(firstNote));
      console.log('createdAt:', firstNote.createdAt);
      console.log('date:', firstNote.date);
    }
    process.exit(0);
  } catch (err) {
    console.error('Check failed:', err);
    process.exit(1);
  }
}

checkNoteData();
