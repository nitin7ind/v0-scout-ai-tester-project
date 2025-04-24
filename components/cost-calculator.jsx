"use client"

import { useState, useEffect } from "react"
import {
  GEMINI_INPUT_TOKENS,
  GEMINI_OUTPUT_TOKENS,
  GPT_INPUT_TOKENS,
  GPT_OUTPUT_TOKENS,
  GEMINI_INPUT_RATE,
  GEMINI_OUTPUT_RATE,
  GPT_INPUT_RATE,
  GPT_OUTPUT_RATE,
} from "@/lib/cost-utils"

export default function CostCalculator({ isDevMode = false }) {
  // Default values
  const [hoursPerDay, setHoursPerDay] = useState(12)
  const [daysPerMonth, setDaysPerMonth] = useState(30)
  const [frequencyValue, setFrequencyValue] = useState(30)
  const [frequencyUnit, setFrequencyUnit] = useState("minutes")
  const [results, setResults] = useState(null)

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
    const geminiInputTokens = imagesPerMonth * GEMINI_INPUT_TOKENS
    const geminiOutputTokens = imagesPerMonth * GEMINI_OUTPUT_TOKENS
    const geminiTotalTokens = geminiInputTokens + geminiOutputTokens
    const geminiInputCost = geminiInputTokens * GEMINI_INPUT_RATE
    const geminiOutputCost = geminiOutputTokens * GEMINI_OUTPUT_RATE
    const geminiTotalCost = geminiInputCost + geminiOutputCost

    // Calculate GPT costs
    const gptInputTokens = imagesPerMonth * GPT_INPUT_TOKENS
    const gptOutputTokens = imagesPerMonth * GPT_OUTPUT_TOKENS
    const gptTotalTokens = gptInputTokens + gptOutputTokens
    const gptInputCost = gptInputTokens * GPT_INPUT_RATE
    const gptOutputCost = gptOutputTokens * GPT_OUTPUT_RATE
    const gptTotalCost = gptInputCost + gptOutputCost

    setResults({
      imagesPerDay,
      imagesPerMonth,
      gemini: {
        inputTokens: geminiInputTokens,
        outputTokens: geminiOutputTokens,
        totalTokens: geminiTotalTokens,
        inputCost: geminiInputCost,
        outputCost: geminiOutputCost,
        totalCost: geminiTotalCost,
      },
      gpt: {
        inputTokens: gptInputTokens,
        outputTokens: gptOutputTokens,
        totalTokens: gptTotalTokens,
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
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Based on processing one image every {frequencyValue} {frequencyUnit} for {hoursPerDay} hours per day,{" "}
              {daysPerMonth} days per month.
            </p>
          </div>

          {/* Only show cost sections in dev mode */}
          {isDevMode && (
            <>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-md">
                <h3 className="text-lg font-medium mb-2">Glacier-2.5 (Gemini) Cost Estimate</h3>
                <p>
                  <strong>Total tokens per month:</strong> {Math.round(results.gemini.totalTokens).toLocaleString()}
                </p>
                <p>
                  <strong>Estimated monthly cost:</strong> ${results.gemini.totalCost.toFixed(2)}
                </p>
              </div>

              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-md">
                <h3 className="text-lg font-medium mb-2">Comet-4.1 (GPT) Cost Estimate</h3>
                <p>
                  <strong>Total tokens per month:</strong> {Math.round(results.gpt.totalTokens).toLocaleString()}
                </p>
                <p>
                  <strong>Estimated monthly cost:</strong> ${results.gpt.totalCost.toFixed(2)}
                </p>
              </div>

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
                  <p>* Token usage per image:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      Glacier-2.5 (Gemini): {GEMINI_INPUT_TOKENS} input tokens, {GEMINI_OUTPUT_TOKENS} output tokens
                    </li>
                    <li>
                      Comet-4.1 (GPT): {GPT_INPUT_TOKENS} input tokens, {GPT_OUTPUT_TOKENS} output tokens
                    </li>
                    <li>Glacier-2.5 pricing: $0.15/1M input tokens, $0.60/1M output tokens</li>
                    <li>Comet-4.1 pricing: $0.40/1M input tokens, $1.60/1M output tokens</li>
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
