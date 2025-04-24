"use server"

import { makeSerializable } from "./utils"

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

    return await makeSerializable({
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
