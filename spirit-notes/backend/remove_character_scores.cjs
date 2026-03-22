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

async function removeCharacterScores() {
  try {
    console.log('Fetching spirits collection...');
    const snapshot = await db.collection('spirits').get();
    
    if (snapshot.empty) {
      console.log('No spirits found.');
      return;
    }

    const batch = db.batch();
    let count = 0;

    snapshot.forEach(doc => {
      // Use FieldValue.delete() to remove the fields
      batch.update(doc.ref, {
        aroma: admin.firestore.FieldValue.delete(),
        taste: admin.firestore.FieldValue.delete(),
        body: admin.firestore.FieldValue.delete(),
        finish: admin.firestore.FieldValue.delete(),
        sweetness: admin.firestore.FieldValue.delete()
      });
      count++;
    });

    console.log(`Prepared to delete fields from ${count} documents. Committing...`);
    await batch.commit();
    console.log('Successfully removed character score fields from all spirits.');
  } catch (error) {
    console.error('Error removing fields:', error);
  } finally {
    process.exit(0);
  }
}

removeCharacterScores();
