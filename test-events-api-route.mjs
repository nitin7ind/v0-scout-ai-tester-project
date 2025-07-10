// Test script to verify the Events API route updates
import fetch from 'node-fetch'

const API_KEY = process.env.WOBOT_API_KEY
const BASE_URL = 'http://localhost:3000'

if (!API_KEY) {
  console.error('❌ WOBOT_API_KEY environment variable is required')
  process.exit(1)
}

async function testEventsApiRoute() {
  console.log('🧪 Testing Events API Route...')
  
  try {
    // Test 1: Validate API key
    console.log('\n1. Testing API key validation...')
    const validateResponse = await fetch(`${BASE_URL}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'validate',
        apiKey: API_KEY,
        environment: 'production'
      })
    })
    
    if (validateResponse.ok) {
      const validateData = await validateResponse.json()
      console.log('✅ Validation successful:', validateData.success)
      console.log('📍 Locations found:', validateData.locations?.length || 0)
      
      if (validateData.locations?.length > 0) {
        const firstLocation = validateData.locations[0]
        console.log('🔍 First location:', firstLocation.name || firstLocation.id)
        
        // Test 2: Fetch tasks for first location
        console.log('\n2. Testing tasks fetch...')
        const tasksResponse = await fetch(`${BASE_URL}/api/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'tasks',
            apiKey: API_KEY,
            environment: 'production',
            location: firstLocation.id
          })
        })
        
        if (tasksResponse.ok) {
          const tasksData = await tasksResponse.json()
          console.log('✅ Tasks fetch successful:', tasksData.success)
          console.log('📋 Tasks found:', tasksData.tasks?.length || 0)
          
          if (tasksData.tasks?.length > 0) {
            const firstTask = tasksData.tasks[0]
            console.log('🔍 First task:', firstTask.name || firstTask.id)
            
            // Test 3: Fetch cameras for first location and task
            console.log('\n3. Testing cameras fetch...')
            const camerasResponse = await fetch(`${BASE_URL}/api/events`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                action: 'cameras',
                apiKey: API_KEY,
                environment: 'production',
                location: firstLocation.id,
                task: firstTask.id
              })
            })
            
            if (camerasResponse.ok) {
              const camerasData = await camerasResponse.json()
              console.log('✅ Cameras fetch successful:', camerasData.success)
              console.log('📷 Cameras found:', camerasData.cameras?.length || 0)
              
              // Test 4: Fetch events
              console.log('\n4. Testing events fetch...')
              const fromDate = new Date()
              fromDate.setDate(fromDate.getDate() - 3)
              const toDate = new Date()
              
              const eventsResponse = await fetch(`${BASE_URL}/api/events`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  action: 'events',
                  apiKey: API_KEY,
                  environment: 'production',
                  from: fromDate.toISOString().split('T')[0],
                  to: toDate.toISOString().split('T')[0],
                  location: firstLocation.id,
                  task: firstTask.id,
                  limit: 5,
                  page: 0
                })
              })
              
              if (eventsResponse.ok) {
                const eventsData = await eventsResponse.json()
                console.log('✅ Events fetch successful:', eventsData.success)
                console.log('📊 Events found:', eventsData.events?.length || 0)
                console.log('📄 Total pages:', eventsData.totalPages || 0)
                console.log('🔢 Total events:', eventsData.total || 0)
              } else {
                console.error('❌ Events fetch failed:', eventsResponse.status)
                const errorData = await eventsResponse.json()
                console.error('Error:', errorData.error)
              }
            } else {
              console.error('❌ Cameras fetch failed:', camerasResponse.status)
              const errorData = await camerasResponse.json()
              console.error('Error:', errorData.error)
            }
          } else {
            console.log('⚠️  No tasks found, skipping cameras and events tests')
          }
        } else {
          console.error('❌ Tasks fetch failed:', tasksResponse.status)
          const errorData = await tasksResponse.json()
          console.error('Error:', errorData.error)
        }
      } else {
        console.log('⚠️  No locations found, skipping other tests')
      }
    } else {
      console.error('❌ Validation failed:', validateResponse.status)
      const errorData = await validateResponse.json()
      console.error('Error:', errorData.error)
    }
  } catch (error) {
    console.error('💥 Test error:', error.message)
  }
}

testEventsApiRoute()
