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

// Pricing rates (per million tokens) - Legacy rates for estimation
export const GEMINI_INPUT_RATE = 0.15 / 1000000 // $0.15 per 1M tokens (legacy)
export const GEMINI_OUTPUT_RATE = 0.6 / 1000000 // $0.60 per 1M tokens (legacy)
export const GPT_INPUT_RATE = 0.4 / 1000000 // $0.40 per 1M tokens
export const GPT_OUTPUT_RATE = 1.6 / 1000000 // $1.60 per 1M tokens

// New pricing rates for Gemini 2.5 Flash (updated from official pricing)
export const GEMINI_2_5_FLASH_INPUT_RATE = 0.30 / 1000000 // $0.30 per 1M tokens
export const GEMINI_2_5_FLASH_OUTPUT_RATE = 2.50 / 1000000 // $2.50 per 1M tokens (including thinking tokens)

/**
 * Calculate actual cost from Gemini API response usage metadata
 * @param {Object} usageMetadata - Usage metadata from Gemini API response
 * @returns {Object} Actual cost breakdown
 */
export function calculateActualGeminiCost(usageMetadata) {
  const inputTokens = usageMetadata.promptTokenCount || 0
  const candidatesTokens = usageMetadata.candidatesTokenCount || 0
  const thoughtsTokens = usageMetadata.thoughtsTokenCount || 0
  const outputTokens = candidatesTokens + thoughtsTokens
  const totalTokens = usageMetadata.totalTokenCount || (inputTokens + outputTokens)

  const inputCost = inputTokens * GEMINI_2_5_FLASH_INPUT_RATE
  const outputCost = outputTokens * GEMINI_2_5_FLASH_OUTPUT_RATE
  const totalCost = inputCost + outputCost

  return {
    type: 'actual',
    model: 'gemini-2.5-flash',
    totalTokens,
    inputTokens,
    outputTokens,
    candidatesTokens,
    thoughtsTokens,
    inputCost,
    outputCost,
    totalCost,
    breakdown: {
      text: usageMetadata.promptTokensDetails?.find(d => d.modality === 'TEXT')?.tokenCount || 0,
      image: usageMetadata.promptTokensDetails?.find(d => d.modality === 'IMAGE')?.tokenCount || 0,
    }
  }
}

/**
 * Calculate estimated cost for processing images (legacy estimation)
 * @param {number} imageCount - Number of images to process
 * @param {string} model - Model to use (gemini or gpt)
 * @returns {Object} Estimated cost breakdown
 */
export function calculateEstimatedImageProcessingCost(imageCount, model = "gemini") {
  const inputTokens = model === "gemini" ? imageCount * GEMINI_INPUT_TOKENS : imageCount * GPT_INPUT_TOKENS
  const outputTokens = model === "gemini" ? imageCount * GEMINI_OUTPUT_TOKENS : imageCount * GPT_OUTPUT_TOKENS
  const totalTokens = inputTokens + outputTokens

  const inputRate = model === "gemini" ? GEMINI_INPUT_RATE : GPT_INPUT_RATE
  const outputRate = model === "gemini" ? GEMINI_OUTPUT_RATE : GPT_OUTPUT_RATE

  const inputCost = inputTokens * inputRate
  const outputCost = outputTokens * outputRate
  const totalCost = inputCost + outputCost

  return {
    type: 'estimated',
    model,
    totalTokens,
    inputTokens,
    outputTokens,
    inputCost,
    outputCost,
    totalCost,
  }
}

/**
 * Compare actual vs estimated costs
 * @param {Object} actualCost - Result from calculateActualGeminiCost
 * @param {Object} estimatedCost - Result from calculateEstimatedImageProcessingCost
 * @returns {Object} Comparison breakdown
 */
export function compareCosts(actualCost, estimatedCost) {
  const inputDiff = actualCost.inputTokens - estimatedCost.inputTokens
  const outputDiff = actualCost.outputTokens - estimatedCost.outputTokens
  const totalCostDiff = actualCost.totalCost - estimatedCost.totalCost
  const costDiffPercentage = estimatedCost.totalCost > 0 
    ? ((totalCostDiff / estimatedCost.totalCost) * 100) 
    : 0

  return {
    inputTokenDiff: inputDiff,
    outputTokenDiff: outputDiff,
    totalCostDiff,
    costDiffPercentage,
    isActualHigher: totalCostDiff > 0,
    accuracy: estimatedCost.totalCost > 0 
      ? Math.max(0, 100 - Math.abs(costDiffPercentage)) 
      : 0
  }
}

/**
 * Calculate the estimated cost for processing images (backward compatibility)
 * @param {number} imageCount - Number of images to process
 * @param {string} model - Model to use (gemini or gpt)
 * @returns {Object} Cost breakdown
 */
export function calculateImageProcessingCost(imageCount, model = "gemini") {
  return calculateEstimatedImageProcessingCost(imageCount, model)
}
