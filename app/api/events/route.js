import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    console.log("🔍 Events API Route - Starting")
    const body = await request.json()
    
    const {
      apiKey,
      environment = "production",
      limit = 10,
      page = 0,
      fromDate,
      toDate,
      locationId,
      taskId,
      cameraId,
      action = "fetch"
    } = body

    console.log("📝 Events API Route - Request data:", {
      environment,
      limit,
      page,
      fromDate,
      toDate,
      locationId,
      taskId,
      cameraId,
      action,
      hasApiKey: !!apiKey
    })

    // Validate required fields
    if (!apiKey) {
      console.error("❌ Events API Route - API key is missing")
      return NextResponse.json({ error: "API key is required" }, { status: 400 })
    }

    const baseUrl = environment === "production" 
      ? "https://api.wobot.ai/client/v2" 
      : "https://api-staging.wobot.ai/client/v2"

    if (action === "validate") {
      // Validate API key by fetching locations
      const url = `${baseUrl}/locations/get`
      console.log("🌐 Events API Route - Validation URL:", url)

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "ScoutAI-Playground/1.0",
        },
        cache: "no-store",
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ Events API Route - Validation failed:", response.status, errorText)
        return NextResponse.json({ 
          error: `API key validation failed: ${response.status} - ${errorText}` 
        }, { status: response.status })
      }

      const data = await response.json()
      console.log("✅ Events API Route - Validation successful")
      
      return NextResponse.json({
        success: true,
        data: data.data || [],
        status: data.status
      })
    }

    if (action === "fetch") {
      // Validate required fields for fetching
      if (!fromDate || !toDate) {
        console.error("❌ Events API Route - Date range is missing")
        return NextResponse.json({ error: "From date and to date are required" }, { status: 400 })
      }

      // Build query parameters
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
      console.log("🌐 Events API Route - Fetch URL:", fullUrl)

      const startTime = Date.now()
      const response = await fetch(fullUrl, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "ScoutAI-Playground/1.0",
        },
        cache: "no-store",
      })

      const fetchTime = Date.now() - startTime
      console.log(`⏱️  Events API Route - Fetch completed in ${fetchTime}ms, status: ${response.status}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ Events API Route - Fetch failed:", {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText.substring(0, 500)
        })
        return NextResponse.json({ 
          error: `API request failed: ${response.status} ${response.statusText} - ${errorText}` 
        }, { status: response.status })
      }

      const responseData = await response.json()
      console.log("✅ Events API Route - Fetch successful", {
        eventCount: responseData.data?.data?.length || 0,
        total: responseData.data?.total || 0
      })

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

      return NextResponse.json({
        images,
        currentPage: page + 1,
        totalPages: Math.max(1, totalPages),
        totalCount,
        apiCall: fullUrl,
        apiResponse: responseData,
        success: true
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })

  } catch (error) {
    console.error("💥 Events API Route - Error caught:", {
      name: error.name,
      message: error.message,
      stack: error.stack?.substring(0, 1000)
    })
    
    return NextResponse.json({ 
      error: `Server error: ${error.message}`,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}
