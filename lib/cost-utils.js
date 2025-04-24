/**
 * Utility functions for cost calculations
 */

// Token assumptions
export const GEMINI_TOKENS_PER_IMAGE = 380
export const GPT_TOKENS_PER_IMAGE = 520

// Pricing rates (per million tokens)
export const GEMINI_INPUT_RATE = 0.15 / 1000000 // $0.15 per 1M tokens
export const GEMINI_OUTPUT_RATE = 0.6 / 1000000 // $0.60 per 1M tokens
export const GPT_INPUT_RATE = 0.4 / 1000000 // $0.40 per 1M tokens
export const GPT_OUTPUT_RATE = 1.6 / 1000000 // $1.60 per 1M tokens

/**
 * Calculate the estimated cost for processing images
 * @param {number} imageCount - Number of images to process
 * @param {string} model - Model to use (gemini or gpt)
 * @param {number} inputRatio - Ratio of input tokens (0-1)
 * @returns {Object} Cost breakdown
 */
export function calculateImageProcessingCost(imageCount, model = "gemini", inputRatio = 0.25) {
  const outputRatio = 1 - inputRatio

  const tokensPerImage = model === "gemini" ? GEMINI_TOKENS_PER_IMAGE : GPT_TOKENS_PER_IMAGE
  const inputRate = model === "gemini" ? GEMINI_INPUT_RATE : GPT_INPUT_RATE
  const outputRate = model === "gemini" ? GEMINI_OUTPUT_RATE : GPT_OUTPUT_RATE

  const totalTokens = imageCount * tokensPerImage
  const inputTokens = totalTokens * inputRatio
  const outputTokens = totalTokens * outputRatio

  const inputCost = inputTokens * inputRate
  const outputCost = outputTokens * outputRate
  const totalCost = inputCost + outputCost

  return {
    totalTokens,
    inputTokens,
    outputTokens,
    inputCost,
    outputCost,
    totalCost,
  }
}
