const admin = require('firebase-admin');

// 1. Initialize Production App
const serviceAccount = require('./service-account.json');
const prodApp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'antigravity-dd7c2'
}, 'production');

const prodDb = prodApp.firestore();

async function testDirectAccess() {
  console.log('--- TEST DIRECT ACCESS: ABERLOUR DISTILLERY ---');
  
  try {
    const docRef = prodDb.collection('distilleries').doc('aberlour-distillery');
    console.log('Fetching aberlour-distillery from production...');
    const doc = await docRef.get();
    
    if (doc.exists) {
      console.log('SUCCESS: Document found!');
      console.log('Data:', JSON.stringify(doc.data(), null, 2));
    } else {
      console.log('FAILURE: Document NOT found!');
    }
  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    process.exit(0);
  }
}

testDirectAccess();
