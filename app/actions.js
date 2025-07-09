"use server"

import { OpenAI } from "openai"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { logGeminiResponse } from "../lib/gemini-logger"

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
    // Extract form data
    const env = formData.get("env") || "prod"
    const companyId = formData.get("company_id") || ""
    const taskId = formData.get("task_id") || ""
    const date = formData.get("date") || ""
    const limit = Number.parseInt(formData.get("limit")) || 10
    const page = Number.parseInt(formData.get("page")) || 1

    // Validate required fields
    if (!taskId) {
      throw new Error("Task ID is required")
    }

    if (!date) {
      throw new Error("Date is required")
    }

    // Build the API URL
    const baseUrl = env === "staging" ? "https://api-staging.wobot.ai" : "https://api.wobot.ai"
    let url = `${baseUrl}/scout/images?task=${taskId}&date=${date}&limit=${limit}&page=${page}`

    if (companyId) {
      url += `&company=${companyId}`
    }

    // Create curl command for debugging
    const curlCommand = `curl -X GET "${url}" -H "secret: wobotScoutAIImages"`

    const response = await fetch(url, {
      headers: {
        secret: "wobotScoutAIImages",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const responseData = await response.json()

    // Extract images from the response
    const images = responseData.data?.data || []

    // Calculate pagination
    const totalCount = responseData.data?.total || 0
    const totalPages = Math.ceil(totalCount / limit)

    if (images.length === 0) {
      // Return empty result with warning
      return {
        images: [],
        currentPage: page,
        totalPages: totalPages,
        totalCount: totalCount,
        apiCall: url,
        curlCommand: curlCommand,
        apiResponse: responseData,
        error: null,
      }
    }

    // Add serial numbers to images
    const imagesWithSerial = images.map((imageUrl, index) => ({
      image: imageUrl,
      serialNumber: (page - 1) * limit + index + 1,
    }))

    return {
      images: imagesWithSerial,
      currentPage: page,
      totalPages: totalPages,
      totalCount: totalCount,
      apiCall: url,
      curlCommand: curlCommand,
      apiResponse: responseData,
      error: null,
    }
  } catch (error) {
    return {
      images: [],
      currentPage: 1,
      totalPages: 1,
      totalCount: 0,
      apiCall: "",
      curlCommand: "",
      apiResponse: null,
      error: error.message,
    }
  }
}

// Step 2: Process images with selected AI model
export async function processImagesWithGPT(images, prompt, indicesToProcess = null, modelType = "gpt", batchSize = 10) {
  try {
    // Determine which images to process
    const imagesToProcess = indicesToProcess
      ? indicesToProcess.map((index) => ({ ...images[index], originalIndex: index }))
      : images.map((image, index) => ({ ...image, originalIndex: index }))

    const totalImages = imagesToProcess.length

    if (totalImages === 0) {
      return {
        results: [],
        processedCount: 0,
        errorCount: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        modelUsed: modelType,
      }
    }

    // Split images into batches
    const batches = []
    for (let i = 0; i < imagesToProcess.length; i += batchSize) {
      batches.push(imagesToProcess.slice(i, i + batchSize))
    }

    let allResults = []
    let totalPromptTokens = 0
    let totalCompletionTokens = 0
    let totalTokens = 0
    let processedCount = 0
    let errorCount = 0

    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]

      // Process all images in the current batch in parallel
      const batchPromises = batch.map(async (imageData, i) => {
        try {
          let result
          if (modelType === "gemini") {
            result = await processImageWithGemini(imageData.image, prompt)
          } else {
            result = await processImageWithGPT(imageData.image, prompt)
          }

          return {
            image: imageData.image,
            label: result.label,
            promptTokens: result.promptTokens || 0,
            completionTokens: result.completionTokens || 0,
            totalTokens: result.totalTokens || 0,
            modelUsed: modelType,
            processed: true,
            error: false,
            originalIndex: imageData.originalIndex,
          }
        } catch (error) {
          return {
            image: imageData.image,
            label: `Error: ${error.message}`,
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            modelUsed: modelType,
            processed: true,
            error: true,
            detailedError: error.message,
            originalIndex: imageData.originalIndex,
          }
        }
      })

      // Wait for all images in the batch to complete
      const batchResults = await Promise.all(batchPromises)

      // Accumulate results and tokens
      allResults = allResults.concat(batchResults)

      // Count successful and failed processing
      batchResults.forEach((result) => {
        if (result.error) {
          errorCount++
        } else {
          processedCount++
          totalPromptTokens += result.promptTokens || 0
          totalCompletionTokens += result.completionTokens || 0
          totalTokens += result.totalTokens || 0
        }
      })
    }

    return {
      results: allResults,
      processedCount,
      errorCount,
      promptTokens: totalPromptTokens,
      completionTokens: totalCompletionTokens,
      totalTokens: totalTokens,
      modelUsed: modelType,
    }
  } catch (error) {
    return {
      error: error.message || "Unknown error processing images",
      results: [],
      processedCount: 0,
      errorCount: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      modelUsed: modelType,
    }
  }
}

