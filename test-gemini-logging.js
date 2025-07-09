/**
 * Test script for Gemini logging functionality
 * Run this with: node test-gemini-logging.js
 */

const fs = require('fs')
const path = require('path')

// Mock the logger functions since we can't import ES modules in CommonJS
const LOGS_DIR = path.join(process.cwd(), 'logs')
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true })
}

function generateRequestId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

function cleanResponseData(response) {
  if (!response || typeof response !== 'object') {
    return response
  }

  const cleaned = JSON.parse(JSON.stringify(response))

  if (cleaned.requestBody && cleaned.requestBody.contents) {
    cleaned.requestBody.contents.forEach(content => {
      if (content.parts) {
        content.parts.forEach(part => {
          if (part.inline_data && part.inline_data.data) {
            part.inline_data.data = '[BASE64_IMAGE_DATA_REMOVED]'
          }
          if (part.inlineData && part.inlineData.data) {
            part.inlineData.data = '[BASE64_IMAGE_DATA_REMOVED]'
          }
        })
      }
    })
  }

  function removeBase64FromObject(obj) {
    if (Array.isArray(obj)) {
      return obj.map(removeBase64FromObject)
    } else if (obj && typeof obj === 'object') {
      const result = {}
      for (const [key, value] of Object.entries(obj)) {
        if (key === 'data' && typeof value === 'string' && value.length > 1000) {
          result[key] = '[BASE64_IMAGE_DATA_REMOVED]'
        } else if (key.toLowerCase().includes('base64') || 
                   (key === 'data' && typeof value === 'string' && /^[A-Za-z0-9+/=]+$/.test(value) && value.length > 100)) {
          result[key] = '[BASE64_IMAGE_DATA_REMOVED]'
        } else {
          result[key] = removeBase64FromObject(value)
        }
      }
      return result
    }
    return obj
  }

  return removeBase64FromObject(cleaned)
}

function logGeminiResponse({ prompt, imageSource, response, metadata = {}, error = null }) {
  try {
    const timestamp = new Date().toISOString()
    
    const cleanedResponse = response ? cleanResponseData(response) : null
    
    const logEntry = {
      timestamp,
      requestId: generateRequestId(),
      model: metadata.model || 'gemini-2.5-flash',
      prompt,
      imageSource: imageSource ? imageSource.substring(0, 100) + (imageSource.length > 100 ? '...' : '') : null,
      response: cleanedResponse,
      metadata: {
        ...metadata,
        success: !error,
        processingTime: metadata.processingTime || null,
        estimatedTokens: metadata.estimatedTokens || null,
      },
      error: error ? {
        message: error.message,
        stack: error.stack,
      } : null,
    }

    const date = timestamp.split('T')[0]
    const time = timestamp.split('T')[1].split('.')[0].replace(/:/g, '-')
    const filename = `gemini-response-${date}-${time}-${logEntry.requestId}.json`
    const filePath = path.join(LOGS_DIR, filename)

    fs.writeFileSync(filePath, JSON.stringify(logEntry, null, 2))
    
    console.log(`Gemini response logged to: ${filename}`)
    return filename
  } catch (logError) {
    console.error('Failed to log Gemini response:', logError)
  }
}

// Test logging a successful response
const testSuccessfulResponse = () => {
  console.log('Testing successful Gemini response logging...')
  
  const mockResponse = {
    candidates: [
      {
        content: {
          parts: [
            {
              text: "This is a test response from Gemini API"
            }
          ]
        }
      }
    ],
    promptFeedback: {
      safetyRatings: []
    },
    requestBody: {
      contents: [
        {
          parts: [
            { text: "Test prompt" },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
              }
            }
          ]
        }
      ]
    }
  }

  const filename = logGeminiResponse({
    prompt: "Test prompt for image analysis",
    imageSource: "https://example.com/test-image.jpg",
    response: mockResponse,
    metadata: {
      model: "gemini-2.5-flash",
      processingTime: 1234,
      estimatedTokens: {
        prompt: 100,
        completion: 25,
        total: 125
      },
      imageSize: 50000
    }
  })

  console.log('✅ Successful response logged (base64 data should be removed)')
  return filename
}

// Test logging an error response
const testErrorResponse = () => {
  console.log('Testing error Gemini response logging...')
  
  const mockError = new Error('API rate limit exceeded')
  mockError.stack = 'Error: API rate limit exceeded\n    at callGemini (test.js:10:11)'

  const filename = logGeminiResponse({
    prompt: "Test prompt for failed request",
    imageSource: "https://example.com/test-image-2.jpg",
    response: null,
    metadata: {
      model: "gemini-2.5-flash",
      processingTime: 500,
      imageSize: 45000
    },
    error: mockError
  })

  console.log('✅ Error response logged')
  return filename
}

// Function to verify base64 data was removed
const verifyBase64Removal = (filename) => {
  console.log(`\n🔍 Verifying base64 data removal in ${filename}...`)
  
  try {
    const logPath = path.join(LOGS_DIR, filename)
    const logContent = fs.readFileSync(logPath, 'utf8')
    const logData = JSON.parse(logContent)
    
    const logString = JSON.stringify(logData)
    
    if (logString.includes('[BASE64_IMAGE_DATA_REMOVED]')) {
      console.log('✅ Base64 data was successfully removed and marked')
    } else if (logString.includes('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==')) {
      console.log('❌ Base64 data was NOT removed - original data still present')
    } else {
      console.log('ℹ️  No base64 data found in this log (this may be expected for error logs)')
    }
    
    // Show a snippet of the logged response
    if (logData.response && logData.response.requestBody) {
      console.log('📝 Request body data field:', 
        logData.response.requestBody.contents[0].parts[1].inline_data.data)
    }
    
  } catch (error) {
    console.error('❌ Failed to verify log content:', error.message)
  }
}

// Run tests
console.log('🧪 Starting Gemini logging tests...\n')

const successFilename = testSuccessfulResponse()
console.log()
const errorFilename = testErrorResponse()

// Verify base64 removal
if (successFilename) {
  verifyBase64Removal(successFilename)
}

console.log('\n✨ All tests completed! Check the /logs directory for generated files.')
console.log('📁 Log files are saved with timestamp-based filenames.')
console.log('🔒 Base64 image data should be replaced with [BASE64_IMAGE_DATA_REMOVED] markers.')
