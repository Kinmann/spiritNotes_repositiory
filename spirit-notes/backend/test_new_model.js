const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function test() {
  console.log("Testing gemini-2.5-flash...");
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  try {
    const result = await model.generateContent("Hello, respond with 'OK'");
    console.log("Success with gemini-2.5-flash:", result.response.text());
  } catch (error) {
    console.error("Error with gemini-2.0-flash:", error.message);
  }
}

test();
