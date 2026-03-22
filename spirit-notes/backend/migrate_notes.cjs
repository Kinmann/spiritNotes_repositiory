const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccount = JSON.parse(fs.readFileSync('service-account.json', 'utf8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateNotes() {
  try {
    const rootNotesSnapshot = await db.collection('notes').get();
    console.log(`Found ${rootNotesSnapshot.size} notes in root collection.`);

    for (const docSnap of rootNotesSnapshot.docs) {
      const data = docSnap.data();
      const uid = data.uid;
      const noteId = docSnap.id;

      if (!uid) {
        console.warn(`Skipping note ${noteId} - no UID found.`);
        continue;
      }

      console.log(`Migrating note ${noteId} for user ${uid}...`);
      
      // Move to subcollection
      await db.collection('users').doc(uid).collection('notes').doc(noteId).set(data);
      
      // OPTIONAL: Delete from root after copy (Safest to keep for now, or delete if confirmed)
      // await db.collection('notes').doc(noteId).delete();
      // console.log(`  - Deleted ${noteId} from root.`);
    }

    console.log('Migration complete!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrateNotes();
