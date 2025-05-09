"use server"

import { OpenAI } from "openai"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { makeSerializable } from "./utils"

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Initialize Google Generative AI client
const googleAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "")

// Step 2: Process images with selected AI model
export async function processImagesWithGPT(
  images,
  prompt,
  selectedImageIndices = null,
  modelType = "gpt",
  batchSize = 10,
) {
  try {
    // If selectedImageIndices is provided and not empty, filter images to process only selected ones
    const imagesToProcess =
      selectedImageIndices && selectedImageIndices.length > 0
        ? selectedImageIndices.map((index) => images[index])
        : images

    console.log(
      `Starting ${modelType.toUpperCase()} processing for ${imagesToProcess.length} images with prompt: ${prompt}`,
    )

    // Add batch processing logic
    const BATCH_SIZE = batchSize // Use the provided batch size
    const batches = []

    // Split images into batches
    for (let i = 0; i < imagesToProcess.length; i += BATCH_SIZE) {
      batches.push(imagesToProcess.slice(i, i + BATCH_SIZE))
    }

    console.log(`Split processing into ${batches.length} batches of up to ${BATCH_SIZE} images each`)

    const results = []
    let processedCount = 0
    let promptTokens = 0
    let completionTokens = 0
    let totalTokens = 0
    let errorCount = 0

    // Create a map to track which images have been processed
    const processedMap = new Map()

    // Process batches sequentially
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      console.log(`Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} images`)

      // Process images in the current batch
      for (let i = 0; i < batch.length; i++) {
        const imageToProcess = batch[i]
        const imageUrl = imageToProcess.image
        const originalIndex = images.findIndex((img) => img.image === imageUrl)

        console.log(
          `Processing image ${i + 1}/${batch.length} in batch ${batchIndex + 1}: ${imageUrl} (Serial #${imageToProcess.serialNumber})`,
        )

        try {
          // Call the appropriate AI model based on modelType
          let result
          if (modelType === "gemini") {
            result = await getLabelFromImageUrlWithGemini(imageUrl, prompt)
          } else {
            result = await getLabelFromImageUrlWithGPT(imageUrl, prompt)
          }

          // Update the image object with results
          const processedImage = {
            ...imageToProcess,
            processed: true,
            label: result.label,
            tokens: result.tokens,
            modelUsed: modelType,
          }

          // Mark this image as processed in our map
          processedMap.set(imageUrl, processedImage)

          processedCount++

          // Update tokens
          const tokens = result.tokens || { prompt: 0, completion: 0, total: 0 }
          promptTokens += tokens.prompt
          completionTokens += tokens.completion
          totalTokens += tokens.total

          console.log(
            `Image ${i + 1} in batch ${batchIndex + 1} processed with ${modelType}. Tokens used: prompt=${tokens.prompt}, completion=${tokens.completion}, total=${tokens.total}`,
          )
        } catch (error) {
          console.error(`Failed to process image ${i + 1} in batch ${batchIndex + 1}:`, error)

          // Add error information to the image object
          const errorImage = {
            ...imageToProcess,
            processed: true,
            label: `Something went wrong. Please try again.`,
            error: true,
            modelUsed: modelType,
            // Store the detailed error message in a separate property that will only be used in dev mode
            detailedError: error.message || String(error),
          }

          // Mark this image as processed (with error) in our map
          processedMap.set(imageUrl, errorImage)

          errorCount++
        }
      }
    }

    // Create the final results array, preserving the original order
    // For each image in the original array, either use the processed version or keep as is
    const finalResults = images.map((img) => {
      if (processedMap.has(img.image)) {
        return processedMap.get(img.image)
      }
      return img
    })

    console.log(`Processing complete. ${processedCount} images processed successfully, ${errorCount} errors.`)
    console.log(`Total tokens used: ${totalTokens} (Prompt: ${promptTokens}, Completion: ${completionTokens})`)

    return await makeSerializable({
      results: finalResults,
      processedCount,
      errorCount,
      promptTokens,
      completionTokens,
      totalTokens,
      modelUsed: modelType,
    })
  } catch (error) {
    console.error("Unhandled error in processImagesWithGPT:", error)
    return {
      error: `An unexpected error occurred. Please try again.`,
      results: [],
    }
  }
}

