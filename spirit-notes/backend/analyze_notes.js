const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function analyzeNotes() {
  console.log('--- Tasting Note Analysis ---');
  try {
    const notesSnapshot = await db.collectionGroup('notes').get();
    console.log(`Total notes found: ${notesSnapshot.size}`);

    const analysis = {
      total: notesSnapshot.size,
      missingTitle: 0,
      missingDistillery: 0,
      missingCategory: 0,
      missingAbv: 0,
      missingVolume: 0,
      missingFlavorAxes: 0,
      missingComment: 0,
      missingRating: 0,
      notes: []
    };

    notesSnapshot.forEach(doc => {
      const data = doc.data();
      const path = doc.ref.path;
      const missing = [];

      if (!data.title) {
        analysis.missingTitle++;
        missing.push('title');
      }
      if (!data.distillery) {
        analysis.missingDistillery++;
        missing.push('distillery');
      }
      if (!data.category && !data.categoryId) {
        analysis.missingCategory++;
        missing.push('category');
      }
      if (data.abv === undefined || data.abv === null) {
        analysis.missingAbv++;
        missing.push('abv');
      }
      if (data.volume === undefined || data.volume === null) {
        analysis.missingVolume++;
        missing.push('volume');
      }
      if (!data.flavor_axes || Object.keys(data.flavor_axes).length === 0) {
        analysis.missingFlavorAxes++;
        missing.push('flavor_axes');
      }
      if (!data.comment) {
        analysis.missingComment++;
        missing.push('comment');
      }
      if (data.rating === undefined || data.rating === null) {
        analysis.missingRating++;
        missing.push('rating');
      }

      if (missing.length > 0) {
        analysis.notes.push({
          id: doc.id,
          path: path,
          name: data.name || 'Unknown',
          missing: missing
        });
      }
    });

    console.log('\nSummary:');
    console.log(`- Missing Title: ${analysis.missingTitle}`);
    console.log(`- Missing Distillery: ${analysis.missingDistillery}`);
    console.log(`- Missing Category: ${analysis.missingCategory}`);
    console.log(`- Missing ABV: ${analysis.missingAbv}`);
    console.log(`- Missing Volume: ${analysis.missingVolume}`);
    console.log(`- Missing Flavor Axes: ${analysis.missingFlavorAxes}`);
    console.log(`- Missing Comment: ${analysis.missingComment}`);
    console.log(`- Missing Rating: ${analysis.missingRating}`);

    if (analysis.notes.length > 0) {
      console.log('\nDetailed Missing Data:');
      analysis.notes.forEach(note => {
        console.log(`- ${note.name} (${note.path}): ${note.missing.join(', ')}`);
      });
    }

  } catch (error) {
    console.error('Error analyzing notes:', error);
  } finally {
    process.exit();
  }
}

analyzeNotes();
