"use server"

import { OpenAI } from "openai"
import { GoogleGenerativeAI } from "@google/generative-ai"

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Initialize Google Generative AI client
const googleAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "")

// Helper function to ensure objects are serializable
function makeSerializable(obj) {
  return JSON.parse(JSON.stringify(obj))
}

// Step 1: Fetch images from ScoutAI API
export async function fetchScoutAIImages(formData) {
  try {
    const env = formData.get("env") || "prod"
    const companyId = formData.get("company_id")
    const locationId = formData.get("location_id") || ""
    const taskId = formData.get("task_id")
    const date = formData.get("date")
    const limit = Number.parseInt(formData.get("limit")) || 5

    // Convert dashboard page (1-indexed) to API page (0-indexed)
    const dashboardPage = Number.parseInt(formData.get("page")) || 1
    const apiPage = Math.max(0, dashboardPage - 1) // Ensure we don't send negative values

    // Validate required parameters
    if (!companyId) {
      return { error: "Company ID is required" }
    }

    if (!taskId) {
      return { error: "Task ID is required" }
    }

    console.log(
      `ScoutAI parameters: env=${env}, companyId=${companyId}, locationId=${locationId}, taskId=${taskId}, date=${date}, limit=${limit}, dashboardPage=${dashboardPage}, apiPage=${apiPage}`,
    )

    const baseUrl = env === "prod" ? "https://api-app-prod.wobot.ai" : "https://api-app-staging.wobot.ai"
    const endpoint = `${baseUrl}/app/v1/scoutai/images/get/${limit}/${apiPage}`

    // Build query parameters
    const params = new URLSearchParams({
      company: companyId,
      date: date,
    })

    // Add task parameter (required)
    params.append("task", taskId)

    // Add location parameter (even if empty)
    params.append("location", locationId)

    // Construct the full URL for logging
    const fullUrl = `${endpoint}?${params.toString()}`

    // Create curl command for display on frontend
    const curlCommand = `curl -X GET "${fullUrl}" -H "secret: wobotScoutAIImages"`

    console.log("=== SCOUT AI API REQUEST ===")
    console.log(`URL: ${fullUrl}`)
    console.log(`Headers: { secret: "wobotScoutAIImages" }`)
    console.log(`Curl: ${curlCommand}`)

    const response = await fetch(fullUrl, {
      headers: {
        secret: "wobotScoutAIImages",
      },
    })

    console.log("=== SCOUT AI API RESPONSE ===")
    console.log(`Status: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Error response body: ${errorText}`)
      throw new Error(`Failed to fetch images: ${response.status} - ${errorText}`)
    }

    const responseData = await response.json()

    // Log the complete response structure
    console.log("Response structure:", JSON.stringify(responseData, null, 2))

    // Extract images array from the nested data.data structure
    const images = responseData.data?.data || []

    // Extract pagination info from the nested structure
    const totalCount = responseData.data?.total || 0
    const apiTotalPages = responseData.data?.totalPages || 1

    // Convert dashboard page (1-indexed) to API page (0-indexed)
    const currentApiPage = responseData.data?.page || apiPage
    const currentDashboardPage = currentApiPage + 1

    // Total pages should also be adjusted if API is 0-indexed
    const dashboardTotalPages = apiTotalPages

    console.log(
      `Images returned: ${images.length} of ${totalCount} total (API page ${currentApiPage}, dashboard page ${currentDashboardPage} of ${dashboardTotalPages})`,
    )

    if (images.length === 0) {
      console.warn("⚠️ API returned zero images. Check if this is expected.")
      if (responseData.message) {
        console.log(`API message: ${responseData.message}`)
      }
    } else {
      console.log("First image URL:", images[0])
    }

    // Ensure the response is serializable
    const serializedResponse = {
      status: responseData.status,
      message: responseData.message || "",
      data: {
        page: currentApiPage,
        dashboardPage: currentDashboardPage,
        limit: responseData.data?.limit || limit,
        totalPages: apiTotalPages,
        dashboardTotalPages: dashboardTotalPages,
        total: responseData.data?.total || 0,
        hasNextPage: responseData.data?.hasNextPage || false,
        data: images,
      },
    }

    // Create image objects with status and serial number
    const imageObjects = images.map((url, index) => ({
      image: url,
      processed: false,
      label: null,
      tokens: null,
      error: null,
      serialNumber: currentApiPage * limit + index + 1, // Calculate global serial number
    }))

    return makeSerializable({
      images: imageObjects,
      totalCount,
      currentPage: currentDashboardPage,
      totalPages: dashboardTotalPages,
      apiPage: currentApiPage,
      apiCall: fullUrl,
      curlCommand: curlCommand,
      apiResponse: serializedResponse,
    })
  } catch (error) {
    console.error("=== SCOUT AI API ERROR ===")
    console.error(error)
    return {
      error: error.message || "Unknown error fetching images",
      images: [],
      totalCount: 0,
      currentPage: 1,
      totalPages: 0,
    }
  }
}

