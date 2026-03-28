const path = require('path');
const functionsDir = path.join(__dirname, '..', 'functions');
const dotenv = require(path.join(functionsDir, 'node_modules', 'dotenv'));
const { GoogleGenerativeAI } = require(path.join(functionsDir, 'node_modules', '@google/generative-ai'));

dotenv.config({ path: path.join(functionsDir, '.env') });

async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY is not defined in functions/.env');
    return;
  }
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = "gemini-2.5-flash";
  console.log(`Testing model: ${modelName}`);
  
  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent("Hello, are you there?");
    console.log('Response content:', result.response.text());
  } catch (error) {
    console.error('Error generating content:', error.message);
  }
}

testGemini();
