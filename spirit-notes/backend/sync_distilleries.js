const admin = require('firebase-admin');

// 1. Initialize Production App (using the existing service-account.json)
const serviceAccount = require('./service-account.json');
const prodApp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'antigravity-dd7c2'
}, 'production');

// 2. Initialize Emulator App
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
const localApp = admin.initializeApp({
  projectId: 'antigravity-dd7c2'
}, 'local');

const prodDb = prodApp.firestore();
const localDb = localApp.firestore();

const distilleryIds = [
  'aberlour-distillery', 'ardbeg-distillery', 'ballantines', 'caymus-vineyards', 
  'chateau-margaux', 'glenfiddich-distillery', 'glenlivet-distillery', 
  'glenmorangie-distillery', 'highland-park-distillery', 'johnnie-walker', 
  'lagavulin-distillery', 'laphroaig-distillery', 'macallan-distillery', 
  'nikka-whisky-distilling', 'opus-one-winery', 'screaming-eagle-winery', 
  'silver-oak-cellars', 'springbank-distillery', 'suntory', 
  'suntory-hakushu-distillery', 'suntory-yamazaki-distillery', 'william-grant-sons'
];

async function syncDistilleries() {
  console.log('--- SYNCING DISTILLERIES VIA IDS ---');
  
  try {
    const batch = localDb.batch();
    let count = 0;
    
    for (const id of distilleryIds) {
      console.log(`Fetching ${id}...`);
      const doc = await prodDb.collection('distilleries').doc(id).get();
      if (doc.exists) {
        batch.set(localDb.collection('distilleries').doc(id), doc.data());
        count++;
      } else {
        console.warn(`Warning: ${id} not found in production!`);
      }
    }
    
    if (count > 0) {
      await batch.commit();
      console.log(`Successfully synced ${count} distilleries to local emulator.`);
    } else {
      console.log('No distilleries found to sync.');
    }
  } catch (err) {
    console.error('Sync failed:', err);
  } finally {
    process.exit(0);
  }
}

syncDistilleries();
