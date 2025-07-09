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

// Legacy pricing rates (for estimation fallback)
export const GEMINI_INPUT_RATE = 0.15 / 1000000 // $0.15 per 1M tokens (legacy)
export const GEMINI_OUTPUT_RATE = 0.6 / 1000000 // $0.60 per 1M tokens (legacy)
export const GPT_INPUT_RATE = 0.4 / 1000000 // $0.40 per 1M tokens
export const GPT_OUTPUT_RATE = 1.6 / 1000000 // $1.60 per 1M tokens

// Official Gemini pricing rates (per million tokens) - Updated from Google AI pricing page
export const GEMINI_PRICING = {
  "gemini-2.5-flash": {
    input: 0.30 / 1000000,    // $0.30 per 1M tokens (text/image/video)
    output: 2.50 / 1000000,   // $2.50 per 1M tokens (including thinking tokens)
    name: "Gemini 2.5 Flash"
  },
  "gemini-2.5-flash-lite-preview-06-17": {
    input: 0.10 / 1000000,    // $0.10 per 1M tokens (text/image/video)
    output: 0.40 / 1000000,   // $0.40 per 1M tokens (including thinking tokens)
    name: "Gemini 2.5 Flash-Lite Preview"
  },
  "gemini-2.0-flash": {
    input: 0.10 / 1000000,    // $0.10 per 1M tokens (text/image/video)
    output: 0.40 / 1000000,   // $0.40 per 1M tokens
    name: "Gemini 2.0 Flash"
  },
  "gemini-1.5-flash": {
    input: 0.075 / 1000000,   // $0.075 per 1M tokens (prompts <= 128k)
    output: 0.30 / 1000000,   // $0.30 per 1M tokens (prompts <= 128k)
    name: "Gemini 1.5 Flash"
  }
}

// Backward compatibility - default to 2.5 Flash pricing
export const GEMINI_2_5_FLASH_INPUT_RATE = GEMINI_PRICING["gemini-2.5-flash"].input
export const GEMINI_2_5_FLASH_OUTPUT_RATE = GEMINI_PRICING["gemini-2.5-flash"].output

/**
 * Calculate actual cost from Gemini API response usage metadata
 * @param {Object} usageMetadata - Usage metadata from Gemini API response
 * @param {string} geminiModel - Specific Gemini model used (e.g., "gemini-2.5-flash", "gemini-2.0-flash")
 * @returns {Object} Actual cost breakdown
 */
export function calculateActualGeminiCost(usageMetadata, geminiModel = "gemini-2.5-flash") {
  const inputTokens = usageMetadata.promptTokenCount || 0
  const candidatesTokens = usageMetadata.candidatesTokenCount || 0
  const thoughtsTokens = usageMetadata.thoughtsTokenCount || 0
  const outputTokens = candidatesTokens + thoughtsTokens
  const totalTokens = usageMetadata.totalTokenCount || (inputTokens + outputTokens)

  // Get pricing for the specific model, fallback to 2.5 Flash if model not found
  const pricing = GEMINI_PRICING[geminiModel] || GEMINI_PRICING["gemini-2.5-flash"]
  
  const inputCost = inputTokens * pricing.input
  const outputCost = outputTokens * pricing.output
  const totalCost = inputCost + outputCost

  return {
    type: 'actual',
    model: geminiModel,
    modelName: pricing.name,
    totalTokens,
    inputTokens,
    outputTokens,
    candidatesTokens,
    thoughtsTokens,
    inputCost,
    outputCost,
    totalCost,
    pricing: {
      inputRate: pricing.input,
      outputRate: pricing.output
    },
    breakdown: {
      text: usageMetadata.promptTokensDetails?.find(d => d.modality === 'TEXT')?.tokenCount || 0,
      image: usageMetadata.promptTokensDetails?.find(d => d.modality === 'IMAGE')?.tokenCount || 0,
    }
  }
}

/**
 * Calculate estimated cost for processing images with current pricing
 * @param {number} imageCount - Number of images to process
 * @param {string} model - Model to use (gemini or gpt)
 * @param {string} geminiModel - Specific Gemini model variant if using gemini
 * @returns {Object} Estimated cost breakdown with current pricing
 */
export function calculateEstimatedImageProcessingCost(imageCount, model = "gemini", geminiModel = "gemini-2.5-flash") {
  const inputTokens = model === "gemini" ? imageCount * GEMINI_INPUT_TOKENS : imageCount * GPT_INPUT_TOKENS
  const outputTokens = model === "gemini" ? imageCount * GEMINI_OUTPUT_TOKENS : imageCount * GPT_OUTPUT_TOKENS
  const totalTokens = inputTokens + outputTokens

  let inputRate, outputRate, modelName, pricing

  if (model === "gemini") {
    // Use current official pricing
    pricing = GEMINI_PRICING[geminiModel] || GEMINI_PRICING["gemini-2.5-flash"]
    inputRate = pricing.input
    outputRate = pricing.output
    modelName = pricing.name
  } else {
    // GPT pricing
    inputRate = GPT_INPUT_RATE
    outputRate = GPT_OUTPUT_RATE
    modelName = "ChatGPT 4.1"
  }

  const inputCost = inputTokens * inputRate
  const outputCost = outputTokens * outputRate
  const totalCost = inputCost + outputCost

  return {
    type: 'estimated',
    model: model === "gemini" ? geminiModel : model,
    modelName,
    totalTokens,
    inputTokens,
    outputTokens,
    inputCost,
    outputCost,
    totalCost,
    pricing: model === "gemini" ? {
      inputRate,
      outputRate,
      isCurrentPricing: true
    } : {
      inputRate,
      outputRate
    }
  }
}

