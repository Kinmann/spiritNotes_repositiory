const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, 'service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();

async function checkAuthUsers() {
  try {
    const listUsersResult = await auth.listUsers(10);
    listUsersResult.users.forEach((userRecord) => {
      const uid = userRecord.uid;
      console.log(`AUTH UID: ${uid}`);
      const debugChars = uid.split('').map(c => `${c}(${c.charCodeAt(0)})`).join(' ');
      console.log(`DEBUG CHARS: ${debugChars}`);
    });
    process.exit(0);
  } catch (error) {
    console.error('Error listing users:', error);
    process.exit(1);
  }
}

checkAuthUsers();
