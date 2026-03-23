const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function test() {
  console.log("Testing gemini-pro...");
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent("Hello, respond with 'OK'");
    console.log("Success with gemini-pro:", result.response.text());
  } catch (error) {
    console.error("Error with gemini-pro:", error.message);
  }
}

test();
