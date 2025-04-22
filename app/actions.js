"use server"

import { OpenAI } from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Updated fetchImages function to support pagination and task_id
async function fetchImages(env, companyId, locationId, date, taskId, limit, page) {
  const baseUrl = env === "prod" ? "https://api-app-prod.wobot.ai" : "https://api-app-staging.wobot.ai"

  // Updated endpoint to match the provided URL structure
  // The pagination format is /get/{limit}/{page}
  const endpoint = `${baseUrl}/app/v1/scoutai/images/get/${limit}/${page}`

  // Build query parameters
  const params = new URLSearchParams({
    company: companyId,
    date: date,
  })

  // Add task parameter (required)
  params.append("task", taskId)

  // Add location parameter (even if empty)
  params.append("location", locationId || "")

  // Construct the full URL for logging
  const fullUrl = `${endpoint}?${params.toString()}`

  // Create curl command for display
  const curlCommand = `curl -X GET "${fullUrl}" -H "secret: wobotScoutAIImages"`

  try {
    console.log(`API Call: ${fullUrl}`)
    console.log(`Headers: { secret: "wobotScoutAIImages" }`)
    console.log(`Curl command: ${curlCommand}`)

    const response = await fetch(fullUrl, {
      headers: {
        secret: "wobotScoutAIImages",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Failed to fetch images: ${response.status}`, errorText)
      throw new Error(`Failed to fetch images: ${response.status} - ${errorText}`)
    }

    const data = await response.json()

    // Log the full response
    console.log("API Response:", JSON.stringify(data, null, 2))

    const images = data.data || []
    const totalCount = data.total || images.length
    console.log(
      `Successfully fetched ${images.length} images from ScoutAI API (page ${page} of ${Math.ceil(totalCount / limit)}, total: ${totalCount})`,
    )

    return {
      images,
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      apiCall: fullUrl,
      curlCommand: curlCommand, // Return the curl command for display
    }
  } catch (error) {
    console.error("Error fetching images:", error)
    return {
      images: [],
      totalCount: 0,
      currentPage: page,
      totalPages: 0,
      apiCall: `${endpoint}?${params.toString()}`,
      curlCommand: curlCommand,
    }
  }
}

// Update the analyzeImages function to handle pagination and return the API call
export async function analyzeImages(formData, progressCallback) {
  const prompt = formData.get("prompt")
  const inputType = formData.get("input_type")

  console.log(`Starting image analysis with input type: ${inputType}`)
  console.log(`Prompt: ${prompt}`)

  const results = []
  let totalFetched = 0
  let processedCount = 0
  let promptTokens = 0
  let completionTokens = 0
  let totalTokens = 0
  let totalCount = 0
  let currentPage = 1
  let totalPages = 1
  let apiCall = ""
  let curlCommand = ""

  if (inputType === "scoutai") {
    const env = formData.get("env")
    const companyId = formData.get("company_id")
    const locationId = formData.get("location_id")
    const taskId = formData.get("task_id") // Now required
    const date = formData.get("date")
    const limit = Number.parseInt(formData.get("limit")) || 5
    const page = Number.parseInt(formData.get("page")) || 1

    console.log(
      `ScoutAI parameters: env=${env}, companyId=${companyId}, locationId=${locationId}, taskId=${taskId}, date=${date}, limit=${limit}, page=${page}`,
    )

    const fetchResult = await fetchImages(env, companyId, locationId, date, taskId, limit, page)
    const images = fetchResult.images
    totalFetched = images.length
    totalCount = fetchResult.totalCount
    currentPage = fetchResult.currentPage
    totalPages = fetchResult.totalPages
    apiCall = fetchResult.apiCall
    curlCommand = fetchResult.curlCommand

    if (totalFetched === 0) {
      console.warn("No images were fetched from the ScoutAI API")
    } else {
      console.log(
        `Total images fetched: ${totalFetched} (page ${currentPage} of ${totalPages}, total available: ${totalCount})`,
      )
    }

    processedCount = totalFetched

    console.log(`Processing ${processedCount} images from page ${currentPage}`)

    // Process images sequentially to update progress
    for (let i = 0; i < images.length; i++) {
      const imageUrl = images[i]
      console.log(`Processing image ${i + 1}/${images.length}: ${imageUrl}`)

      const result = await getLabelFromImageUrl(imageUrl, prompt)
      results.push(result)

      // Update tokens
      const tokens = result.tokens || { prompt: 0, completion: 0, total: 0 }
      promptTokens += tokens.prompt
      completionTokens += tokens.completion
      totalTokens += tokens.total

      console.log(
        `Image ${i + 1} processed. Tokens used: prompt=${tokens.prompt}, completion=${tokens.completion}, total=${tokens.total}`,
      )

      // Update progress
      if (progressCallback) {
        progressCallback(i + 1, images.length)
      }
    }
  } else {
    // Handle manual image upload or URL
    const manualFile = formData.get("manual_image")
    const manualUrl = formData.get("manual_url")

    if (manualFile && manualFile.size > 0) {
      console.log(`Processing uploaded file: ${manualFile.name}, size: ${manualFile.size} bytes`)
      const result = await getLabelFromUploadedFile(manualFile, prompt)
      results.push(result)
      const tokens = result.tokens || { prompt: 0, completion: 0, total: 0 }
      promptTokens += tokens.prompt
      completionTokens += tokens.completion
      totalTokens += tokens.total
      console.log(
        `File processed. Tokens used: prompt=${tokens.prompt}, completion=${tokens.completion}, total=${tokens.total}`,
      )
    } else if (manualUrl) {
      console.log(`Processing image from URL: ${manualUrl}`)
      const result = await getLabelFromImageUrl(manualUrl, prompt)
      results.push(result)
      const tokens = result.tokens || { prompt: 0, completion: 0, total: 0 }
      promptTokens += tokens.prompt
      completionTokens += tokens.completion
      totalTokens += tokens.total
      console.log(
        `URL image processed. Tokens used: prompt=${tokens.prompt}, completion=${tokens.completion}, total=${tokens.total}`,
      )
    } else {
      console.warn("No image file or URL provided for manual input")
    }

    processedCount = results.length
    totalFetched = processedCount
    totalCount = processedCount

    if (progressCallback) {
      progressCallback(1, 1)
    }
  }

  console.log(`Analysis complete. Total images processed: ${processedCount}/${totalFetched}`)
  console.log(`Total tokens used: ${totalTokens} (Prompt: ${promptTokens}, Completion: ${completionTokens})`)

  return {
    results,
    totalFetched,
    processedCount,
    promptTokens,
    completionTokens,
    totalTokens,
    totalCount,
    currentPage,
    totalPages,
    apiCall,
    curlCommand,
  }
}

async function getLabelFromImageUrl(imageUrl, prompt) {
  try {
    const imgResponse = await fetch(imageUrl)
    if (!imgResponse.ok) {
      throw new Error(`Failed to fetch image: ${imgResponse.status}`)
    }

    const arrayBuffer = await imgResponse.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64Image = buffer.toString("base64")
    const imageDataUri = `data:image/jpeg;base64,${base64Image}`

    return await callGpt(prompt, imageDataUri, imageUrl)
  } catch (error) {
    console.error("Error processing image URL:", error)
    return {
      image: imageUrl,
      label: `Error fetching image: ${error instanceof Error ? error.message : String(error)}`,
      tokens: { prompt: 0, completion: 0, total: 0 },
    }
  }
}

async function getLabelFromUploadedFile(file, prompt) {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64Image = buffer.toString("base64")
    const imageDataUri = `data:image/jpeg;base64,${base64Image}`

    return await callGpt(prompt, imageDataUri, "Uploaded Image")
  } catch (error) {
    console.error("Error processing uploaded file:", error)
    return {
      image: "Uploaded Image",
      label: `Error reading upload: ${error instanceof Error ? error.message : String(error)}`,
      tokens: { prompt: 0, completion: 0, total: 0 },
    }
  }
}

async function callGpt(prompt, imageDataUri, imageSource) {
  try {
    const chatResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
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
    return {
      image: imageSource,
      label: `Error from GPT: ${error instanceof Error ? error.message : String(error)}`,
      tokens: { prompt: 0, completion: 0, total: 0 },
    }
  }
}
