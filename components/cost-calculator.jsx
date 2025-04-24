"use client"

import { useState, useEffect } from "react"

export default function CostCalculator({ isDevMode = false }) {
  // Default values
  const [hoursPerDay, setHoursPerDay] = useState(12)
  const [daysPerMonth, setDaysPerMonth] = useState(30)
  const [frequencyValue, setFrequencyValue] = useState(30)
  const [frequencyUnit, setFrequencyUnit] = useState("minutes")
  const [results, setResults] = useState(null)

  // Token assumptions
  const GEMINI_TOKENS_PER_IMAGE = 380
  const GPT_TOKENS_PER_IMAGE = 520

  // Pricing rates (per million tokens)
  const GEMINI_INPUT_RATE = 0.15 / 1000000 // $0.15 per 1M tokens
  const GEMINI_OUTPUT_RATE = 0.6 / 1000000 // $0.60 per 1M tokens
  const GPT_INPUT_RATE = 0.4 / 1000000 // $0.40 per 1M tokens
  const GPT_OUTPUT_RATE = 1.6 / 1000000 // $1.60 per 1M tokens

  // Calculate results whenever inputs change
  useEffect(() => {
    calculateCosts()
  }, [hoursPerDay, daysPerMonth, frequencyValue, frequencyUnit])

  const calculateCosts = () => {
    // Convert frequency to minutes
    const frequencyInMinutes = frequencyUnit === "hours" ? frequencyValue * 60 : frequencyValue

    // Calculate images per day
    const imagesPerDay = Math.floor((hoursPerDay * 60) / frequencyInMinutes)

    // Calculate images per month
    const imagesPerMonth = imagesPerDay * daysPerMonth

    // Calculate Gemini costs
    const geminiTokensPerMonth = imagesPerMonth * GEMINI_TOKENS_PER_IMAGE
    // Assuming 1/4 of tokens are input and 3/4 are output for a typical vision model
    const geminiInputTokens = geminiTokensPerMonth * 0.25
    const geminiOutputTokens = geminiTokensPerMonth * 0.75
    const geminiInputCost = geminiInputTokens * GEMINI_INPUT_RATE
    const geminiOutputCost = geminiOutputTokens * GEMINI_OUTPUT_RATE
    const geminiTotalCost = geminiInputCost + geminiOutputCost

    // Calculate GPT costs
    const gptTokensPerMonth = imagesPerMonth * GPT_TOKENS_PER_IMAGE
    const gptInputTokens = gptTokensPerMonth * 0.25
    const gptOutputTokens = gptTokensPerMonth * 0.75
    const gptInputCost = gptInputTokens * GPT_INPUT_RATE
    const gptOutputCost = gptOutputTokens * GPT_OUTPUT_RATE
    const gptTotalCost = gptInputCost + gptOutputCost

    setResults({
      imagesPerDay,
      imagesPerMonth,
      gemini: {
        tokensPerMonth: geminiTokensPerMonth,
        inputTokens: geminiInputTokens,
        outputTokens: geminiOutputTokens,
        inputCost: geminiInputCost,
        outputCost: geminiOutputCost,
        totalCost: geminiTotalCost,
      },
      gpt: {
        tokensPerMonth: gptTokensPerMonth,
        inputTokens: gptInputTokens,
        outputTokens: gptOutputTokens,
        inputCost: gptInputCost,
        outputCost: gptOutputCost,
        totalCost: gptTotalCost,
      },
    })
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-medium mb-6">Cost Estimator</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="space-y-2">
          <label htmlFor="hoursPerDay" className="block text-sm font-medium">
            Hours per day
          </label>
          <input
            id="hoursPerDay"
            type="number"
            min="1"
            max="24"
            value={hoursPerDay}
            onChange={(e) => setHoursPerDay(Math.min(24, Math.max(1, Number.parseInt(e.target.value) || 1)))}
            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="daysPerMonth" className="block text-sm font-medium">
            Days per month
          </label>
          <input
            id="daysPerMonth"
            type="number"
            min="1"
            max="31"
            value={daysPerMonth}
            onChange={(e) => setDaysPerMonth(Math.min(31, Math.max(1, Number.parseInt(e.target.value) || 1)))}
            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="frequency" className="block text-sm font-medium">
            Frequency
          </label>
          <div className="flex gap-2">
            <input
              id="frequency"
              type="number"
              min="1"
              value={frequencyValue}
              onChange={(e) => setFrequencyValue(Math.max(1, Number.parseInt(e.target.value) || 1))}
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            />
            <select
              value={frequencyUnit}
              onChange={(e) => setFrequencyUnit(e.target.value)}
              className="p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="minutes">Minutes</option>
              <option value="hours">Hours</option>
            </select>
          </div>
        </div>
      </div>

      {results && (
        <div className="space-y-6">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md">
            <h3 className="text-lg font-medium mb-2">Estimated Usage</h3>
            <p>
              <strong>Images per day:</strong> {results.imagesPerDay.toLocaleString()}
            </p>
            <p>
              <strong>Images per month:</strong> {results.imagesPerMonth.toLocaleString()}
            </p>
          </div>

          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-md">
            <h3 className="text-lg font-medium mb-2">Glacier-2.5 (Gemini) Cost Estimate</h3>
            <p>
              <strong>Total tokens per month:</strong> {Math.round(results.gemini.tokensPerMonth).toLocaleString()}
            </p>
            <p>
              <strong>Estimated monthly cost:</strong> ${results.gemini.totalCost.toFixed(2)}
            </p>
          </div>

          {isDevMode && (
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-md">
              <h3 className="text-lg font-medium mb-2">Comet-4.1 (GPT) Cost Estimate</h3>
              <p>
                <strong>Total tokens per month:</strong> {Math.round(results.gpt.tokensPerMonth).toLocaleString()}
              </p>
              <p>
                <strong>Estimated monthly cost:</strong> ${results.gpt.totalCost.toFixed(2)}
              </p>
            </div>
          )}

          {isDevMode && (
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
              <h3 className="text-lg font-medium mb-2">Detailed Breakdown</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Glacier-2.5 (Gemini)</h4>
                  <p>
                    <strong>Input tokens:</strong> {Math.round(results.gemini.inputTokens).toLocaleString()}
                  </p>
                  <p>
                    <strong>Output tokens:</strong> {Math.round(results.gemini.outputTokens).toLocaleString()}
                  </p>
                  <p>
                    <strong>Input cost:</strong> ${results.gemini.inputCost.toFixed(4)}
                  </p>
                  <p>
                    <strong>Output cost:</strong> ${results.gemini.outputCost.toFixed(4)}
                  </p>
                  <p>
                    <strong>Total cost:</strong> ${results.gemini.totalCost.toFixed(4)}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Comet-4.1 (GPT)</h4>
                  <p>
                    <strong>Input tokens:</strong> {Math.round(results.gpt.inputTokens).toLocaleString()}
                  </p>
                  <p>
                    <strong>Output tokens:</strong> {Math.round(results.gpt.outputTokens).toLocaleString()}
                  </p>
                  <p>
                    <strong>Input cost:</strong> ${results.gpt.inputCost.toFixed(4)}
                  </p>
                  <p>
                    <strong>Output cost:</strong> ${results.gpt.outputCost.toFixed(4)}
                  </p>
                  <p>
                    <strong>Total cost:</strong> ${results.gpt.totalCost.toFixed(4)}
                  </p>
                </div>
              </div>

              <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                <p>* Assumptions:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Glacier-2.5 (Gemini): {GEMINI_TOKENS_PER_IMAGE} tokens per image</li>
                  <li>Comet-4.1 (GPT): {GPT_TOKENS_PER_IMAGE} tokens per image</li>
                  <li>Input/Output ratio: 25%/75%</li>
                  <li>Glacier-2.5 pricing: $0.15/1M input tokens, $0.60/1M output tokens</li>
                  <li>Comet-4.1 pricing: $0.40/1M input tokens, $1.60/1M output tokens</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
