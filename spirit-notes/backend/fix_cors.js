const { Storage } = require('@google-cloud/storage');
const path = require('path');

const storage = new Storage({
  keyFilename: path.join(__dirname, 'service-account.json'),
});

const bucketName = 'antigravity-dd7c2.firebasestorage.app';

async function setCors() {
  console.log(`Setting CORS for bucket: ${bucketName}...`);
  try {
    await storage.bucket(bucketName).setCorsConfiguration([
      {
        maxAgeSeconds: 3600,
        method: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        origin: ['http://localhost:5173'],
        responseHeader: ['Content-Type', 'Authorization', 'Content-Length', 'User-Agent', 'X-Requested-With'],
      },
    ]);
    console.log('✅ CORS configuration set successfully.');
  } catch (error) {
    console.error('❌ Failed to set CORS:', error.message);
    
    // Try appspot.com if firebasestorage.app fails
    if (bucketName.includes('firebasestorage.app')) {
        const altBucket = 'antigravity-dd7c2.appspot.com';
        console.log(`Retrying with alternative bucket: ${altBucket}...`);
        await storage.bucket(altBucket).setCorsConfiguration([
            {
              maxAgeSeconds: 3600,
              method: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
              origin: ['http://localhost:5173'],
              responseHeader: ['Content-Type', 'Authorization', 'Content-Length', 'User-Agent', 'X-Requested-With'],
            },
          ]);
          console.log('✅ CORS configuration set successfully (on appspot.com).');
    }
  }
}

setCors();
