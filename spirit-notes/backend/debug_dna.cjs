const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccount = JSON.parse(fs.readFileSync('service-account.json', 'utf8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const calculateFlavorDNA = (notes) => {
  let dna = { peat: 0, floral: 0, fruity: 0, woody: 0, spicy: 0, sweet: 0 };
  
  const validNotes = notes.filter(n => (n.totalRating || n.rating) > 0);
  console.log(`Analyzing ${validNotes.length} valid notes out of ${notes.length}`);
  if (!validNotes || validNotes.length === 0) return dna;

  let totalWeight = 0;
  const lambda = 0.05;
  const now = Date.now();

  validNotes.forEach((note, i) => {
    const noteTime = note.createdAt?.toMillis ? note.createdAt.toMillis() : (new Date(note.createdAt).getTime() || now);
    const daysSince = Math.max(0, (now - noteTime) / (1000 * 60 * 60 * 24));
    const timeWeight = Math.exp(-lambda * daysSince);
    const ratingWeight = (note.totalRating || note.rating || 0) / 5.0;
    const finalWeight = timeWeight * ratingWeight;

    totalWeight += finalWeight;
    console.log(`Note ${i}: rating=${note.rating || note.totalRating}, weight=${finalWeight.toFixed(3)}, axes=${JSON.stringify(note.flavor_axes)}`);

    Object.keys(dna).forEach(key => {
      const flavorScore = note.flavor_axes?.[key] || 0;
      const weightedScore = flavorScore * finalWeight;
      dna[key] += weightedScore;
      if (weightedScore > 0) console.log(`  - ${key}: score=${flavorScore}, weighted=${weightedScore.toFixed(3)}`);
    });
  });

  console.log(`Summary: totalWeight=${totalWeight.toFixed(3)}, rawSums=${JSON.stringify(dna)}`);

  if (totalWeight > 0) {
    Object.keys(dna).forEach(key => {
      dna[key] = Math.round((dna[key] / totalWeight) * 10) / 10;
    });
  }

  return dna;
};

async function debugUserDNA(userId) {
  try {
    const notesRef = db.collection('users').doc(userId).collection('notes');
    const snapshot = await notesRef.get();
    const notes = snapshot.docs.map(doc => doc.data());
    
    console.log(`User ${userId} has ${notes.length} notes.`);
    const dna = calculateFlavorDNA(notes);
    console.log('Resulting DNA:', dna);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

debugUserDNA('3K6dUQnyvkR2HOrKMcoiMiGsVsz1');