/**
 * Calculate estimated cost for processing images (legacy estimation for comparison)
 * @param {number} imageCount - Number of images to process
 * @param {string} model - Model to use (gemini or gpt)
 * @returns {Object} Legacy estimated cost breakdown
 */
export function calculateLegacyEstimatedCost(imageCount, model = "gemini") {
  const inputTokens = model === "gemini" ? imageCount * GEMINI_INPUT_TOKENS : imageCount * GPT_INPUT_TOKENS
  const outputTokens = model === "gemini" ? imageCount * GEMINI_OUTPUT_TOKENS : imageCount * GPT_OUTPUT_TOKENS
  const totalTokens = inputTokens + outputTokens

  const inputRate = model === "gemini" ? GEMINI_INPUT_RATE : GPT_INPUT_RATE
  const outputRate = model === "gemini" ? GEMINI_OUTPUT_RATE : GPT_OUTPUT_RATE

  const inputCost = inputTokens * inputRate
  const outputCost = outputTokens * outputRate
  const totalCost = inputCost + outputCost

  return {
    type: 'legacy_estimated',
    model: model === "gemini" ? "gemini-legacy" : model,
    modelName: model === "gemini" ? "Gemini (Legacy Pricing)" : "ChatGPT 4.1",
    totalTokens,
    inputTokens,
    outputTokens,
    inputCost,
    outputCost,
    totalCost,
    pricing: {
      inputRate,
      outputRate,
      isLegacyPricing: true
    }
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
 * Calculate comprehensive cost breakdown showing current pricing, legacy comparison, and actual usage
 * @param {number} imageCount - Number of images processed
 * @param {string} model - Model used (gemini or gpt)
 * @param {string} geminiModel - Specific Gemini model variant
 * @param {Object} actualUsage - Optional actual usage metadata from API response
 * @returns {Object} Comprehensive cost analysis
 */
export function calculateComprehensiveCosts(imageCount, model = "gemini", geminiModel = "gemini-2.5-flash", actualUsage = null) {
  const results = {
    model,
    geminiModel,
    imageCount
  }

  // Calculate current pricing estimate
  results.currentEstimate = calculateEstimatedImageProcessingCost(imageCount, model, geminiModel)

  // Calculate legacy pricing estimate for comparison (only for Gemini)
  if (model === "gemini") {
    results.legacyEstimate = calculateLegacyEstimatedCost(imageCount, model)
    
    // Compare current vs legacy pricing
    const pricingDiff = results.currentEstimate.totalCost - results.legacyEstimate.totalCost
    const pricingDiffPercentage = results.legacyEstimate.totalCost > 0 
      ? ((pricingDiff / results.legacyEstimate.totalCost) * 100) 
      : 0

    results.pricingComparison = {
      costDifference: pricingDiff,
      percentageIncrease: pricingDiffPercentage,
      isCurrentHigher: pricingDiff > 0
    }
  }

  // Calculate actual cost if usage data is provided
  if (actualUsage && model === "gemini") {
    results.actualCost = calculateActualGeminiCost(actualUsage, geminiModel)
    
    // Compare actual vs current estimate
    results.actualVsEstimate = compareCosts(results.actualCost, results.currentEstimate)
    
    // Compare actual vs legacy estimate
    if (results.legacyEstimate) {
      results.actualVsLegacy = compareCosts(results.actualCost, results.legacyEstimate)
    }
  }

  return results
}

/**
 * Calculate the estimated cost for processing images (backward compatibility)
 * @param {number} imageCount - Number of images to process
 * @param {string} model - Model to use (gemini or gpt)
 * @returns {Object} Cost breakdown using current pricing
 */
export function calculateImageProcessingCost(imageCount, model = "gemini") {
  // For backward compatibility, use current pricing with default Gemini 2.5 Flash
  return calculateEstimatedImageProcessingCost(imageCount, model, "gemini-2.5-flash")
}

/**
 * Get available Gemini models and their pricing information
 * @returns {Object} Available models with pricing details
 */
export function getGeminiModelPricing() {
  return GEMINI_PRICING
}

/**
 * Get friendly model name for display
 * @param {string} model - Model identifier
 * @returns {string} Human-readable model name
 */
export function getModelDisplayName(model) {
  if (model === "gpt") {
    return "ChatGPT 4.1"
  }
  
  if (GEMINI_PRICING[model]) {
    return GEMINI_PRICING[model].name
  }
  
  return model
}
