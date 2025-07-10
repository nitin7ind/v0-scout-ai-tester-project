// Test script for the new @google/genai API syntax
import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testNewGeminiAPI() {
  console.log('Testing new @google/genai API syntax...');
  
  try {
    // Initialize the new API with API key like the documentation shows
    const GEMINI_API_KEY = process.env.GOOGLE_API_KEY;
    if (!GEMINI_API_KEY) {
      throw new Error('GOOGLE_API_KEY environment variable is not set');
    }
    
    console.log('Using API key:', GEMINI_API_KEY.substring(0, 10) + '...');
    
    const ai = new GoogleGenAI({apiKey: GEMINI_API_KEY});
    
    console.log('✅ GoogleGenAI initialized successfully with API key');
    
    // Create a simple text-only test first
    const textResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Hello, can you respond with 'API test successful'?",
    });
    
    console.log('✅ Text API call successful');
    console.log('Response:', textResponse.text);
    console.log('Usage Metadata:', textResponse.usageMetadata);
    
    // Test with a simple base64 image (create a minimal test image)
    // Using a 1x1 pixel JPEG as a test
    const testBase64Image = "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA==";
    
    const imageContents = [
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: testBase64Image,
        },
      },
      { text: "What do you see in this image?" },
    ];
    
    const imageResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: imageContents,
    });
    
    console.log('✅ Image API call successful');
    console.log('Image Response:', imageResponse.text);
    console.log('Usage Metadata:', imageResponse.usageMetadata);
    
    return {
      success: true,
      textResponse: textResponse.text,
      imageResponse: imageResponse.text,
      textUsageMetadata: textResponse.usageMetadata,
      imageUsageMetadata: imageResponse.usageMetadata
    };
    
  } catch (error) {
    console.error('❌ New API test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
testNewGeminiAPI().then(result => {
  console.log('\n=== Test Results ===');
  console.log(JSON.stringify(result, null, 2));
}).catch(console.error);
