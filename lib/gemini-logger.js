/**
 * Gemini API Response Logger
 * Logs complete Gemini API responses to JSON files with timestamps
 */

import fs from 'fs'
import path from 'path'

// Create logs directory if it doesn't exist
const LOGS_DIR = path.join(process.cwd(), 'logs')
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true })
}

/**
 * Log Gemini API response to a JSON file
 * @param {Object} params - Logging parameters
 * @param {string} params.prompt - The prompt sent to Gemini
 * @param {string} params.imageSource - Source/URL of the image
 * @param {Object} params.response - Complete Gemini API response
 * @param {Object} params.metadata - Additional metadata (tokens, model, etc.)
 * @param {Error} params.error - Error object if the call failed
 */
export function logGeminiResponse({ prompt, imageSource, response, metadata = {}, error = null }) {
  try {
    const timestamp = new Date().toISOString()
    
    // Clean the response to remove base64 image data
    const cleanedResponse = response ? cleanResponseData(response) : null
    
    const logEntry = {
      timestamp,
      requestId: generateRequestId(),
      model: metadata.model || 'gemini-2.5-flash', // Default to 2.5 Flash
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

    // Create filename with timestamp and model variant
    const date = timestamp.split('T')[0] // YYYY-MM-DD
    const time = timestamp.split('T')[1].split('.')[0].replace(/:/g, '-') // HH-MM-SS
    
    // Extract model variant for filename (remove 'gemini-' prefix)
    const modelVariant = (metadata.model || 'gemini-2.5-flash').replace('gemini-', '')
    
    const filename = `gemini-response-${modelVariant}-${date}-${time}-${logEntry.requestId}.json`
    const filePath = path.join(LOGS_DIR, filename)

    // Write to file
    fs.writeFileSync(filePath, JSON.stringify(logEntry, null, 2))
    
    console.log(`Gemini response logged to: ${filename}`)
  } catch (logError) {
    console.error('Failed to log Gemini response:', logError)
  }
}

/**
 * Generate a unique request ID
 */
function generateRequestId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

/**
 * Clean response data by removing base64 image data
 * @param {Object} response - The response object to clean
 * @returns {Object} Cleaned response object
 */
function cleanResponseData(response) {
  if (!response || typeof response !== 'object') {
    return response
  }

  // Create a deep copy to avoid modifying the original
  const cleaned = JSON.parse(JSON.stringify(response))

  // Remove base64 image data from request body if present
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

  // Clean any other potential base64 fields that might be present
  function removeBase64FromObject(obj) {
    if (Array.isArray(obj)) {
      return obj.map(removeBase64FromObject)
    } else if (obj && typeof obj === 'object') {
      const result = {}
      for (const [key, value] of Object.entries(obj)) {
        if (key === 'data' && typeof value === 'string' && value.length > 1000) {
          // Assume large strings are base64 data
          result[key] = '[BASE64_IMAGE_DATA_REMOVED]'
        } else if (key.toLowerCase().includes('base64') || 
                   (key === 'data' && typeof value === 'string' && /^[A-Za-z0-9+/=]+$/.test(value) && value.length > 100)) {
          // Remove fields that look like base64 data
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

/**
 * Get log files for a specific date range
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Array} Array of log file paths
 */
export function getLogFiles(startDate, endDate) {
  try {
    const files = fs.readdirSync(LOGS_DIR)
    return files
      .filter(file => file.startsWith('gemini-response-') && file.endsWith('.json'))
      .filter(file => {
        // Updated regex to handle both old format (gemini-response-YYYY-MM-DD) 
        // and new format (gemini-response-{model}-YYYY-MM-DD)
        const dateMatch = file.match(/gemini-response-(?:[^-]+-)*(\d{4}-\d{2}-\d{2})/) || 
                         file.match(/gemini-response-(\d{4}-\d{2}-\d{2})/)
        if (!dateMatch) return false
        const fileDate = dateMatch[1]
        return fileDate >= startDate && fileDate <= endDate
      })
      .map(file => path.join(LOGS_DIR, file))
  } catch (error) {
    console.error('Failed to get log files:', error)
    return []
  }
}

/**
 * Clean up old log files (older than specified days)
 * @param {number} daysToKeep - Number of days to keep logs
 */
export function cleanupOldLogs(daysToKeep = 30) {
  try {
    const files = fs.readdirSync(LOGS_DIR)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
    
    files
      .filter(file => file.startsWith('gemini-response-') && file.endsWith('.json'))
      .forEach(file => {
        // Updated regex to handle both old format (gemini-response-YYYY-MM-DD) 
        // and new format (gemini-response-{model}-YYYY-MM-DD)
        const dateMatch = file.match(/gemini-response-(?:[^-]+-)*(\d{4}-\d{2}-\d{2})/) || 
                         file.match(/gemini-response-(\d{4}-\d{2}-\d{2})/)
        if (dateMatch) {
          const fileDate = new Date(dateMatch[1])
          if (fileDate < cutoffDate) {
            fs.unlinkSync(path.join(LOGS_DIR, file))
            console.log(`Deleted old log file: ${file}`)
          }
        }
      })
  } catch (error) {
    console.error('Failed to cleanup old logs:', error)
  }
}
