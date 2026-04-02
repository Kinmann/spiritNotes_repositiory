const path = require('path');
const https = require('https');
const functionsDir = path.join(__dirname, '..', 'functions');
require(path.join(functionsDir, 'node_modules', 'dotenv')).config({ path: path.join(functionsDir, '.env') });

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY is not defined in functions/.env');
    return;
  }
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

  https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        if (json.models) {
          console.log('Available Models:');
          json.models.forEach(model => {
            console.log(`- ${model.name} (${model.displayName})`);
          });
        } else {
          console.error('No models found or API error:', json);
        }
      } catch (e) {
        console.error('Failed to parse response:', e.message);
        console.log('Raw response:', data);
      }
    });
  }).on('error', (err) => {
    console.error('Error fetching models:', err.message);
  });
}

listModels();
