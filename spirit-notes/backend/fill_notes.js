const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');
const spiritsData = require('./api_spirits.json').spirits;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const getRandomPlausibleData = () => {
  const titles = [
    "A cozy evening by the fire",
    "Weekend flavor exploration",
    "First impression of this classic",
    "Sharing with friends",
    "A smooth and complex sip",
    "Surprised by the depth",
    "Classic choice for a rainy day",
    "Exploring the nuances",
    "A delightful discovery",
    "Perfect balance of flavors"
  ];

  const comments = [
    "Surprisingly smooth with a gentle finish.",
    "Very expressive on the nose, followed by a robust body.",
    "The fruity notes are quite prominent here.",
    "A classic that never disappoints. Very balanced.",
    "Strong start with a complex and long-lasting finish.",
    "Delicate floral notes blended with a hint of spice.",
    "Rich and woody, exactly what I was looking for.",
    "Sweet and mellow, perfect for a slow evening.",
    "A bit of a kick at first, but settles into a nice warmth.",
    "Intricate layers of flavor that reveal themselves slowly."
  ];

  return {
    title: titles[Math.floor(Math.random() * titles.length)],
    comment: comments[Math.floor(Math.random() * comments.length)],
    rating: parseFloat((3.5 + Math.random() * 1.5).toFixed(1))
  };
};

const findBestMatch = (name) => {
  if (!name || name === 'Unknown') return null;
  const lowerName = name.toLowerCase();
  
  // Try exact match first
  let match = spiritsData.find(s => s.name.toLowerCase() === lowerName);
  if (match) return match;

  // Try partial match
  match = spiritsData.find(s => lowerName.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(lowerName));
  return match;
};

async function fillMissingData() {
  console.log('--- Starting Refined Data Fill Process ---');
  try {
    const notesSnapshot = await db.collectionGroup('notes').get();
    console.log(`Total notes found: ${notesSnapshot.size}`);

    let updatedCount = 0;

    for (const docSnapshot of notesSnapshot.docs) {
      const data = docSnapshot.data();
      const path = docSnapshot.ref.path;
      const updates = {};
      const randomData = getRandomPlausibleData();

      // 1. Fill basic missing fields
      if (!data.title) updates.title = randomData.title;
      if (data.rating === undefined || data.rating === null) updates.rating = randomData.rating;
      if (!data.comment) updates.comment = randomData.comment;

      // 2. Handle Spirit-related data
      let selectedSpirit = null;
      if (data.spirit_id) {
        selectedSpirit = spiritsData.find(s => s.id === data.spirit_id);
      } else {
        selectedSpirit = findBestMatch(data.name);
      }

      // If no spirit found, use a fallback spirit from the list or defaults
      if (!selectedSpirit) {
        if (data.name === 'Unknown' || !data.name) {
          selectedSpirit = spiritsData[Math.floor(Math.random() * spiritsData.length)];
          updates.name = selectedSpirit.name;
          updates.spirit_id = selectedSpirit.id;
        } else {
            // Use defaults if name exists but no match
            if (!data.distillery) updates.distillery = "Legacy Distillery";
            if (!data.category) updates.category = "Whisky";
            if (data.abv === undefined || data.abv === null) updates.abv = 40;
            if (data.volume === undefined || data.volume === null) updates.volume = 700;
            if (!data.flavor_axes || Object.keys(data.flavor_axes).length === 0) {
              updates.flavor_axes = { peat: 3, floral: 3, fruity: 3, woody: 3, spicy: 3, sweet: 3 };
            }
        }
      }

      // If we have a spirit reference, fill missing details from it
      if (selectedSpirit) {
        if (!data.distillery) updates.distillery = selectedSpirit.distillery || '';
        if (!data.category) updates.category = selectedSpirit.category || '';
        if (data.abv === undefined || data.abv === null) updates.abv = selectedSpirit.abv || 40;
        if (data.volume === undefined || data.volume === null) updates.volume = selectedSpirit.volume || 700;
        if (!data.flavor_axes || Object.keys(data.flavor_axes).length === 0) {
          updates.flavor_axes = selectedSpirit.flavor_axes || { peat: 2, floral: 2, fruity: 2, woody: 2, spicy: 2, sweet: 2 };
        }
      }

      if (Object.keys(updates).length > 0) {
        await docSnapshot.ref.update(updates);
        console.log(`Updated note: ${data.name || 'Unknown'} at ${path}`);
        updatedCount++;
      }
    }

    console.log(`\nSuccess! Total notes updated: ${updatedCount}`);

  } catch (error) {
    console.error('Error filling missing data:', error);
  } finally {
    process.exit();
  }
}

fillMissingData();
