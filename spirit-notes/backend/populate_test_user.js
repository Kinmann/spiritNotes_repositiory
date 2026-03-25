const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json'); // I'll check if this exists or use project ID

admin.initializeApp({
  projectId: 'antigravity-dd7c2'
});

const db = admin.firestore();

async function populateTestUser() {
  const userId = 'test_ai_user';
  const userData = {
    email: 'test_ai@example.com',
    displayName: 'Test AI User',
    flavorDNA: {
      peat: 2.5,
      floral: 1.2,
      fruity: 4.5,
      woody: 3.8,
      spicy: 1.5,
      sweet: 4.0
    }
  };

  await db.collection('users').doc(userId).set(userData);
  console.log(`Test user ${userId} populated with flavorDNA.`);
  process.exit(0);
}

populateTestUser().catch(err => {
  console.error(err);
  process.exit(1);
});