// Helper function to process a single image with GPT
async function processImageWithGPT(imageUrl, prompt) {
  try {
    const response = await fetch(imageUrl)
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to fetch image (${response.status}): ${errorText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const base64Image = Buffer.from(arrayBuffer).toString("base64")

    return await callGPTWithImage(base64Image, prompt)
  } catch (error) {
    throw new Error(`Error processing image URL with GPT: ${error.message}`)
  }
}

// Helper function to process a single image with Gemini
async function processImageWithGemini(imageUrl, prompt) {
  try {
    const response = await fetch(imageUrl)
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to fetch image (${response.status}): ${errorText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const base64Image = Buffer.from(arrayBuffer).toString("base64")

    return await callGeminiWithImage(base64Image, prompt)
  } catch (error) {
    throw new Error(`Error processing image URL with Gemini: ${error.message}`)
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

// Legacy function for processing uploaded files (kept for backward compatibility)
async function processUploadedFile(file, prompt, modelType) {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const base64Image = Buffer.from(arrayBuffer).toString("base64")

    if (modelType === "gemini") {
      return await callGeminiWithImage(base64Image, prompt)
    } else {
      return await callGPTWithImage(base64Image, prompt)
    }
  } catch (error) {
    throw new Error(`Error processing uploaded file with ${modelType}: ${error.message}`)
  }
}

// Legacy GPT function (kept for backward compatibility)
async function callGpt(prompt, imageDataUri, imageSource) {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: imageDataUri,
                },
              },
            ],
          },
        ],
        max_tokens: 300,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const usage = data.usage || {}

    return {
      image: imageSource,
      label: data.choices[0]?.message?.content || "No response",
      tokens: {
        prompt: usage.prompt_tokens || 0,
        completion: usage.completion_tokens || 0,
        total: usage.total_tokens || 0,
      },
      processed: true,
      modelUsed: "gpt",
    }
  } catch (error) {
    throw new Error(`Error calling GPT: ${error.message}`)
  }
}

// Legacy Gemini function (kept for backward compatibility)
async function callGemini(prompt, base64Image, imageSource) {
  const startTime = Date.now()
  let geminiResponse = null
  let error = null

  try {
    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: base64Image,
              },
            },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: 300,
      },
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      },
    )

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    // Store complete response for logging
    geminiResponse = {
      ...data,
      requestBody: requestBody, // Include request body for context
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response"

    // Estimate tokens
    const estimatedPromptTokens = Math.ceil(prompt.length / 4) + 258
    const estimatedCompletionTokens = Math.ceil(text.length / 4)
    const totalTokens = estimatedPromptTokens + estimatedCompletionTokens

    const processingTime = Date.now() - startTime

    // Log the complete response
    logGeminiResponse({
      prompt,
      imageSource,
      response: geminiResponse,
      metadata: {
        model: "gemini-1.5-flash",
        processingTime,
        estimatedTokens: {
          prompt: estimatedPromptTokens,
          completion: estimatedCompletionTokens,
          total: totalTokens,
        },
        imageSize: base64Image ? base64Image.length : 0,
        maxOutputTokens: 300,
        legacy: true, // Mark as legacy function
      },
    })

    return {
      image: imageSource,
      label: text,
      tokens: {
        prompt: estimatedPromptTokens,
        completion: estimatedCompletionTokens,
        total: totalTokens,
      },
      processed: true,
      modelUsed: "gemini",
    }
  } catch (err) {
    error = err
    const processingTime = Date.now() - startTime

    // Log the error response
    logGeminiResponse({
      prompt,
      imageSource,
      response: null,
      metadata: {
        model: "gemini-1.5-flash",
        processingTime,
        imageSize: base64Image ? base64Image.length : 0,
        legacy: true, // Mark as legacy function
      },
      error: err,
    })

    throw new Error(`Error calling Gemini: ${err.message}`)
  }
}

