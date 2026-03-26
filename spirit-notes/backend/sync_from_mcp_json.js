const admin = require('firebase-admin');
const fs = require('fs');

/**
 * Script to sync local emulator with production data exported to JSON files.
 * This handles the specific Firestore REST API JSON format returned by MCP tools.
 */

// Target the local emulator
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

admin.initializeApp({
  projectId: 'antigravity-dd7c2'
});

const db = admin.firestore();

function convertValue(v) {
  if (!v) return null;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return parseInt(v.integerValue);
  if (v.doubleValue !== undefined) return parseFloat(v.doubleValue);
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.timestampValue !== undefined) return v.timestampValue;
  if (v.mapValue !== undefined) {
    const fields = v.mapValue.fields || {};
    const result = {};
    for (const [key, val] of Object.entries(fields)) {
      result[key] = convertValue(val);
    }
    return result;
  }
  if (v.arrayValue !== undefined) {
    const values = v.arrayValue.values || [];
    return values.map(val => convertValue(val));
  }
  return null;
}

async function syncFromJson(filePath, collectionName) {
  console.log(`\nSyncing ${collectionName} from ${filePath}...`);
  if (!fs.existsSync(filePath)) {
    console.error(`- Error: ${filePath} not found!`);
    return;
  }

  try {
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const documents = content.documents || [];
    console.log(`- Found ${documents.length} documents.`);

    const batch = db.batch();
    let count = 0;

    for (const doc of documents) {
      const id = doc.name.split('/').pop();
      const fields = {};
      for (const [key, val] of Object.entries(doc.fields || {})) {
        fields[key] = convertValue(val);
      }

      batch.set(db.collection(collectionName).doc(id), fields);
      count++;
    }

    if (count > 0) {
      await batch.commit();
      console.log(`- Successfully synced ${count} documents to local emulator.`);
    }
  } catch (err) {
    console.error(`- Failed to sync ${collectionName}:`, err.message);
  }
}

async function run() {
  const basePath = 'C:/Users/gamedex02/.gemini/antigravity/brain/197b064f-55ae-47d3-8b36-b8c20ecadefa/.system_generated/steps';
  
  await syncFromJson(`${basePath}/1284/output.txt`, 'categories');
  await syncFromJson(`${basePath}/1212/output.txt`, 'locations');
  await syncFromJson(`${basePath}/1256/output.txt`, 'distilleries');
  await syncFromJson(`${basePath}/1204/output.txt`, 'spirits');

  console.log('\n--- Final Sync Completed ---');
  process.exit(0);
}

run();
