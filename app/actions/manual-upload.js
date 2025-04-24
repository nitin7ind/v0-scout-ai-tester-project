"use server"

import { makeSerializable } from "./utils"
import { getLabelFromImageUrlWithGPT, getLabelFromImageUrlWithGemini } from "./image-processing"
import { callGpt } from "./image-processing"
import { callGemini } from "./image-processing"

// Helper function to process an uploaded file
export async function getLabelFromUploadedFile(file, prompt, modelType = "gpt") {
  try {
    console.log(`Processing uploaded file with ${modelType}: ${file.name}, size: ${file.size} bytes`)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64Image = buffer.toString("base64")

    if (modelType === "gemini") {
      return await callGemini(prompt, base64Image, "Uploaded Image")
    } else {
      const imageDataUri = `data:image/jpeg;base64,${base64Image}`
      return await callGpt(prompt, imageDataUri, "Uploaded Image")
    }
  } catch (error) {
    console.error(`Error processing uploaded file with ${modelType}:`, error)
    throw new Error(`Error reading upload: ${error.message || String(error)}`)
  }
}

// Legacy function for manual image uploads (kept for backward compatibility)
export async function analyzeImages(formData) {
  try {
    const prompt = formData.get("prompt")
    const inputType = formData.get("input_type")
    const modelType = formData.get("model_type") || "gpt" // Default to GPT if not specified

    console.log(`Starting image analysis with input type: ${inputType}, model: ${modelType}`)
    console.log(`Prompt: ${prompt}`)

    if (inputType === "manual") {
      const results = []
      let processedCount = 0
      let promptTokens = 0
      let completionTokens = 0
      let totalTokens = 0
      let errorMessage = ""

      // Handle manual image upload or URL
      const manualFile = formData.get("manual_image")
      const manualUrl = formData.get("manual_url")

      if (manualFile && manualFile.size > 0) {
        console.log(`Processing uploaded file with ${modelType}: ${manualFile.name}, size: ${manualFile.size} bytes`)
        try {
          const result = await getLabelFromUploadedFile(manualFile, prompt, modelType)

          // Add file name as image property for reference
          result.image = manualFile.name
          // Add a flag to indicate this is an uploaded file that needs special handling in the UI
          result.isUploadedFile = true

          results.push(result)
          processedCount++
          const tokens = result.tokens || { prompt: 0, completion: 0, total: 0 }
          promptTokens += tokens.prompt
          completionTokens += tokens.completion
          totalTokens += tokens.total
          console.log(
            `File processed with ${modelType}. Tokens used: prompt=${tokens.prompt}, completion=${tokens.completion}, total=${tokens.total}`,
          )
        } catch (error) {
          console.error("Failed to process uploaded file:", error)
          errorMessage = `Error processing uploaded file: ${error.message}`
        }
      } else if (manualUrl) {
        console.log(`Processing image from URL with ${modelType}: ${manualUrl}`)
        try {
          let result
          if (modelType === "gemini") {
            result = await getLabelFromImageUrlWithGemini(manualUrl, prompt)
          } else {
            result = await getLabelFromImageUrlWithGPT(manualUrl, prompt)
          }
          results.push(result)
          processedCount++
          const tokens = result.tokens || { prompt: 0, completion: 0, total: 0 }
          promptTokens += tokens.prompt
          completionTokens += tokens.completion
          totalTokens += tokens.total
          console.log(
            `URL image processed with ${modelType}. Tokens used: prompt=${tokens.prompt}, completion=${tokens.completion}, total=${tokens.total}`,
          )
        } catch (error) {
          console.error("Failed to process image URL:", error)
          errorMessage = `Error processing image URL: ${error.message}`
        }
      } else {
        errorMessage = "No image file or URL provided for manual input"
        console.warn(errorMessage)
      }

      const totalFetched = manualFile || manualUrl ? 1 : 0
      const totalCount = totalFetched

      console.log(`Analysis complete. Total images processed: ${processedCount}/${totalFetched}`)
      console.log(`Total tokens used: ${totalTokens} (Prompt: ${promptTokens}, Completion: ${completionTokens})`)

      return await makeSerializable({
        results,
        totalFetched,
        processedCount,
        promptTokens,
        completionTokens,
        totalTokens,
        totalCount,
        currentPage: 1,
        totalPages: 1,
        error: errorMessage,
        modelUsed: modelType,
      })
    } else {
      // For ScoutAI, we now use the two-step process
      return { error: "Please use the new two-step process for ScoutAI images" }
    }
  } catch (error) {
    console.error("Unhandled error in analyzeImages:", error)
    return {
      error: `An unexpected error occurred: ${error.message || "Unknown error"}`,
      results: [],
    }
  }
}