// Step 2: Process images with selected AI model
export async function processImagesWithGPT(images, prompt, selectedImageIndices = null, modelType = "gpt") {
  try {
    // If selectedImageIndices is provided and not empty, filter images to process only selected ones
    const imagesToProcess =
      selectedImageIndices && selectedImageIndices.length > 0
        ? selectedImageIndices.map((index) => images[index])
        : images

    console.log(
      `Starting ${modelType.toUpperCase()} processing for ${imagesToProcess.length} images with prompt: ${prompt}`,
    )
    console.log(
      selectedImageIndices && selectedImageIndices.length > 0
        ? `Processing ${selectedImageIndices.length} selected images`
        : `Processing all ${images.length} images`,
    )

    const results = []
    let processedCount = 0
    let promptTokens = 0
    let completionTokens = 0
    let totalTokens = 0
    let errorCount = 0

    // Create a map to track which images have been processed
    const processedMap = new Map()

    // Process selected images sequentially
    for (let i = 0; i < imagesToProcess.length; i++) {
      const imageToProcess = imagesToProcess[i]
      const imageUrl = imageToProcess.image
      const originalIndex = images.findIndex((img) => img.image === imageUrl)

      console.log(
        `Processing image ${i + 1}/${imagesToProcess.length}: ${imageUrl} (Serial #${imageToProcess.serialNumber})`,
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
          `Image ${i + 1} processed with ${modelType}. Tokens used: prompt=${tokens.prompt}, completion=${tokens.completion}, total=${tokens.total}`,
        )
      } catch (error) {
        console.error(`Failed to process image ${i + 1}:`, error)

        // Add error information to the image object
        const errorImage = {
          ...imageToProcess,
          processed: true,
          label: `Error: ${error.message || "Failed to process image"}`,
          error: true,
          modelUsed: modelType,
        }

        // Mark this image as processed (with error) in our map
        processedMap.set(imageUrl, errorImage)

        errorCount++
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

    return makeSerializable({
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
      error: `An unexpected error occurred: ${error.message || "Unknown error"}`,
      results: [],
    }
  }
}

// Helper function to process a single image URL with OpenAI GPT
async function getLabelFromImageUrlWithGPT(imageUrl, prompt) {
  try {
    console.log(`Fetching image from URL: ${imageUrl}`)
    const imgResponse = await fetch(imageUrl)

    if (!imgResponse.ok) {
      const errorText = await imgResponse.text()
      console.error(`Failed to fetch image (${imgResponse.status}): ${errorText}`)
      throw new Error(`Failed to fetch image: ${imgResponse.status}`)
    }

    const arrayBuffer = await imgResponse.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64Image = buffer.toString("base64")
    const imageDataUri = `data:image/jpeg;base64,${base64Image}`
    console.log("Image fetched and converted to base64 successfully")

    return await callGpt(prompt, imageDataUri, imageUrl)
  } catch (error) {
    console.error("Error processing image URL with GPT:", error)
    throw new Error(`Error fetching image: ${error.message || String(error)}`)
  }
}

// Helper function to process a single image URL with Google Gemini
async function getLabelFromImageUrlWithGemini(imageUrl, prompt) {
  try {
    console.log(`Fetching image from URL for Gemini: ${imageUrl}`)
    const imgResponse = await fetch(imageUrl)

    if (!imgResponse.ok) {
      const errorText = await imgResponse.text()
      console.error(`Failed to fetch image (${imgResponse.status}): ${errorText}`)
      throw new Error(`Failed to fetch image: ${imgResponse.status}`)
    }

    const arrayBuffer = await imgResponse.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64Image = buffer.toString("base64")
    console.log("Image fetched and converted to base64 successfully for Gemini")

    return await callGemini(prompt, base64Image, imageUrl)
  } catch (error) {
    console.error("Error processing image URL with Gemini:", error)
    throw new Error(`Error fetching image: ${error.message || String(error)}`)
  }
}

// Helper function to process an uploaded file
async function getLabelFromUploadedFile(file, prompt, modelType = "gpt") {
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

// Helper function to call GPT
async function callGpt(prompt, imageDataUri, imageSource) {
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
    throw new Error(`Error from GPT: ${error.message || String(error)}`)
  }
}

// Helper function to call Gemini
async function callGemini(prompt, base64Image, imageSource) {
  try {
    console.log(`Calling Gemini for image: ${imageSource.substring(0, 50)}...`)
    console.log(`Using prompt: ${prompt}`)

    // Check if API key is available
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error("Google API key is not configured")
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
    throw new Error(`Error from Gemini: ${error.message || String(error)}`)
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

      return makeSerializable({
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

// Add this function to fetch events from the Wobot API
export async function fetchEventsAPI(formData) {
  try {
    const apiKey = formData.get("api_key")
    const env = formData.get("events_env") || "production"
    const limit = Number.parseInt(formData.get("events_limit")) || 10
    const page = Number.parseInt(formData.get("events_page")) || 0
    const fromDate = formData.get("events_from_date")
    const toDate = formData.get("events_to_date")
    const locationId = formData.get("events_location") || ""
    const taskId = formData.get("events_task") || ""
    const cameraId = formData.get("events_camera") || ""

    // Validate required parameters
    if (!apiKey) {
      return { error: "API key is required" }
    }

    if (!fromDate || !toDate) {
      return { error: "From date and To date are required" }
    }

    if (!taskId) {
      return { error: "Task ID is required" }
    }

    console.log(
      `Events API parameters: env=${env}, limit=${limit}, page=${page}, fromDate=${fromDate}, toDate=${toDate}, locationId=${locationId}, taskId=${taskId}, cameraId=${cameraId}`,
    )

    const baseUrl = env === "production" ? "https://api.wobot.ai" : "https://api-staging.wobot.ai"
    const endpoint = `${baseUrl}/client/v2/events/get/${limit}/${page}`

    // Build query parameters
    const params = new URLSearchParams({
      from: fromDate,
      to: toDate,
    })

    // Add optional parameters if provided
    if (locationId) {
      params.append("location", locationId)
    }

    if (taskId) {
      params.append("task", taskId)
    }

    if (cameraId) {
      params.append("camera", cameraId)
    }

    // Construct the full URL for logging
    const fullUrl = `${endpoint}?${params.toString()}`

    // Create curl command for display on frontend
    const curlCommand = `curl -X GET "${fullUrl}" -H "Authorization: Bearer ${apiKey}"`

    console.log("=== EVENTS API REQUEST ===")
    console.log(`URL: ${fullUrl}`)
    console.log(`Headers: { Authorization: "Bearer ${apiKey.substring(0, 5)}..." }`)
    console.log(`Curl: ${curlCommand.replace(apiKey, apiKey.substring(0, 5) + "...")}`)

    const response = await fetch(fullUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    console.log("=== EVENTS API RESPONSE ===")
    console.log(`Status: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Error response body: ${errorText}`)
      throw new Error(`Failed to fetch events: ${response.status} - ${errorText}`)
    }

    const responseData = await response.json()

    // Log the complete response structure
    console.log("Response structure:", JSON.stringify(responseData, null, 2))

    // Extract events array from the nested data.data structure
    const events = responseData.data?.data || []

    // Extract pagination info from the nested structure
    const totalCount = responseData.data?.total || 0
    const totalPages = responseData.data?.totalPages || 1
    const hasNextPage = responseData.data?.hasNextPage || false

    console.log(`Events returned: ${events.length} of ${totalCount} total (page ${page} of ${totalPages})`)

    if (events.length === 0) {
      console.warn("⚠️ API returned zero events. Check if this is expected.")
      if (responseData.message) {
        console.log(`API message: ${responseData.message}`)
      }
    }

    // Create image objects from events
    const imageObjects = events.map((event, index) => ({
      image: event.image,
      processed: false,
      label: null,
      tokens: null,
      error: null,
      serialNumber: page * limit + index + 1, // Calculate global serial number
      eventData: event, // Store the full event data for reference
    }))

    // Ensure the response is serializable
    const serializedResponse = {
      status: responseData.status,
      message: responseData.message || "",
      data: {
        page: page,
        limit: limit,
        totalPages: totalPages,
        total: totalCount,
        hasNextPage: hasNextPage,
        data: events,
      },
    }

    return makeSerializable({
      images: imageObjects,
      totalCount,
      currentPage: page + 1, // Convert to 1-indexed for display
      totalPages,
      apiPage: page,
      apiCall: fullUrl,
      curlCommand: curlCommand.replace(apiKey, apiKey.substring(0, 5) + "..."),
      apiResponse: serializedResponse,
    })
  } catch (error) {
    console.error("=== EVENTS API ERROR ===")
    console.error(error)
    return {
      error: error.message || "Unknown error fetching events",
      images: [],
      totalCount: 0,
      currentPage: 1,
      totalPages: 0,
    }
  }
}
