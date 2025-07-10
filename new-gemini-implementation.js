// Updated callGemini function using the new @google/genai package
import { GoogleGenAI } from "@google/genai";
import { logGeminiResponse } from "../../lib/gemini-logger.js";

// Initialize the new Google Gen AI client
const googleGenAI = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY || ""
});

// Helper function to sanitize error messages
function sanitizeErrorMessage(error) {
  const originalError = error instanceof Error ? error.message : String(error);
  console.error("Original error:", originalError);
  return "Something went wrong. Please try again.";
}

export async function callGeminiNew(prompt, base64Image, imageSource, modelName = "gemini-2.5-flash") {
  const startTime = Date.now();
  let geminiResponse = null;
  let error = null;
  
  try {
    console.log(`Calling Gemini (new API) for image: ${imageSource.substring(0, 50)}...`);
    console.log(`Using prompt: ${prompt}`);

    // Check if API key is available
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error(sanitizeErrorMessage("API key not available"));
    }

    // Create the system prompt and user prompt
    const systemPrompt = "You are a visual analysis assistant examining images from a restaurant or food service environment.";
    const fullPrompt = `${systemPrompt}\n\n${prompt}`;

    // Prepare the contents array with the new API structure
    const contents = [
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Image,
        },
      },
      { text: fullPrompt },
    ];

    // Generate content using the new API
    const response = await googleGenAI.models.generateContent({
      model: modelName,
      contents: contents,
    });

    const text = response.text;
    const usageMetadata = response.usageMetadata || {};
    
    // Store the complete response for logging
    geminiResponse = {
      text: text,
      fullResponse: response,
      usageMetadata: usageMetadata,
    };

    // Use actual token counts when available, fallback to estimation
    const actualTokens = {
      prompt: usageMetadata.promptTokenCount || 0,
      completion: (usageMetadata.candidatesTokenCount || 0) + (usageMetadata.thoughtsTokenCount || 0),
      total: usageMetadata.totalTokenCount || 0,
    };

    // Fallback estimation for cases where usageMetadata is incomplete
    const promptChars = fullPrompt.length + 1000; // Add 1000 for image (very rough estimate)
    const completionChars = text.length;
    const estimatedTokens = {
      prompt: Math.ceil(promptChars / 4),
      completion: Math.ceil(completionChars / 4),
      total: Math.ceil((promptChars + completionChars) / 4),
    };

    // Use actual tokens if available, otherwise use estimates
    const finalTokens = {
      prompt: actualTokens.prompt || estimatedTokens.prompt,
      completion: actualTokens.completion || estimatedTokens.completion,
      total: actualTokens.total || estimatedTokens.total,
    };

    const processingTime = Date.now() - startTime;

    console.log(`Gemini (new API) response received. Actual tokens: ${actualTokens.total}, Estimated tokens: ${estimatedTokens.total}`);

    // Log the complete response
    logGeminiResponse({
      prompt: fullPrompt,
      imageSource,
      response: geminiResponse,
      metadata: {
        model: modelName,
        processingTime,
        actualTokens: actualTokens,
        estimatedTokens: estimatedTokens,
        usageMetadata: usageMetadata,
        promptChars,
        completionChars,
        imageSize: base64Image ? base64Image.length : 0,
        apiVersion: "new-genai-v1.8.0"
      },
    });

    return {
      image: imageSource,
      label: text || "No response",
      tokens: finalTokens,
      usageMetadata: usageMetadata,
    };
  } catch (err) {
    error = err;
    const processingTime = Date.now() - startTime;
    
    console.error("Error calling Gemini (new API):", err);

    // Log the error response
    logGeminiResponse({
      prompt: prompt,
      imageSource,
      response: null,
      metadata: {
        model: modelName,
        processingTime,
        imageSize: base64Image ? base64Image.length : 0,
        apiVersion: "new-genai-v1.8.0"
      },
      error: err,
    });

    // Always throw a generic error message to avoid exposing API details
    throw new Error(sanitizeErrorMessage(err));
  }
}
