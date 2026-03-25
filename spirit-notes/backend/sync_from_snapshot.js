const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Target the local emulator
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

admin.initializeApp({
  projectId: 'antigravity-dd7c2'
});

const db = admin.firestore();

async function sync() {
  console.log('--- Syncing Local Emulator with Production Snapshot ---');

  const snapshotPath = path.join(__dirname, 'production_snapshot.json');
  if (!fs.existsSync(snapshotPath)) {
    console.error('Error: production_snapshot.json not found!');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));

  try {
    // 1. Sync Categories
    console.log(`Syncing ${data.categories.length} categories...`);
    for (const item of data.categories) {
      const { id, ...fields } = item;
      await db.collection('categories').doc(id).set(fields);
    }

    // 2. Sync Locations
    console.log(`Syncing ${data.locations.length} locations...`);
    for (const item of data.locations) {
      const { id, ...fields } = item;
      await db.collection('locations').doc(id).set(fields);
    }

    // 3. Sync Spirits
    console.log(`Syncing ${data.spirits.length} spirits...`);
    for (const item of data.spirits) {
      const { id, ...fields } = item;
      await db.collection('spirits').doc(id).set(fields);
    }

    console.log('--- Sync Completed Successfully! ---');
    console.log('Now your local emulator matches production data for structural collections.');

  } catch (error) {
    console.error('Sync failed:', error);
  } finally {
    process.exit();
  }
}

sync();
