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

async function seedFlavorAxes() {
  try {
    const snapshot = await db.collection('spirits').get();
    if (snapshot.empty) {
      console.log('No spirits found.');
      return;
    }

    const batch = db.batch();
    let count = 0;

    snapshot.forEach(doc => {
      const data = doc.data();
      const name = data.name.toLowerCase();
      
      let flavorAxes = {
        peat: 2.0, // Default base
        floral: 4.0,
        fruity: 5.0, // Default for 10-point scale
        woody: 5.0,
        spicy: 5.0,
        sweet: 5.0
      };

      // Special handling based on keywords
      if (name.includes('macallan') || name.includes('sherry')) {
        flavorAxes.fruity = 9.0;
        flavorAxes.sweet = 8.0;
        flavorAxes.woody = 7.0;
      }
      if (name.includes('hibiki') || name.includes('harmony')) {
        flavorAxes.floral = 8.0;
        flavorAxes.fruity = 7.0;
        flavorAxes.sweet = 7.0;
      }
      if (name.includes('peat') || name.includes('laphroaig') || name.includes('ardbeg') || name.includes('lagavulin')) {
        flavorAxes.peat = 9.5;
      }
      if (name.includes('balvenie')) {
        flavorAxes.sweet = 8.0;
        flavorAxes.fruity = 7.6;
        flavorAxes.woody = 6.0;
      }

      // Ensure values are between 0 and 10
      Object.keys(flavorAxes).forEach(key => {
        flavorAxes[key] = Math.min(10, Math.max(0, parseFloat(flavorAxes[key].toFixed(1))));
      });

      batch.update(doc.ref, { flavor_axes: flavorAxes });
      count++;
    });

    await batch.commit();
    console.log(`Successfully updated ${count} spirits with flavor_axes.`);
  } catch (error) {
    console.error('Error seeding spirits:', error);
  } finally {
    process.exit(0);
  }
}

seedFlavorAxes();
