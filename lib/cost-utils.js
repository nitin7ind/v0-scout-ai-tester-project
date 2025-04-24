/**
 * Utility functions for cost calculations
 */

// Token assumptions - updated with specific input/output counts
export const GEMINI_INPUT_TOKENS = 360
export const GEMINI_OUTPUT_TOKENS = 25
export const GEMINI_TOKENS_PER_IMAGE = GEMINI_INPUT_TOKENS + GEMINI_OUTPUT_TOKENS

export const GPT_INPUT_TOKENS = 500
export const GPT_OUTPUT_TOKENS = 25
export const GPT_TOKENS_PER_IMAGE = GPT_INPUT_TOKENS + GPT_OUTPUT_TOKENS

// Pricing rates (per million tokens)
export const GEMINI_INPUT_RATE = 0.15 / 1000000 // $0.15 per 1M tokens
export const GEMINI_OUTPUT_RATE = 0.6 / 1000000 // $0.60 per 1M tokens
export const GPT_INPUT_RATE = 0.4 / 1000000 // $0.40 per 1M tokens
export const GPT_OUTPUT_RATE = 1.6 / 1000000 // $1.60 per 1M tokens

/**
 * Calculate the estimated cost for processing images
 * @param {number} imageCount - Number of images to process
 * @param {string} model - Model to use (gemini or gpt)
 * @returns {Object} Cost breakdown
 */
export function calculateImageProcessingCost(imageCount, model = "gemini") {
  const inputTokens = model === "gemini" ? imageCount * GEMINI_INPUT_TOKENS : imageCount * GPT_INPUT_TOKENS

  const outputTokens = model === "gemini" ? imageCount * GEMINI_OUTPUT_TOKENS : imageCount * GPT_OUTPUT_TOKENS

  const totalTokens = inputTokens + outputTokens

  const inputRate = model === "gemini" ? GEMINI_INPUT_RATE : GPT_INPUT_RATE
  const outputRate = model === "gemini" ? GEMINI_OUTPUT_RATE : GPT_OUTPUT_RATE

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
