"use server"

import { OpenAI } from "openai"
import type { AnalysisResult } from "@/lib/types"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Updated fetchImages function to support pagination and task_id
async function fetchImages(
  env: string,
  companyId: string,
  locationId: string,
  date: string,
  taskId: string,
  limit: number,
  page: number,
) {
  const baseUrl = env === "prod" ? "https://api-app-prod.wobot.ai" : "https://api-app-staging.wobot.ai"

  // Updated endpoint to match the provided URL structure
  const endpoint = `${baseUrl}/app/v1/scoutai/images/get/50/1`

  // Build query parameters
  const params = new URLSearchParams({
    company: companyId,
    date: date,
    limit: limit.toString(),
    page: page.toString(),
  })

  // Add task parameter if provided
  if (taskId) {
    params.append("task", taskId)
  }

  // Add location parameter (even if empty)
  params.append("location", locationId || "")

  try {
    console.log(`Fetching images from ${endpoint} with params:`, Object.fromEntries(params.entries()))

    const response = await fetch(`${endpoint}?${params.toString()}`, {
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
    }
  } catch (error) {
    console.error("Error fetching images:", error)
    return {
      images: [],
      totalCount: 0,
      currentPage: page,
      totalPages: 0,
    }
  }
}

// Update the analyzeImages function to handle pagination
export async function analyzeImages(formData: FormData, progressCallback?: (current: number, total: number) => void) {
  const prompt = formData.get("prompt") as string
  const inputType = formData.get("input_type") as string

  console.log(`Starting image analysis with input type: ${inputType}`)
  console.log(`Prompt: ${prompt}`)

  const results: AnalysisResult[] = []
  let totalFetched = 0
  let processedCount = 0
  let promptTokens = 0
  let completionTokens = 0
  let totalTokens = 0
  let totalCount = 0
  let currentPage = 1
  let totalPages = 1

  if (inputType === "scoutai") {
    const env = formData.get("env") as string
    const companyId = formData.get("company_id") as string
    const locationId = formData.get("location_id") as string
    const taskId = formData.get("task_id") as string
    const date = formData.get("date") as string
    const limit = Number.parseInt(formData.get("limit") as string) || 5
    const page = Number.parseInt(formData.get("page") as string) || 1

    console.log(
      `ScoutAI parameters: env=${env}, companyId=${companyId}, locationId=${locationId}, taskId=${taskId}, date=${date}, limit=${limit}, page=${page}`,
    )

    const fetchResult = await fetchImages(env, companyId, locationId, date, taskId, limit, page)
    const images = fetchResult.images
    totalFetched = images.length
    totalCount = fetchResult.totalCount
    currentPage = fetchResult.currentPage
    totalPages = fetchResult.totalPages

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
    const manualFile = formData.get("manual_image") as File
    const manualUrl = formData.get("manual_url") as string

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
    currentPage = 1
    totalPages = 1

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
  }
}

async function getLabelFromImageUrl(imageUrl: string, prompt: string): Promise<AnalysisResult> {
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

async function getLabelFromUploadedFile(file: File, prompt: string): Promise<AnalysisResult> {
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

async function callGpt(prompt: string, imageDataUri: string, imageSource: string): Promise<AnalysisResult> {
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