// Function to call OpenAI GPT with image
async function callGPTWithImage(base64Image, prompt) {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 300,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const usage = data.usage || {}

    return {
      label: data.choices[0]?.message?.content || "No response",
      promptTokens: usage.prompt_tokens || 0,
      completionTokens: usage.completion_tokens || 0,
      totalTokens: usage.total_tokens || 0,
    }
  } catch (error) {
    throw new Error(`Error calling GPT: ${error.message}`)
  }
}

// Function to call Google Gemini with image
async function callGeminiWithImage(base64Image, prompt) {
  const startTime = Date.now()
  let geminiResponse = null
  let error = null

  try {
    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: base64Image,
              },
            },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: 300,
      },
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      },
    )

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    // Store complete response for logging
    geminiResponse = {
      ...data,
      requestBody: requestBody, // Include request body for context
    }

    // Extract the text from Gemini response
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response"

    // Estimate tokens (Gemini doesn't provide exact token counts in the response)
    const estimatedPromptTokens = Math.ceil(prompt.length / 4) + 258 // ~258 tokens for image
    const estimatedCompletionTokens = Math.ceil(text.length / 4)
    const totalTokens = estimatedPromptTokens + estimatedCompletionTokens

    const processingTime = Date.now() - startTime

    // Log the complete response
    logGeminiResponse({
      prompt,
      imageSource: "base64_image_data",
      response: geminiResponse,
      metadata: {
        model: "gemini-1.5-flash",
        processingTime,
        estimatedTokens: {
          prompt: estimatedPromptTokens,
          completion: estimatedCompletionTokens,
          total: totalTokens,
        },
        imageSize: base64Image ? base64Image.length : 0,
        maxOutputTokens: 300,
      },
    })

    return {
      label: text,
      promptTokens: estimatedPromptTokens,
      completionTokens: estimatedCompletionTokens,
      totalTokens: totalTokens,
    }
  } catch (err) {
    error = err
    const processingTime = Date.now() - startTime

    // Log the error response
    logGeminiResponse({
      prompt,
      imageSource: "base64_image_data",
      response: null,
      metadata: {
        model: "gemini-1.5-flash",
        processingTime,
        imageSize: base64Image ? base64Image.length : 0,
      },
      error: err,
    })

    throw new Error(`Error calling Gemini: ${err.message}`)
  }
}

