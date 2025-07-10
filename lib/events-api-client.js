// Alternative Events API client functions for server deployment
// These use API routes instead of server actions to avoid serverless function issues

export async function validateEventsApiKeyViaRoute(apiKey, environment) {
  try {
    console.log("🔍 Events API Route Client - Validating API key")
    
    const response = await fetch('/api/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey,
        environment,
        action: 'validate'
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    const data = await response.json()
    console.log("✅ Events API Route Client - Validation successful")
    
    return {
      success: true,
      locations: data.data || [],
      status: data.status
    }
  } catch (error) {
    console.error("❌ Events API Route Client - Validation failed:", error)
    throw error
  }
}

export async function fetchEventsViaRoute(params) {
  try {
    console.log("🔍 Events API Route Client - Fetching events")
    
    const response = await fetch('/api/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...params,
        action: 'fetch'
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    const data = await response.json()
    console.log("✅ Events API Route Client - Fetch successful")
    
    return data
  } catch (error) {
    console.error("❌ Events API Route Client - Fetch failed:", error)
    throw error
  }
}
