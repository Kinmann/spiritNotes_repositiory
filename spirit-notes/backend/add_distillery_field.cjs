const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccount = JSON.parse(fs.readFileSync(path.join(__dirname, 'service-account.json'), 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// 각 스피릿 이름에 매핑되는 distillery/brand 정보
const DISTILLERY_MAP = {
  'Macallan 12Y Sherry Oak': 'The Macallan Distillery',
  'Balvenie 12Y DoubleWood': 'William Grant & Sons',
  'Hibiki Japanese Harmony': 'Suntory',
  'Lagavulin 16Y': 'Diageo (Lagavulin Distillery)',
  'Laphroaig 10Y': 'Beam Suntory (Laphroaig Distillery)',
  'Hendrick\'s Gin': 'William Grant & Sons',
  'Opus One 2019': 'Opus One Winery',
};

async function addDistilleryField() {
  const snapshot = await db.collection('spirits').get();
  console.log(`Total spirits: ${snapshot.size}`);

  const batch = db.batch();
  let updated = 0;

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const distillery = DISTILLERY_MAP[data.name];
    if (distillery) {
      batch.update(doc.ref, { distillery });
      console.log(`  Setting distillery for "${data.name}": ${distillery}`);
      updated++;
    } else {
      console.warn(`  No distillery mapping found for: "${data.name}"`);
    }
  });

  await batch.commit();
  console.log(`\n✅ Updated ${updated} documents with distillery field.`);
  process.exit(0);
}

addDistilleryField().catch(err => { console.error(err); process.exit(1); });
