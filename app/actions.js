"use server"

import { OpenAI } from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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
    const page = Number.parseInt(formData.get("page")) || 1

    // Validate required parameters
    if (!companyId) {
      return { error: "Company ID is required" }
    }

    if (!taskId) {
      return { error: "Task ID is required" }
    }

    console.log(
      `ScoutAI parameters: env=${env}, companyId=${companyId}, locationId=${locationId}, taskId=${taskId}, date=${date}, limit=${limit}, page=${page}`,
    )

    const baseUrl = env === "prod" ? "https://api-app-prod.wobot.ai" : "https://api-app-staging.wobot.ai"
    const endpoint = `${baseUrl}/app/v1/scoutai/images/get/${limit}/${page}`

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

    // Ensure the response is serializable
    const serializedResponse = {
      status: responseData.status,
      message: responseData.message || "",
      data: {
        page: responseData.data?.page || 1,
        limit: responseData.data?.limit || limit,
        totalPages: responseData.data?.totalPages || 1,
        total: responseData.data?.total || 0,
        hasNextPage: responseData.data?.hasNextPage || false,
        data: images,
      },
    }

    // Create image objects with status
    const imageObjects = images.map((url) => ({
      image: url,
      processed: false,
      label: null,
      tokens: null,
      error: null,
    }))

    return makeSerializable({
      images: imageObjects,
      totalCount,
      currentPage,
      totalPages,
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

// Step 2: Process images with GPT
export async function processImagesWithGPT(images, prompt) {
  try {
    console.log(`Starting GPT processing for ${images.length} images with prompt: ${prompt}`)

    const results = []
    let processedCount = 0
    let promptTokens = 0
    let completionTokens = 0
    let totalTokens = 0
    let errorCount = 0

    // Process images sequentially
    for (let i = 0; i < images.length; i++) {
      const imageUrl = images[i].image
      console.log(`Processing image ${i + 1}/${images.length}: ${imageUrl}`)

      try {
        const result = await getLabelFromImageUrl(imageUrl, prompt)

        // Update the image object with results
        const processedImage = {
          ...images[i],
          processed: true,
          label: result.label,
          tokens: result.tokens,
        }

        results.push(processedImage)
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

        // Add error information to the image object
        const errorImage = {
          ...images[i],
          processed: true,
          label: `Error: ${error.message || "Failed to process image"}`,
          error: true,
        }

        results.push(errorImage)
        errorCount++
      }
    }

    console.log(`Processing complete. ${processedCount} images processed successfully, ${errorCount} errors.`)
    console.log(`Total tokens used: ${totalTokens} (Prompt: ${promptTokens}, Completion: ${completionTokens})`)

    return makeSerializable({
      results,
      processedCount,
      errorCount,
      promptTokens,
      completionTokens,
      totalTokens,
    })
  } catch (error) {
    console.error("Unhandled error in processImagesWithGPT:", error)
    return {
      error: `An unexpected error occurred: ${error.message || "Unknown error"}`,
      results: [],
    }
  }
}

// Helper function to process a single image URL
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

// Helper function to process an uploaded file
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

// Helper function to call GPT
async function callGpt(prompt, imageDataUri, imageSource) {
  try {
    console.log(`Calling GPT for image: ${imageSource.substring(0, 50)}...`)
    console.log(`Using prompt: ${prompt}`)

    // Ensure we're using gpt-4o-mini model
    const chatResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
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

// Legacy function for manual image uploads (kept for backward compatibility)
export async function analyzeImages(formData) {
  try {
    const prompt = formData.get("prompt")
    const inputType = formData.get("input_type")

    console.log(`Starting image analysis with input type: ${inputType}`)
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
