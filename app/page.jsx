"use client"

import { useState } from "react"
import { useTheme } from "@/components/theme-provider"
import { fetchScoutAIImages, processImagesWithGPT, analyzeImages } from "@/app/actions"
import DashboardForm from "@/components/dashboard-form"
import Image from "next/image"

export default function Dashboard() {
  const [images, setImages] = useState([])
  const [results, setResults] = useState([])
  const [selectedImages, setSelectedImages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const [apiCall, setApiCall] = useState("")
  const [curlCommand, setCurlCommand] = useState("")
  const [apiResponse, setApiResponse] = useState(null)
  const [prompt, setPrompt] = useState("")
  const [activeMode, setActiveMode] = useState("scoutai") // Track the active mode
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
  })
  const [stats, setStats] = useState({
    totalFetched: 0,
    processedCount: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  })
  const { theme, setTheme } = useTheme()

  // Calculate pricing based on token usage
  const calculatePricing = () => {
    const inputRate = 0.4 / 1000000 // $0.40 per 1M tokens
    const outputRate = 1.6 / 1000000 // $1.60 per 1M tokens

    const inputCost = stats.promptTokens * inputRate
    const outputCost = stats.completionTokens * outputRate
    const totalCost = inputCost + outputCost

    return {
      inputCost: inputCost.toFixed(6),
      outputCost: outputCost.toFixed(6),
      totalCost: totalCost.toFixed(6),
    }
  }

  // Toggle image selection
  const toggleImageSelection = (index) => {
    setSelectedImages((prev) => {
      if (prev.includes(index)) {
        return prev.filter((i) => i !== index)
      } else {
        return [...prev, index]
      }
    })
  }

  // Toggle all images selection
  const toggleAllImages = () => {
    if (selectedImages.length === images.length) {
      setSelectedImages([])
    } else {
      setSelectedImages(images.map((_, index) => index))
    }
  }

  // Reset state when switching modes
  const resetState = (mode) => {
    setImages([])
    setResults([])
    setSelectedImages([])
    setError(null)
    setApiCall("")
    setCurlCommand("")
    setApiResponse(null)
    setStats({
      totalFetched: 0,
      processedCount: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    })
    setActiveMode(mode)
  }

  // Step 1: Fetch images from ScoutAI API
  const handleFetchImages = async (formData) => {
    setIsLoading(true)
    setImages([])
    setResults([])
    setSelectedImages([]) // Reset selected images when fetching new images
    setError(null)
    setApiCall("")
    setCurlCommand("")
    setApiResponse(null)
    setPrompt(formData.get("prompt") || "")
    setActiveMode("scoutai")

    try {
      console.log("Fetching images from ScoutAI API...")
      const response = await fetchScoutAIImages(formData)
      console.log("Fetch complete:", response)

      // Check for errors
      if (response.error) {
        setError(response.error)
        console.error("Error returned from fetchScoutAIImages:", response.error)
        return
      }

      // Update state with response data
      setImages(response.images || [])
      setPagination({
        currentPage: response.currentPage || 1,
        totalPages: response.totalPages || 1,
        totalCount: response.totalCount || 0,
      })
      setApiCall(response.apiCall || "")
      setCurlCommand(response.curlCommand || "")
      setApiResponse(response.apiResponse)
      setStats({
        totalFetched: response.images?.length || 0,
        processedCount: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      })

      // Show error if no images were fetched
      if (!response.images || response.images.length === 0) {
        setError(
          "No images were found. The ScoutAI API returned zero images. Please check your input parameters (company ID, task ID, date) and try again.",
        )
      }
    } catch (error) {
      console.error("Error fetching images:", error)
      setError(`Error fetching images: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Step 2: Process fetched images with GPT
  const handleProcessImages = async () => {
    if (images.length === 0) {
      setError("No images to process. Please fetch images first.")
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setError(null)

    try {
      // Only process selected images if any are selected, otherwise process all
      const indicesToProcess = selectedImages.length > 0 ? selectedImages : null

      console.log(`Processing ${indicesToProcess ? selectedImages.length : images.length} images with Wobot AI...`)
      const response = await processImagesWithGPT(images, prompt, indicesToProcess)
      console.log("Processing complete:", response)

      // Check for errors
      if (response.error) {
        setError(response.error)
        console.error("Error returned from processImagesWithGPT:", response.error)
        return
      }

      // Update state with response data - but keep the original images array
      // This ensures we don't lose the selection state
      setResults(response.results || [])
      setStats({
        ...stats,
        processedCount: response.processedCount || 0,
        promptTokens: response.promptTokens || 0,
        completionTokens: response.completionTokens || 0,
        totalTokens: response.totalTokens || 0,
      })

      // Show warning if some images failed processing
      if (response.errorCount > 0) {
        console.warn(
          `Warning: ${response.errorCount} of ${indicesToProcess ? selectedImages.length : images.length} images failed to process.`,
        )
      }
    } catch (error) {
      console.error("Error processing images:", error)
      setError(`Error processing images: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsProcessing(false)
      setProgress(100)
    }
  }

  // Handle manual image analysis
  const handleManualAnalyze = async (formData) => {
    setIsLoading(true)
    setProgress(0)
    setResults([])
    setError(null)
    setActiveMode("manual")
    setPrompt(formData.get("prompt") || "")

    try {
      console.log("Starting manual image analysis...")
      const response = await analyzeImages(formData)
      console.log("Analysis complete:", response)

      // Check for errors
      if (response.error) {
        setError(response.error)
        console.error("Error returned from analyzeImages:", response.error)
        return
      }

      // Update state with response data
      setResults(response.results || [])
      setStats({
        totalFetched: response.totalFetched || 0,
        processedCount: response.processedCount || 0,
        promptTokens: response.promptTokens || 0,
        completionTokens: response.completionTokens || 0,
        totalTokens: response.totalTokens || 0,
      })
    } catch (error) {
      console.error("Error analyzing images:", error)
      setError(`Error analyzing images: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
      setProgress(100)
    }
  }

  const handlePageChange = (page) => {
    // Create a new FormData object with the current form values
    const form = document.querySelector("form")
    if (!form) return

    const formData = new FormData(form)
    formData.set("page", page.toString())

    handleFetchImages(formData)
  }

  const handleFormSubmit = (formData) => {
    const inputType = formData.get("input_type")

    // If switching modes, reset state
    if (inputType !== activeMode) {
      resetState(inputType)
    }

    if (inputType === "manual") {
      handleManualAnalyze(formData)
    } else {
      handleFetchImages(formData)
    }
  }

  const handleDownload = async (format) => {
    try {
      console.log(`Downloading results as ${format}...`)
      const formData = new FormData()
      formData.append("data", JSON.stringify(results.length > 0 ? results : images))
      formData.append("format", format)

      const response = await fetch("/api/download", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `results.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      console.log(`Download complete: ${format}`)
    } catch (error) {
      console.error("Error downloading results:", error)
      setError(`Error downloading results: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  // Get pricing information
  const pricing = calculatePricing()

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">ScoutAI Image Dashboard</h1>
        <button className="p-2 rounded-md border dark:border-gray-600" onClick={toggleTheme}>
          {theme === "dark" ? "🌞" : "🌙"}
        </button>
      </div>

      <DashboardForm
        onSubmit={handleFormSubmit}
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        onPageChange={handlePageChange}
        curlCommand={curlCommand}
        activeMode={activeMode}
        onModeChange={(mode) => resetState(mode)}
      />

      {isLoading && (
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent"></div>
            <p className="text-gray-500 dark:text-gray-400">
              {activeMode === "scoutai" ? "Fetching images..." : "Processing image..."}
            </p>
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent"></div>
            <p className="text-gray-500 dark:text-gray-400">Processing images with Wobot AI...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-600 dark:text-red-400">
          <h3 className="font-medium mb-2">Error</h3>
          <p>{error}</p>

          {apiResponse && (
            <div className="mt-4">
              <p className="font-medium">API Response:</p>
              <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-md overflow-x-auto text-xs">
                <div>
                  <strong>Status:</strong> {apiResponse.status || "N/A"}
                  {apiResponse.message !== undefined && (
                    <div>
                      <strong>Message:</strong> {apiResponse.message}
                    </div>
                  )}
                </div>

                {apiResponse.data && (
                  <div className="mt-2">
                    <div>
                      <strong>Images:</strong> {apiResponse.data.data?.length || 0}
                    </div>
                    <div>
                      <strong>Total:</strong> {apiResponse.data.total || "N/A"}
                    </div>
                  </div>
                )}

                <details className="mt-2">
                  <summary className="cursor-pointer text-blue-600 dark:text-blue-400">View Full Response</summary>
                  <pre className="mt-2">{JSON.stringify(apiResponse, null, 2)}</pre>
                </details>
              </div>
            </div>
          )}

          <div className="mt-4">
            <h4 className="font-medium mb-1">Troubleshooting Tips:</h4>
            <ul className="list-disc pl-5 text-sm">
              <li>Verify your Company ID and Task ID are correct</li>
              <li>Check that the date is valid and has images available</li>
              <li>Try a different page number if available</li>
              <li>Check the console logs for more detailed error information</li>
              <li>Ensure your OpenAI API key is valid and has sufficient credits</li>
            </ul>
          </div>
        </div>
      )}

      {/* Display processing stats if available */}
      {stats.processedCount > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6 mt-6">
          <h3 className="text-lg font-medium mb-2">Processing Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p>
                <strong>Images processed:</strong> {stats.processedCount} of {stats.totalFetched}
              </p>
            </div>
            <div>
              <p>
                <strong>Token usage:</strong> {stats.totalTokens.toLocaleString()} (Prompt:{" "}
                {stats.promptTokens.toLocaleString()}, Completion: {stats.completionTokens.toLocaleString()})
              </p>
            </div>
          </div>

          {/* Pricing information */}
          <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
            <h4 className="text-sm font-medium mb-1">Estimated Cost</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
              <div>
                <p>Input: ${pricing.inputCost}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">($0.40 / 1M tokens)</p>
              </div>
              <div>
                <p>Output: ${pricing.outputCost}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">($1.60 / 1M tokens)</p>
              </div>
              <div>
                <p className="font-medium">Total: ${pricing.totalCost}</p>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <button
              onClick={() => handleDownload("json")}
              className="px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 mr-2"
            >
              Download JSON
            </button>
            <button
              onClick={() => handleDownload("csv")}
              className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Download CSV
            </button>
          </div>
        </div>
      )}

      {/* Display ScoutAI images and Process button */}
      {activeMode === "scoutai" && images.length > 0 && !isLoading && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">
                Images ({images.length})
                {pagination && pagination.totalCount > 0 && (
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                    Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalCount} total)
                  </span>
                )}
              </h2>

              {/* Select all checkbox */}
              <div className="ml-4 flex items-center">
                <input
                  type="checkbox"
                  id="select-all"
                  checked={selectedImages.length === images.length && images.length > 0}
                  onChange={toggleAllImages}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="select-all" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Select All
                </label>
                {selectedImages.length > 0 && (
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                    ({selectedImages.length} selected)
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Process with GPT button */}
              {!isProcessing && (
                <button
                  onClick={handleProcessImages}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  disabled={isProcessing || images.length === 0}
                >
                  {selectedImages.length > 0
                    ? `Process ${selectedImages.length} Selected Images`
                    : `Process All Images`}
                </button>
              )}

              {/* Pagination controls */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center gap-2 ml-4">
                  <button
                    className="px-3 py-1 border rounded-md text-sm flex items-center disabled:opacity-50"
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={pagination.currentPage <= 1 || isLoading || isProcessing}
                  >
                    ← Previous
                  </button>
                  <span className="text-sm">
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </span>
                  <button
                    className="px-3 py-1 border rounded-md text-sm flex items-center disabled:opacity-50"
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={pagination.currentPage >= pagination.totalPages || isLoading || isProcessing}
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Image grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {images.map((item, index) => {
              // Find the corresponding result if it exists
              const result = results.find((r) => r.image === item.image) || {}
              // Merge the result with the original item to preserve selection state
              const displayItem = { ...item, ...result }

              return (
                <div
                  key={index}
                  className={`bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden ${
                    displayItem.error ? "border-red-300 dark:border-red-700 border-2" : ""
                  } ${selectedImages.includes(index) ? "ring-2 ring-blue-500" : ""}`}
                >
                  <div className="relative w-full h-48 cursor-pointer" onClick={() => toggleImageSelection(index)}>
                    {/* Serial number badge */}
                    <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded-md text-xs font-medium z-10">
                      #{displayItem.serialNumber}
                    </div>

                    {/* Selection checkbox */}
                    <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedImages.includes(index)}
                        onChange={() => toggleImageSelection(index)}
                        className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </div>

                    {displayItem.image && displayItem.image.startsWith("http") ? (
                      <Image
                        src={displayItem.image || "/placeholder.svg"}
                        alt={`Image ${displayItem.serialNumber}`}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                        <p className="text-sm text-gray-500 dark:text-gray-400">{displayItem.image || "No image"}</p>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    {displayItem.processed ? (
                      <p className="text-sm">
                        <strong>Label:</strong> {displayItem.label}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">Not processed yet</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Bottom pagination controls */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-1 border rounded-md text-sm flex items-center disabled:opacity-50"
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage <= 1 || isLoading || isProcessing}
                >
                  ← Previous
                </button>
                <span className="text-sm">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                <button
                  className="px-3 py-1 border rounded-md text-sm flex items-center disabled:opacity-50"
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage >= pagination.totalPages || isLoading || isProcessing}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Show manual results if any */}
      {activeMode === "manual" && results.length > 0 && !isLoading && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-4">Manual Upload Results</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {results.map((item, index) => (
              <div
                key={index}
                className={`bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden ${
                  item.error ? "border-red-300 dark:border-red-700 border-2" : ""
                }`}
              >
                <div className="relative w-full h-48">
                  {item.image && item.image.startsWith("http") ? (
                    <Image
                      src={item.image || "/placeholder.svg"}
                      alt={`Image ${index + 1}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                      <p className="text-sm text-gray-500 dark:text-gray-400">{item.image || "Uploaded Image"}</p>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-sm">
                    <strong>Label:</strong> {item.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