// Legacy function for manual image uploads (kept for backward compatibility)
export async function analyzeImages_DEPRECATED(formData) {
  try {
    const inputType = formData.get("input_type")
    const prompt = formData.get("prompt")
    const modelType = formData.get("model_type") || "gpt"

    if (!prompt) {
      throw new Error("Prompt is required")
    }

    let results = []
    let totalFetched = 0
    let processedCount = 0
    let promptTokens = 0
    let completionTokens = 0
    let totalTokens = 0

    if (inputType === "manual") {
      // Handle manual file upload
      const manualFile = formData.get("manual_image")
      const manualUrl = formData.get("manual_url")

      if (manualFile && manualFile.size > 0) {
        // Process uploaded file
        try {
          const result = await processUploadedFile(manualFile, prompt, modelType)

          results.push({
            image: manualFile.name,
            label: result.label,
            promptTokens: result.promptTokens || 0,
            completionTokens: result.completionTokens || 0,
            totalTokens: result.totalTokens || 0,
            modelUsed: modelType,
            processed: true,
            isUploadedFile: true,
          })

          totalFetched = 1
          processedCount = 1
          promptTokens = result.promptTokens || 0
          completionTokens = result.completionTokens || 0
          totalTokens = result.totalTokens || 0
        } catch (error) {
          results.push({
            image: manualFile.name,
            label: `Error: ${error.message}`,
            error: true,
            detailedError: error.message,
            modelUsed: modelType,
            processed: true,
            isUploadedFile: true,
          })
          totalFetched = 1
        }
      } else if (manualUrl) {
        // Process image from URL
        try {
          let result
          if (modelType === "gemini") {
            result = await processImageWithGemini(manualUrl, prompt)
          } else {
            result = await processImageWithGPT(manualUrl, prompt)
          }

          results.push({
            image: manualUrl,
            label: result.label,
            promptTokens: result.promptTokens || 0,
            completionTokens: result.completionTokens || 0,
            totalTokens: result.totalTokens || 0,
            modelUsed: modelType,
            processed: true,
          })

          totalFetched = 1
          processedCount = 1
          promptTokens = result.promptTokens || 0
          completionTokens = result.completionTokens || 0
          totalTokens = result.totalTokens || 0
        } catch (error) {
          results.push({
            image: manualUrl,
            label: `Error: ${error.message}`,
            error: true,
            detailedError: error.message,
            modelUsed: modelType,
            processed: true,
          })
          totalFetched = 1
        }
      } else {
        const errorMessage = "Please provide either an image file or image URL"
        results.push({
          image: "No image provided",
          label: errorMessage,
          error: true,
          modelUsed: modelType,
          processed: true,
        })
        totalFetched = 1
      }
    }

    return {
      results,
      totalFetched,
      processedCount,
      promptTokens,
      completionTokens,
      totalTokens,
      modelUsed: modelType,
    }
  } catch (error) {
    return {
      error: error.message || "Unknown error analyzing images",
      results: [],
      totalFetched: 0,
      processedCount: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      modelUsed: "gpt",
    }
  }
}

