#!/usr/bin/env node

/**
 * Test script to validate that the API switching configuration works
 * This script tests both legacy and new Gemini API implementations
 */

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '.env.local') })

// Mock the image-processing module functions for testing
async function testApiSwitching() {
  console.log('🧪 Testing Gemini API switching configuration...\n')

  // Test legacy API configuration
  console.log('1️⃣ Testing LEGACY API configuration...')
  process.env.GEMINI_API_VERSION = 'legacy'
  
  try {
    // Import after setting the environment variable
    const { callGeminiWithVersion } = await import('./app/actions/image-processing.js')
    console.log('✅ Legacy API configuration loaded successfully')
    
    // Test with a simple base64 image (tiny 1x1 pixel PNG)
    const tinyImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAHGbJlRAwAAAABJRU5ErkJggg=='
    const result = await callGeminiWithVersion('What do you see?', tinyImage, 'test-image.png', 'gemini-2.5-flash')
    console.log('✅ Legacy API call successful')
    console.log('Response preview:', result.label?.substring(0, 100) + '...')
  } catch (error) {
    console.log('❌ Legacy API test failed:', error.message)
  }

  console.log('\n' + '='.repeat(50) + '\n')

  // Test new API configuration
  console.log('2️⃣ Testing NEW API configuration...')
  process.env.GEMINI_API_VERSION = 'new'
  
  try {
    // Clear the module cache to force re-import with new env var
    delete require.cache[require.resolve('./app/actions/image-processing.js')]
    
    const { callGeminiWithVersion } = await import('./app/actions/image-processing.js?' + Date.now())
    console.log('✅ New API configuration loaded successfully')
    
    // Test with the same simple base64 image
    const tinyImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAHGbJlRAwAAAABJRU5ErkJggg=='
    const result = await callGeminiWithVersion('What do you see?', tinyImage, 'test-image.png', 'gemini-2.5-flash')
    console.log('✅ New API call successful')
    console.log('Response preview:', result.label?.substring(0, 100) + '...')
  } catch (error) {
    console.log('❌ New API test failed:', error.message)
  }

  console.log('\n🎉 API switching test completed!')
  console.log('\n📝 To use the APIs in your application:')
  console.log('   - Set GEMINI_API_VERSION=legacy for @google/generative-ai')
  console.log('   - Set GEMINI_API_VERSION=new for @google/genai')
  console.log('   - Default is "legacy" if not specified')
}

// Run the test
testApiSwitching().catch(console.error)
