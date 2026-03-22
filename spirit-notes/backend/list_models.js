const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
  try {
    const result = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }).listModels();
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    // If listModels is not directly on the model object (depending on SDK version)
    try {
        // Newer SDKs might have a different way or it's on the genAI object (if supported)
        console.error('Error listing models:', error.message);
    } catch (e) {
        console.error('Fatal error:', e.message);
    }
  }
}

listModels();
