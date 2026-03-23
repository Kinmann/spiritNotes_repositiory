const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function run() {
  console.log("Starting generation...");
  try {
    const result = await model.generateContent("Write a tagline for an ice cream shop.");
    console.log(result.response.text());
  } catch (err) {
    console.error("Caught error:", err);
  }
}

run();
