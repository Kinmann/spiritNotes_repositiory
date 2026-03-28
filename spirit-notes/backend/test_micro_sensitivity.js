const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
dotenv.config({ path: 'backend/.env' });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

async function testPersona(dna, label) {
  console.log(`\n--- Testing Scenario: ${label} ---`);
  console.log('DNA:', JSON.stringify(dna));
  
  const prompt = `
    Analyze this Whiskey Flavor DNA with extreme precision: ${JSON.stringify(dna)}.
    The DNA consists of 6 axes: Peat, Floral, Fruity, Woody, Spicy, Sweet (0.0 to 5.0 scale).
    
    Guidelines for Micro-Sensitivity:
    1. Numerical Precision: Treat even a 0.1 difference between axes as a significant nuance in the user's palate. A 4.5 is qualitatively more intense than a 4.4.
    2. Tiered Interpretation:
       - 0.0 - 1.0: Minimal presence (a ghostly hint)
       - 1.1 - 2.0: Subtle undercurrent (noticeable but polite)
       - 2.1 - 3.0: Moderate presence (the heart of the palate)
       - 3.1 - 4.0: High dominance (the defining character)
       - 4.1 - 5.0: Extreme saturation (an absolute obsession)
    3. Threshold Effects: If an axis crosses into a new tier (e.g., from 3.0 to 3.1), emphasize that shift in the persona's description.
    4. Relational Dynamics: Compare axes rigorously. If Fruity is 3.5 and Sweet is 3.6, explain how the sweetness slightly edges out the fruitiness, creating a "candied" or "syrupy" nuance rather than just "balanced."
    5. Complex Synergies: If Peat (4.2) and Floral (1.2) coexist, describe how the heavy smoke almost entirely masks the delicate flowers, but the 1.2 ensures they still "gasps for air" in the finish.
    
    Create a sophisticated, highly specific, and poetic "Taste Persona" based on these micro-nuances.
    Output valid JSON: { "title": "...", "description": "...", "characteristics": ["..."], "recommendationFocus": ["..."] }
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const persona = JSON.parse(jsonMatch[0]);
      console.log('Persona Title:', persona.title);
      console.log('Description:', persona.description);
    } else {
      console.log('Raw Result:', text);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function runTests() {
  // Case 1: Slight dominance (0.1 edge)
  await testPersona(
    { peat: 3.1, floral: 3.0, fruity: 3.0, woody: 3.0, spicy: 3.0, sweet: 3.0 },
    "The 0.1 Peat Edge (Peat crosses into 'High' tier, others stay at 'Moderate')"
  );

  // Case 2: Extreme Tier Jump (4.1) vs High Tier (3.9)
  await testPersona(
    { peat: 1.0, floral: 1.0, fruity: 3.9, woody: 1.0, spicy: 1.0, sweet: 4.1 },
    "Extreme Sweetness (4.1) vs High Fruitiness (3.9)"
  );

  // Case 3: Subtle Synergy (3.5 vs 3.6)
  await testPersona(
    { peat: 0.5, floral: 0.5, fruity: 3.5, woody: 2.0, spicy: 2.0, sweet: 3.6 },
    "Sweet (3.6) slightly edging Fruity (3.5)"
  );
}

runTests();
