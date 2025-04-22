"use server"

import { OpenAI } from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Update the fetchImages function to handle the new response structure
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

  // Create curl command for display on frontend
  const curlCommand = `curl -X GET "${fullUrl}" -H "secret: wobotScoutAIImages"`

  console.log("=== SCOUT AI API REQUEST ===")
  console.log(`URL: ${fullUrl}`)
  console.log(`Headers: { secret: "wobotScoutAIImages" }`)
  console.log(`Curl: ${curlCommand}`)

  try {
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

    // UPDATED: Extract images array from the nested data.data structure
    const images = responseData.data?.data || []

    // UPDATED: Extract pagination info from the nested data structure
    const totalCount = responseData.data?.total || 0
    const totalPages = responseData.data?.totalPages || 1
    const currentPage = responseData.data?.page || page

    console.log(`Images returned: ${images.length} of ${totalCount} total (page ${currentPage} of ${totalPages})`)

    if (images.length === 0) {
      console.warn("⚠️ API returned zero images. Check if this is expected.")
      if (responseData.message) {
        console.log(`API message: ${responseData.message}`)
      }
    } else {
      console.log("First image URL:", images[0])
    }

    return {
      images,
      totalCount,
      currentPage,
      totalPages,
      apiCall: fullUrl,
      curlCommand: curlCommand,
      apiResponse: responseData, // Return the full API response for debugging
    }
  } catch (error) {
    console.error("=== SCOUT AI API ERROR ===")
    console.error(error)
    return {
      images: [],
      totalCount: 0,
      currentPage: page,
      totalPages: 0,
      apiCall: fullUrl,
      curlCommand: curlCommand,
      error: error.message || "Unknown error fetching images",
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
  let apiResponse = null
  let errorMessage = ""

  if (inputType === "scoutai") {
    const env = formData.get("env")
    const companyId = formData.get("company_id")
    const locationId = formData.get("location_id")
    const taskId = formData.get("task_id") // Now required
    const date = formData.get("date")
    const limit = Number.parseInt(formData.get("limit")) || 5
    const page = Number.parseInt(formData.get("page")) || 1

    // Validate required parameters
    if (!companyId) {
      errorMessage = "Company ID is required"
      console.error(errorMessage)
      return { error: errorMessage }
    }

    if (!taskId) {
      errorMessage = "Task ID is required"
      console.error(errorMessage)
      return { error: errorMessage }
    }

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
    apiResponse = fetchResult.apiResponse

    if (fetchResult.error) {
      errorMessage = fetchResult.error
    }

    if (totalFetched === 0) {
      console.warn("⚠️ No images were fetched from the ScoutAI API")
      if (!errorMessage) {
        errorMessage =
          "No images were returned from the API. Please check your parameters (company ID, task ID, date) and try again."
      }
    } else {
      console.log(
        `Total images fetched: ${totalFetched} (page ${currentPage} of ${totalPages}, total available: ${totalCount})`,
      )
    }

    processedCount = 0 // Reset to count successful processing

    console.log(`Processing ${totalFetched} images from page ${currentPage}`)

    // Process images sequentially to update progress
    for (let i = 0; i < images.length; i++) {
      const imageUrl = images[i]
      console.log(`Processing image ${i + 1}/${images.length}: ${imageUrl}`)

      try {
        const result = await getLabelFromImageUrl(imageUrl, prompt)
        results.push(result)
        processedCount++

        // Update tokens
        const tokens = result.tokens || { prompt: 0, completion: 0, total: 0 }
        promptTokens += tokens.prompt
        completionTokens += tokens.completion
        totalTokens += tokens.total

        console.log(
          `Image ${i + 1} processed. Tokens used: prompt=${tokens.prompt}, completion=${tokens.completion}, total=${tokens.total}`,
        )
      } catch (error) {
        console.error(`Failed to process image ${i + 1}:`, error)
        results.push({
          image: imageUrl,
          label: `Error: ${error.message || "Failed to process image"}`,
          tokens: { prompt: 0, completion: 0, total: 0 },
          error: true,
        })
      }

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
      try {
        const result = await getLabelFromUploadedFile(manualFile, prompt)
        results.push(result)
        processedCount++
        const tokens = result.tokens || { prompt: 0, completion: 0, total: 0 }
        promptTokens += tokens.prompt
        completionTokens += tokens.completion
        totalTokens += tokens.total
        console.log(
          `File processed. Tokens used: prompt=${tokens.prompt}, completion=${tokens.completion}, total=${tokens.total}`,
        )
      } catch (error) {
        console.error("Failed to process uploaded file:", error)
        errorMessage = `Error processing uploaded file: ${error.message}`
      }
    } else if (manualUrl) {
      console.log(`Processing image from URL: ${manualUrl}`)
      try {
        const result = await getLabelFromImageUrl(manualUrl, prompt)
        results.push(result)
        processedCount++
        const tokens = result.tokens || { prompt: 0, completion: 0, total: 0 }
        promptTokens += tokens.prompt
        completionTokens += tokens.completion
        totalTokens += tokens.total
        console.log(
          `URL image processed. Tokens used: prompt=${tokens.prompt}, completion=${tokens.completion}, total=${tokens.total}`,
        )
      } catch (error) {
        console.error("Failed to process image URL:", error)
        errorMessage = `Error processing image URL: ${error.message}`
      }
    } else {
      errorMessage = "No image file or URL provided for manual input"
      console.warn(errorMessage)
    }

    totalFetched = manualFile || manualUrl ? 1 : 0
    totalCount = totalFetched
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
    apiResponse,
    error: errorMessage,
  }
}

async function getLabelFromImageUrl(imageUrl, prompt) {
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
    console.error("Error processing image URL:", error)
    throw new Error(`Error fetching image: ${error.message || String(error)}`)
  }
}

async function getLabelFromUploadedFile(file, prompt) {
  try {
    console.log(`Processing uploaded file: ${file.name}, size: ${file.size} bytes`)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64Image = buffer.toString("base64")
    const imageDataUri = `data:image/jpeg;base64,${base64Image}`
    console.log("File processed and converted to base64 successfully")

    return await callGpt(prompt, imageDataUri, "Uploaded Image")
  } catch (error) {
    console.error("Error processing uploaded file:", error)
    throw new Error(`Error reading upload: ${error.message || String(error)}`)
  }
}

async function callGpt(prompt, imageDataUri, imageSource) {
  try {
    console.log(`Calling GPT for image: ${imageSource.substring(0, 50)}...`)
    // Ensure we're using gpt-4o-mini model
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
