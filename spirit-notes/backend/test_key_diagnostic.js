require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY; 

async function listModels() {
  console.log("Testing with API Key from .env:", apiKey ? `${apiKey.substring(0, 6)}...` : "MISSING");
  if (!apiKey) return;
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent("Hi");
    console.log("Response successful!");
    console.log("Response text:", result.response.text());
  } catch (error) {
    console.error("Error with this key:", error.message);
  }
}

listModels();