// Helper function to process a single image URL with OpenAI GPT
export async function getLabelFromImageUrlWithGPT(imageUrl, prompt) {
  try {
    console.log(`Fetching image from URL: ${imageUrl}`)
    const imgResponse = await fetch(imageUrl)

    if (!imgResponse.ok) {
      const errorText = await imgResponse.text()
      console.error(`Failed to fetch image (${imgResponse.status}): ${errorText}`)
      throw new Error(`Something went wrong. Please try again.`)
    }

    const arrayBuffer = await imgResponse.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64Image = buffer.toString("base64")
    const imageDataUri = `data:image/jpeg;base64,${base64Image}`
    console.log("Image fetched and converted to base64 successfully")

    return await callGpt(prompt, imageDataUri, imageUrl)
  } catch (error) {
    console.error("Error processing image URL with GPT:", error)
    throw new Error(`Something went wrong. Please try again.`)
  }
}

// Helper function to process a single image URL with Google Gemini
export async function getLabelFromImageUrlWithGemini(imageUrl, prompt) {
  try {
    console.log(`Fetching image from URL for Gemini: ${imageUrl}`)
    const imgResponse = await fetch(imageUrl)

    if (!imgResponse.ok) {
      const errorText = await imgResponse.text()
      console.error(`Failed to fetch image (${imgResponse.status}): ${errorText}`)
      throw new Error(`Something went wrong. Please try again.`)
    }

    const arrayBuffer = await imgResponse.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64Image = buffer.toString("base64")
    console.log("Image fetched and converted to base64 successfully for Gemini")

    return await callGemini(prompt, base64Image, imageUrl)
  } catch (error) {
    console.error("Error processing image URL with Gemini:", error)
    throw new Error(`Something went wrong. Please try again.`)
  }
}

// Helper function to call GPT
export async function callGpt(prompt, imageDataUri, imageSource) {
  try {
    console.log(`Calling GPT for image: ${imageSource.substring(0, 50)}...`)
    console.log(`Using prompt: ${prompt}`)

    // Ensure we're using gpt-4.1-mini model
    const chatResponse = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a visual analysis assistant examining images from a restaurant or food service environment.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageDataUri } },
          ],
        },
      ],
      max_tokens: 1000,
    })

    const usage = chatResponse.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    console.log(`GPT response received. Tokens: ${usage.total_tokens}`)

    return {
      image: imageSource,
      label: chatResponse.choices[0].message.content || "No response",
      tokens: {
        prompt: usage.prompt_tokens,
        completion: usage.completion_tokens,
        total: usage.total_tokens,
      },
    }
  } catch (error) {
    console.error("Error calling GPT:", error)
    throw new Error(`Something went wrong. Please try again.`)
  }
}

// Helper function to call Gemini
export async function callGemini(prompt, base64Image, imageSource) {
  try {
    console.log(`Calling Gemini for image: ${imageSource.substring(0, 50)}...`)
    console.log(`Using prompt: ${prompt}`)

    // Check if API key is available
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error("Something went wrong. Please try again.")
    }

    // Get the Gemini model
    const model = googleAI.getGenerativeModel({
      model: "gemini-2.5-flash-preview-04-17",
    })

    // Prepare the content parts
    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: "image/jpeg",
      },
    }

    // Create the system prompt and user prompt
    const systemPrompt =
      "You are a visual analysis assistant examining images from a restaurant or food service environment."
    const fullPrompt = `${systemPrompt}\n\n${prompt}`

    // Generate content with the image
    const result = await model.generateContent([fullPrompt, imagePart])

    const response = await result.response
    const text = response.text()

    // Estimate token usage (Gemini doesn't provide token counts directly)
    // This is a rough estimate based on characters
    const promptChars = fullPrompt.length + 1000 // Add 1000 for image (very rough estimate)
    const completionChars = text.length

    // Estimate tokens (roughly 4 chars per token)
    const promptTokens = Math.ceil(promptChars / 4)
    const completionTokens = Math.ceil(completionChars / 4)
    const totalTokens = promptTokens + completionTokens

    console.log(`Gemini response received. Estimated tokens: ${totalTokens}`)

    return {
      image: imageSource,
      label: text || "No response",
      tokens: {
        prompt: promptTokens,
        completion: completionTokens,
        total: totalTokens,
      },
    }
  } catch (error) {
    console.error("Error calling Gemini:", error)
    // Always throw a generic error message to avoid exposing API details
    throw new Error(`Something went wrong. Please try again.`)
  }
}
