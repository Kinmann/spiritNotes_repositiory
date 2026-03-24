const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, 'service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixUserId() {
  const oldId = 'Y6yrkpoSFBPbyWR9GIeCxElAKQk2'; // The one with 'I' (char 73)
  const newId = 'Y6yrkpoSFBPbyWR9GleCxElAKQk2'; // The one with 'l' (char 108)

  try {
    console.log(`Checking old ID: ${oldId}`);
    const oldUserDoc = await db.collection('users').doc(oldId).get();
    if (!oldUserDoc.exists) {
      console.log('Old user document not found.');
      process.exit(1);
    }

    console.log('Found old user document. Copying to new ID...');
    const userData = oldUserDoc.data();
    await db.collection('users').doc(newId).set(userData);

    console.log('Copying notes subcollection...');
    const notesSnapshot = await db.collection('users').doc(oldId).collection('notes').get();
    console.log(`Found ${notesSnapshot.size} notes.`);

    for (const noteDoc of notesSnapshot.docs) {
      const noteData = noteDoc.data();
      await db.collection('users').doc(newId).collection('notes').doc(noteDoc.id).set(noteData);
      console.log(`  - Copied note: ${noteDoc.id}`);
    }

    console.log('Fix complete! (Old ID remains for safety, delete manually if confirmed)');
    process.exit(0);
  } catch (err) {
    console.error('Fix failed:', err);
    process.exit(1);
  }
}

fixUserId();
