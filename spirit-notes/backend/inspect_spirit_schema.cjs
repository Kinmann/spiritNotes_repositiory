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

async function inspectHierarchy() {
  try {
    const targetSpiritId = '54nXY3Lgkfab2R80zdxS'; // Macallan 12Y
    const spiritSnap = await db.collection('spirits').doc(targetSpiritId).get();
    const spiritData = spiritSnap.data();

    console.log('--- Spirit:', spiritData.name, '---');

    // Category Hierarchy
    let catId = spiritData.categoryId;
    let catPath = [];
    while (catId) {
      const catSnap = await db.collection('categories').doc(catId).get();
      if (!catSnap.exists) break;
      const data = catSnap.data();
      catPath.unshift(data);
      catId = data.parentId;
    }
    console.log('Category Hierarchy (Full):', JSON.stringify(catPath, null, 2));

    // Location Hierarchy
    let locId = spiritData.locationId;
    let locPath = [];
    while (locId) {
      const locSnap = await db.collection('locations').doc(locId).get();
      if (!locSnap.exists) break;
      const data = locSnap.data();
      locPath.unshift(data);
      locId = data.parentId;
    }
    console.log('Location Hierarchy (Full):', JSON.stringify(locPath, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

inspectHierarchy();