// Add this function to fetch events from the Wobot API
export async function fetchEventsAPI(formData) {
  try {
    // Extract form data
    const apiKey = formData.get("api_key")
    const environment = formData.get("events_env") || "production"
    const limit = Number.parseInt(formData.get("events_limit")) || 10
    const page = Number.parseInt(formData.get("events_page")) || 0
    const fromDate = formData.get("events_from_date")
    const toDate = formData.get("events_to_date")
    const locationId = formData.get("events_location") || ""
    const taskId = formData.get("events_task") || ""
    const cameraId = formData.get("events_camera") || ""

    // Validate required fields
    if (!apiKey) {
      throw new Error("API key is required")
    }

    if (!fromDate || !toDate) {
      throw new Error("From date and to date are required")
    }

    // Build the API URL
    const baseUrl = environment === "production" 
      ? "https://api.wobot.ai/client/v2" 
      : "https://api-staging.wobot.ai/client/v2"
    
    let queryParams = `?from=${fromDate}&to=${toDate}`
    
    if (locationId) {
      queryParams += `&location=${locationId}`
    }
    
    if (taskId) {
      queryParams += `&task=${taskId}`
    }
    
    if (cameraId) {
      queryParams += `&camera=${cameraId}`
    }

    const fullUrl = `${baseUrl}/events/get/${limit}/${page}${queryParams}`

    // Create curl command for debugging
    const curlCommand = `curl -X GET "${fullUrl}" -H "Authorization: Bearer ${apiKey}"`

    const response = await fetch(fullUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const responseData = await response.json()

    // Extract events from the response
    const events = responseData.data?.data || []
    const totalCount = responseData.data?.total || 0
    const totalPages = Math.ceil(totalCount / limit)

    // Transform events into image objects for the UI
    const images = events.map((event, index) => ({
      image: event.image || "",
      serialNumber: page * limit + index + 1,
      eventData: event,
    }))

    return {
      images,
      currentPage: page + 1, // Convert to 1-indexed for UI
      totalPages: Math.max(1, totalPages),
      totalCount,
      apiCall: fullUrl,
      curlCommand,
      apiResponse: responseData,
      error: null,
    }
  } catch (error) {
    return {
      images: [],
      currentPage: 1,
      totalPages: 1,
      totalCount: 0,
      apiCall: "",
      curlCommand: "",
      apiResponse: null,
      error: error.message,
    }
  }
}

// Add this function to fetch DriveThru data from the Wobot API
export async function fetchDriveThruAPI(formData) {
  try {
    // Extract and validate form data
    const apiKey = formData.get("api_key")
    const environment = formData.get("drivethru_env") || "production"
    const driveThruType = formData.get("drivethru_type") || "detections"
    const limit = Number.parseInt(formData.get("drivethru_limit")) || 10
    const page = Number.parseInt(formData.get("drivethru_page")) || 0
    const fromDate = formData.get("drivethru_from_date")
    const toDate = formData.get("drivethru_to_date")
    const locationId = formData.get("drivethru_location") || ""
    const taskId = formData.get("drivethru_task") || ""
    const cameraId = formData.get("drivethru_camera") || ""

    // Validate required fields
    if (!apiKey?.trim()) {
      throw new Error("API key is required")
    }

    if (!fromDate || !toDate) {
      throw new Error("From date and to date are required")
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(fromDate) || !dateRegex.test(toDate)) {
      throw new Error("Invalid date format. Use YYYY-MM-DD")
    }

    // Build the API URL
    const baseUrl = environment === "production" ? "https://api.wobot.ai" : "https://api-staging.wobot.ai"
    const apiType = driveThruType === "journey" ? "journey" : "detections"
    
    let queryParams = `?from=${fromDate}&to=${toDate}`
    
    if (locationId) {
      queryParams += `&location=${locationId}`
    }
    
    if (taskId) {
      queryParams += `&task=${taskId}`
    }
    
    if (cameraId) {
      queryParams += `&camera=${cameraId}`
    }

    const fullUrl = `${baseUrl}/client/v2/drivethru/${apiType}/get/${limit}/${page}${queryParams}`

    // Create curl command for debugging
    const curlCommand = `curl -X GET "${fullUrl}" -H "Authorization: Bearer ${apiKey}"`

    const response = await fetch(fullUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const responseData = await response.json()

    // Handle different response structures
    let driveThruData = []
    let totalCount = 0
    
    if (responseData.status === 200) {
      if (apiType === "journey") {
        // Journey API returns journeys with multiple images per journey
        const journeys = responseData.data?.data || []
        totalCount = responseData.data?.total || 0
        
        // Flatten journey images into individual image objects
        journeys.forEach((journey, journeyIndex) => {
          const images = journey.images || []
          images.forEach((imageData, imageIndex) => {
            driveThruData.push({
              image: imageData.image || "",
              serialNumber: page * limit + driveThruData.length + 1,
              eventData: {
                ...imageData,
                journeyId: journey._id,
                journey: journey._id,
                lp: journey.lp || "",
                lpr: journey.lpr || "",
                metadata: journey.metadata || {},
                imageType: imageData.type || "unknown",
                stationData: imageData.stationData || {},
              },
            })
          })
        })
      } else {
        // Detections API returns individual detections
        const detections = responseData.data?.data || []
        totalCount = responseData.data?.total || 0
        
        driveThruData = detections.map((detection, index) => ({
          image: detection.image || "",
          serialNumber: page * limit + index + 1,
          eventData: detection,
        }))
      }
    }

    const totalPages = Math.ceil(totalCount / limit)

    return {
      images: driveThruData,
      currentPage: page + 1, // Convert to 1-indexed for UI
      totalPages: Math.max(1, totalPages),
      totalCount,
      apiCall: fullUrl,
      curlCommand,
      apiResponse: responseData,
      error: null,
    }
  } catch (error) {
    return {
      images: [],
      currentPage: 1,
      totalPages: 1,
      totalCount: 0,
      apiCall: "",
      curlCommand: "",
      apiResponse: null,
      error: error.message,
    }
  }
}
