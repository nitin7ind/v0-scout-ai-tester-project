/**
 * Test script to verify the new cost calculation functionality
 */

// Import using CommonJS syntax for Node.js
const { 
  calculateActualGeminiCost, 
  calculateEstimatedImageProcessingCost, 
  compareCosts 
} = require('./lib/cost-utils.js')

// Test with example usage metadata like what we get from Gemini API
const exampleUsageMetadata = {
  promptTokenCount: 416,
  candidatesTokenCount: 3,
  thoughtsTokenCount: 955,
  totalTokenCount: 1374,
  promptTokensDetails: [
    { modality: "TEXT", tokenCount: 158 },
    { modality: "IMAGE", tokenCount: 258 }
  ]
}

console.log('=== Testing Cost Calculation Functions ===\n')

// Test actual cost calculation
console.log('1. Testing Actual Cost Calculation:')
const actualCost = calculateActualGeminiCost(exampleUsageMetadata)
console.log('Actual Cost Result:', JSON.stringify(actualCost, null, 2))

// Test estimated cost calculation
console.log('\n2. Testing Estimated Cost Calculation:')
const estimatedCost = calculateEstimatedImageProcessingCost(1, 'gemini')
console.log('Estimated Cost Result:', JSON.stringify(estimatedCost, null, 2))

// Test cost comparison
console.log('\n3. Testing Cost Comparison:')
const comparison = compareCosts(actualCost, estimatedCost)
console.log('Comparison Result:', JSON.stringify(comparison, null, 2))

// Test multiple images
console.log('\n4. Testing Multiple Images (5 images):')
const estimatedCost5 = calculateEstimatedImageProcessingCost(5, 'gemini')
console.log('Estimated Cost for 5 images:', JSON.stringify(estimatedCost5, null, 2))

console.log('\n=== Test Complete ===')
