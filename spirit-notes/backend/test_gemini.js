const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function test() {
  const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];
  for (const m of models) {
    console.log(`Testing model: ${m}`);
    try {
      const model = genAI.getGenerativeModel({ model: m }, { apiVersion: 'v1' });
      const result = await model.generateContent("Hello, respond with 'OK'");
      console.log(`Success with ${m}:`, result.response.text());
      break;
    } catch (error) {
      console.error(`Error with ${m}:`, error.message);
    }
  }
}

test();
