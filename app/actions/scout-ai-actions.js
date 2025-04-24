"use server"

import { makeSerializable } from "./utils"

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

    return await makeSerializable({
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
