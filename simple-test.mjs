// Simple test for new @google/genai API
import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';

dotenv.config();

async function simpleTest() {
  try {
    const ai = new GoogleGenAI({apiKey: process.env.GOOGLE_API_KEY});
    console.log('✅ API initialized');
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Say hello",
    });
    
    console.log('✅ Response received');
    console.log('Text:', response.text);
    console.log('Usage:', response.usageMetadata);
    
    return { success: true, response: response.text };
  } catch (error) {
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

simpleTest().then(console.log);
