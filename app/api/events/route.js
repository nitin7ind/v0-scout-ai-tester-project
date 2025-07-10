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
      from,
      to,
      location,
      task,
      camera,
      action = "fetch"
    } = body

    console.log("📝 Events API Route - Request data:", {
      environment,
      limit,
      page,
      from,
      to,
      location,
      task,
      camera,
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

    const headers = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "ScoutAI-Playground/1.0",
    }

    if (action === "validate") {
      // Validate API key by fetching locations
      const url = `${baseUrl}/locations/get`
      console.log("🌐 Events API Route - Validation URL:", url)

      const response = await fetch(url, {
        headers,
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
        locations: data.data || [],
        status: data.status
      })
    }

    if (action === "tasks") {
      // Fetch tasks for location
      if (!location) {
        console.error("❌ Events API Route - Location is missing for tasks")
        return NextResponse.json({ error: "Location is required" }, { status: 400 })
      }

      const url = `${baseUrl}/task/list?location=${location}`
      console.log("🌐 Events API Route - Tasks URL:", url)

      const response = await fetch(url, {
        headers,
        cache: "no-store",
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ Events API Route - Tasks fetch failed:", response.status, errorText)
        return NextResponse.json({ 
          error: `Tasks fetch failed: ${response.status} - ${errorText}` 
        }, { status: response.status })
      }

      const data = await response.json()
      console.log("✅ Events API Route - Tasks fetch successful")
      
      return NextResponse.json({
        success: true,
        tasks: data.data || [],
        status: data.status
      })
    }

    if (action === "cameras") {
      // Fetch cameras for location and task
      if (!location || !task) {
        console.error("❌ Events API Route - Location or task is missing for cameras")
        return NextResponse.json({ error: "Location and task are required" }, { status: 400 })
      }

      const url = `${baseUrl}/camera/get?location=${location}&task=${task}`
      console.log("🌐 Events API Route - Cameras URL:", url)

      const response = await fetch(url, {
        headers,
        cache: "no-store",
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ Events API Route - Cameras fetch failed:", response.status, errorText)
        return NextResponse.json({ 
          error: `Cameras fetch failed: ${response.status} - ${errorText}` 
        }, { status: response.status })
      }

      const data = await response.json()
      console.log("✅ Events API Route - Cameras fetch successful")
      
      return NextResponse.json({
        success: true,
        cameras: data.data?.data || [],
        status: data.status
      })
    }

    if (action === "events") {
      // Fetch events
      if (!from || !to) {
        console.error("❌ Events API Route - Date range is missing")
        return NextResponse.json({ error: "From date and to date are required" }, { status: 400 })
      }

      // Build query parameters
      let queryParams = `?from=${from}&to=${to}`
      
      if (location) {
        queryParams += `&location=${location}`
      }
      
      if (task) {
        queryParams += `&task=${task}`
      }
      
      if (camera) {
        queryParams += `&camera=${camera}`
      }

      const fullUrl = `${baseUrl}/events/get/${limit}/${page}${queryParams}`
      console.log("🌐 Events API Route - Events URL:", fullUrl)

      const startTime = Date.now()
      const response = await fetch(fullUrl, {
        headers,
        cache: "no-store",
      })

      const fetchTime = Date.now() - startTime
      console.log(`⏱️  Events API Route - Events fetch completed in ${fetchTime}ms, status: ${response.status}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ Events API Route - Events fetch failed:", {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText.substring(0, 500)
        })
        return NextResponse.json({ 
          error: `Events fetch failed: ${response.status} ${response.statusText} - ${errorText}` 
        }, { status: response.status })
      }

      const responseData = await response.json()
      console.log("✅ Events API Route - Events fetch successful", {
        eventCount: responseData.data?.data?.length || 0,
        total: responseData.data?.total || 0
      })

      // Extract events from the response
      const events = responseData.data?.data || []
      const totalCount = responseData.data?.total || 0
      const totalPages = Math.ceil(totalCount / limit)

      return NextResponse.json({
        success: true,
        events,
        totalPages: Math.max(1, totalPages),
        total: totalCount,
        currentPage: page + 1,
        apiCall: fullUrl,
        apiResponse: responseData
      })
    }

    // Handle legacy "fetch" action for backward compatibility
    if (action === "fetch") {
      console.log("⚠️  Events API Route - Using legacy fetch action, redirecting to events")
      return await POST(request) // Recursively call with action="events"
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
