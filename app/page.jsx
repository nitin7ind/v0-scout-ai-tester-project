"use client"

import React, { useState, useEffect } from "react"
import { useTheme } from "@/components/theme-provider"
import { processImagesWithGPT } from "@/app/actions/image-processing"
import { analyzeImages } from "@/app/actions/manual-upload"
import { fetchEventsAPI, fetchDriveThruAPI } from "@/app/actions"
import { fetchScoutAIImages } from "@/app/actions/scout-ai-actions"
import { calculateActualGeminiCost, calculateEstimatedImageProcessingCost, compareCosts, calculateComprehensiveCosts, getModelDisplayName } from "@/lib/cost-utils"
import DashboardForm from "@/components/dashboard-form"
import PasswordModal from "@/components/password-modal"
import GeminiLogsViewer from "@/components/gemini-logs-viewer"
import Image from "next/image"
import { Calculator, Code, Moon, Sun } from "lucide-react"
import CostCalculator from "@/components/cost-calculator"
// import { Header } from "@/components/header"

// Helper function to sanitize error messages for display
function sanitizeErrorMessage(message) {
  // If we're not in dev mode, or if the message is already the generic one, return it
  if (message === "Something went wrong. Please try again.") {
    return message
  }

  // Check for API-specific error patterns
  const containsApiDetails = /gemini|googlegenerat|generativelanguage|openai|gpt|api key|503 service|unavailable/i.test(
    message,
  )

  if (containsApiDetails) {
    return "Something went wrong. Please try again."
  }

  return message
}

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
  const [activeMode, setActiveMode] = useState("scoutai") // Changed default to scoutai
  const [selectedModel, setSelectedModel] = useState("gemini") // Default to gemini
  const [selectedGeminiModel, setSelectedGeminiModel] = useState("gemini-2.5-flash") // Default Gemini model
  const [isDevMode, setIsDevMode] = useState(false) // Track if dev mode is enabled
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false) // Track if password modal is open
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
    modelUsed: "gpt",
    geminiModel: "gemini-2.5-flash",
  })
  const { theme, setTheme } = useTheme()
  const [showCalculator, setShowCalculator] = useState(false)
  const [autoFetchTriggered, setAutoFetchTriggered] = useState(false)
  const [logsRefreshTrigger, setLogsRefreshTrigger] = useState(0)

  // Events API specific state
  const [eventsApiKey, setEventsApiKey] = useState("")
  const [eventsEnvironment, setEventsEnvironment] = useState("production")
  const [isEventsKeyValid, setIsEventsKeyValid] = useState(false)
  const [locations, setLocations] = useState([])
  const [tasks, setTasks] = useState([])
  const [cameras, setCameras] = useState([])
  const [selectedLocation, setSelectedLocation] = useState("")
  const [selectedTask, setSelectedTask] = useState("")
  const [selectedCamera, setSelectedCamera] = useState("")
  const [eventsFromDate, setEventsFromDate] = useState(getDefaultFromDate())
  const [eventsToDate, setEventsToDate] = useState(getYesterdayDate())
  const [eventsLimit, setEventsLimit] = useState(10)
  const [eventsPage, setEventsPage] = useState(0)
  const [totalEvents, setTotalEvents] = useState(0)

  // DriveThru-specific state
  const [driveThruApiKey, setDriveThruApiKey] = useState("")
  const [driveThruEnvironment, setDriveThruEnvironment] = useState("production")
  const [isDriveThruKeyValid, setIsDriveThruKeyValid] = useState(false)
  const [driveThruLocations, setDriveThruLocations] = useState([])
  const [driveThruTasks, setDriveThruTasks] = useState([])
  const [driveThruCameras, setDriveThruCameras] = useState([])
  const [selectedDriveThruLocation, setSelectedDriveThruLocation] = useState("")
  const [selectedDriveThruTask, setSelectedDriveThruTask] = useState("")
  const [selectedDriveThruCamera, setSelectedDriveThruCamera] = useState("")
  const [driveThruFromDate, setDriveThruFromDate] = useState(getDefaultFromDate())
  const [driveThruToDate, setDriveThruToDate] = useState(getYesterdayDate())
  const [driveThruLimit, setDriveThruLimit] = useState(10)
  const [driveThruPage, setDriveThruPage] = useState(0)
  const [totalDriveThru, setTotalDriveThru] = useState(0)
  const [driveThruType, setDriveThruType] = useState("detections") // Track if we're in journey or detections mode

  // Helper function to get default from date (30 days ago)
  function getDefaultFromDate() {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date.toISOString().split("T")[0]
  }

  // Helper function to get current date in YYYY-MM-DD format
  function getCurrentDate() {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, "0")
    const day = String(today.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  // Helper function to get yesterday's date in YYYY-MM-DD format
  function getYesterdayDate() {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const year = yesterday.getFullYear()
    const month = String(yesterday.getMonth() + 1).padStart(2, "0")
    const day = String(yesterday.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  // Get base URL for Events API based on environment
  const getEventsBaseUrl = () => {
    return eventsEnvironment === "production"
      ? "https://api.wobot.ai/client/v2"
      : "https://api-staging.wobot.ai/client/v2"
  }

  // Auto-fetch on page load
  useEffect(() => {
    // Only trigger auto-fetch once and only if in scoutai mode
    if (activeMode === "scoutai" && !autoFetchTriggered && !isLoading) {
      setAutoFetchTriggered(true)

      // Create a FormData object with default values
      const formData = new FormData()
      formData.append("input_type", "scoutai")
      formData.append("env", "prod")
      formData.append("company_id", "") // This will be filled by URL param if available
      formData.append("task_id", "681b97b6d80705cc948ddfe4") // SmartSafe Enclosure Open
      formData.append("date", getYesterdayDate())
      formData.append("limit", "12")
      formData.append("page", "1")

      // Check for company ID in URL
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search)
        const companyParam = urlParams.get("company")
        if (companyParam) {
          formData.set("company_id", companyParam)
          // Only fetch if we have a company ID
          handleFetchImages(formData)
        }
      }
    }
  }, [activeMode, autoFetchTriggered, isLoading])

  // Calculate pricing based on token usage and model
  const calculatePricing = () => {
    // Collect usage metadata from processed results for actual cost calculation
    const actualUsageData = results
      .filter(result => result.usageMetadata && result.modelUsed === 'gemini')
      .map(result => result.usageMetadata)
    
    // Calculate actual costs if we have usage metadata
    let actualCosts = null
    if (actualUsageData.length > 0) {
      // Aggregate usage metadata
      const aggregatedUsage = actualUsageData.reduce((acc, usage) => ({
        promptTokenCount: (acc.promptTokenCount || 0) + (usage.promptTokenCount || 0),
        candidatesTokenCount: (acc.candidatesTokenCount || 0) + (usage.candidatesTokenCount || 0),
        thoughtsTokenCount: (acc.thoughtsTokenCount || 0) + (usage.thoughtsTokenCount || 0),
        totalTokenCount: (acc.totalTokenCount || 0) + (usage.totalTokenCount || 0),
        promptTokensDetails: usage.promptTokensDetails || []
      }), {})
      
      // Use the specific Gemini model for cost calculation
      const geminiModelUsed = stats.geminiModel || selectedGeminiModel || "gemini-2.5-flash"
      actualCosts = calculateActualGeminiCost(aggregatedUsage, geminiModelUsed)
    }

    // Calculate estimated costs with current pricing
    const modelUsed = stats.modelUsed || "gemini"
    const geminiModelUsed = stats.geminiModel || selectedGeminiModel || "gemini-2.5-flash"
    const currentEstimate = calculateEstimatedImageProcessingCost(stats.processedCount || 1, modelUsed, geminiModelUsed)
    
    // Calculate legacy costs for comparison (only for Gemini)
    let legacyEstimate = null
    if (modelUsed === "gemini") {
      // Legacy Gemini pricing for comparison
      const legacyInputRate = 0.15 / 1000000 // $0.15 per 1M tokens
      const legacyOutputRate = 0.6 / 1000000 // $0.60 per 1M tokens
      const legacyInputCost = stats.promptTokens * legacyInputRate
      const legacyOutputCost = stats.completionTokens * legacyOutputRate
      legacyEstimate = {
        type: 'legacy_estimated',
        model: 'gemini-legacy',
        totalTokens: stats.totalTokens,
        inputTokens: stats.promptTokens,
        outputTokens: stats.completionTokens,
        inputCost: legacyInputCost,
        outputCost: legacyOutputCost,
        totalCost: legacyInputCost + legacyOutputCost
      }
    } else {
      // For GPT, use current pricing as there's no legacy comparison
      legacyEstimate = currentEstimate
    }

    const estimatedCosts = {
      type: 'estimated_current',
      inputCost: currentEstimate.inputCost.toFixed(6),
      outputCost: currentEstimate.outputCost.toFixed(6),
      totalCost: currentEstimate.totalCost.toFixed(6),
      modelUsed: currentEstimate.model,
      modelName: currentEstimate.modelName,
      inputTokens: currentEstimate.inputTokens,
      outputTokens: currentEstimate.outputTokens,
      totalTokens: currentEstimate.totalTokens,
      pricing: currentEstimate.pricing
    }

    // Add legacy comparison for display
    const legacyCosts = legacyEstimate ? {
      type: 'estimated_legacy',
      inputCost: legacyEstimate.inputCost.toFixed(6),
      outputCost: legacyEstimate.outputCost.toFixed(6),
      totalCost: legacyEstimate.totalCost.toFixed(6),
      modelUsed: legacyEstimate.model,
      inputTokens: legacyEstimate.inputTokens,
      outputTokens: legacyEstimate.outputTokens,
      totalTokens: legacyEstimate.totalTokens,
    } : null

    return {
      estimated: estimatedCosts,
      legacy: legacyCosts,
      actual: actualCosts ? {
        ...actualCosts,
        inputCost: actualCosts.inputCost.toFixed(6),
        outputCost: actualCosts.outputCost.toFixed(6),
        totalCost: actualCosts.totalCost.toFixed(6),
        inputRate: `$${(actualCosts.pricing.inputRate * 1000000).toFixed(2)}`,
        outputRate: `$${(actualCosts.pricing.outputRate * 1000000).toFixed(2)}`,
      } : null,
      comparison: actualCosts ? compareCosts(actualCosts, currentEstimate) : null,
      pricingComparison: legacyCosts && modelUsed === "gemini" ? {
        costDifference: (currentEstimate.totalCost - legacyEstimate.totalCost).toFixed(6),
        percentageIncrease: legacyEstimate.totalCost > 0 
          ? (((currentEstimate.totalCost - legacyEstimate.totalCost) / legacyEstimate.totalCost) * 100).toFixed(1)
          : "0.0",
        isCurrentHigher: currentEstimate.totalCost > legacyEstimate.totalCost
      } : null
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
      modelUsed: selectedModel,
      geminiModel: selectedModel === "gemini" ? selectedGeminiModel : "gemini-2.5-flash",
    })
    setActiveMode(mode)

    // Reset Events API state if switching away from events mode
    if (mode !== "events") {
      setIsEventsKeyValid(false)
      setLocations([])
      setTasks([])
      setCameras([])
      setSelectedLocation("")
      setSelectedTask("")
      setSelectedCamera("")
    }

    // Reset DriveThru API state if switching away from drivethru mode
    if (mode !== "drivethru") {
      setIsDriveThruKeyValid(false)
      setDriveThruLocations([])
      setDriveThruTasks([])
      setDriveThruCameras([])
      setSelectedDriveThruLocation("")
      setSelectedDriveThruTask("")
      setSelectedDriveThruCamera("")
      setDriveThruType("detections") // Reset to default
    }
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
    
    // Determine the model being used
    const modelType = formData.get("model_type") || "gpt"
    const geminiModel = formData.get("gemini_model") || "gemini-2.5-flash"
    
    setSelectedModel(modelType)
    if (modelType === "gemini") {
      setSelectedGeminiModel(geminiModel)
    }

    try {
      const response = await fetchScoutAIImages(formData)

      // Check for errors
      if (response.error) {
        setError(isDevMode ? response.error : "Something went wrong. Please try again.")
        return
      }

      // Update state with response data
      setImages(response.images || [])
      setPagination({
        currentPage: response.currentPage || 1,
        totalPages: response.totalPages || 1,
        totalCount: 0,
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
        modelUsed: selectedModel,
        geminiModel: selectedModel === "gemini" ? selectedGeminiModel : "gemini-2.5-flash",
      })

      // Show error if no images were fetched
      if (!response.images || response.images.length === 0) {
        setError(
          isDevMode
            ? "No images were found. The ScoutAI API returned zero images. Please check your input parameters (company ID, task ID, date) and try again."
            : "Something went wrong. Please try again.",
        )
      }
    } catch (error) {
      setError(
        isDevMode
          ? `Error fetching images: ${error instanceof Error ? error.message : String(error)}`
          : "Something went wrong. Please try again.",
      )
    } finally {
      setIsLoading(false)
    }
  }

  // Update the handleProcessImages function to show batch processing progress
  const handleProcessImages = async () => {
    if (images.length === 0) {
      setError(
        isDevMode ? "No images to process. Please fetch images first." : "Something went wrong. Please try again.",
      )
      return
    }

    // Validate prompt only when processing images
    if (!prompt) {
      setError(
        isDevMode
          ? "Please select a prompt for analysis before processing images."
          : "Something went wrong. Please try again.",
      )
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setError(null)

    try {
      // Only process selected images if any are selected, otherwise process all
      const indicesToProcess = selectedImages.length > 0 ? selectedImages : null
      const totalToProcess = indicesToProcess ? selectedImages.length : images.length

      // Get batch size from form if in dev mode
      let batchSize = 10 // Default batch size
      if (isDevMode) {
        const batchSizeInput = document.getElementById("batch_size")
        if (batchSizeInput) {
          batchSize = Number.parseInt(batchSizeInput.value) || 10
        }
      }

      // Use the selected Gemini model from state
      const geminiModel = selectedGeminiModel

      // Show initial progress
      setProgress(5)

      const response = await processImagesWithGPT(images, prompt, indicesToProcess, selectedModel, batchSize, geminiModel)

      // Update progress as processing completes
      setProgress(100)

      // Check for errors
      if (response.error) {
        setError(isDevMode ? response.error : "Something went wrong. Please try again.")
        return
      }

      // Sanitize any error messages in the results
      if (response.results && !isDevMode) {
        response.results = response.results.map((item) => {
          if (item.error) {
            return {
              ...item,
              label: sanitizeErrorMessage(item.label),
            }
          }
          return item
        })
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
        modelUsed: response.modelUsed || selectedModel,
        geminiModel: selectedModel === "gemini" ? geminiModel : undefined,
      })

      // Trigger logs refresh if in dev mode
      if (isDevMode) {
        setLogsRefreshTrigger(prev => prev + 1)
      }

      // Show warning if some images failed processing
      if (response.errorCount > 0) {
        // Warning: some images failed to process
      }
    } catch (error) {
      setError(
        isDevMode
          ? `Error processing images: ${error instanceof Error ? error.message : String(error)}`
          : "Something went wrong. Please try again.",
      )
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle manual image analysis
  const handleManualAnalyze = async (formData) => {
    // Check if prompt is provided for manual analysis
    const promptValue = formData.get("prompt")
    if (!promptValue) {
      setError(isDevMode ? "Please select a prompt for analysis." : "Something went wrong. Please try again.")
      return
    }

    setIsLoading(true)
    setProgress(0)
    setResults([])
    setError(null)
    setActiveMode("manual")
    setPrompt(promptValue)
    
    // Determine the model being used
    const modelType = formData.get("model_type") || "gpt"
    const geminiModel = formData.get("gemini_model") || "gemini-2.5-flash"
    
    console.log("🚀 handleManualAnalyze debug:")
    console.log("  modelType from formData:", modelType)
    console.log("  geminiModel from formData:", geminiModel)
    
    setSelectedModel(modelType)
    if (modelType === "gemini") {
      setSelectedGeminiModel(geminiModel)
      console.log("  ✅ Updated selectedGeminiModel state to:", geminiModel)
    }

    try {
      const response = await analyzeImages(formData)

      // Check for errors
      if (response.error) {
        setError(isDevMode ? response.error : "Something went wrong. Please try again.")
        return
      }

      // Sanitize any error messages in the results
      if (response.results && !isDevMode) {
        response.results = response.results.map((item) => {
          if (item.error) {
            return {
              ...item,
              label: sanitizeErrorMessage(item.label),
            }
          }
          return item
        })
      }

      // Update state with response data
      setResults(response.results || [])
      if (response.results && response.results.length > 0) {
        // Create object URLs for any uploaded files
        setResults(createObjectURLsForUploadedFiles(response.results))
      }
      setStats({
        totalFetched: response.totalFetched || 0,
        processedCount: response.processedCount || 0,
        promptTokens: response.promptTokens || 0,
        completionTokens: response.completionTokens || 0,
        totalTokens: response.totalTokens || 0,
        modelUsed: modelType,
        geminiModel: modelType === "gemini" ? geminiModel : undefined,
      })

      // Trigger logs refresh if in dev mode
      if (isDevMode) {
        setLogsRefreshTrigger(prev => prev + 1)
      }
    } catch (error) {
      setError(
        isDevMode
          ? `Error analyzing images: ${error instanceof Error ? error.message : String(error)}`
          : "Something went wrong. Please try again.",
      )
    } finally {
      setIsLoading(false)
      setProgress(100)
    }
  }

  // Create object URLs for uploaded files
  const createObjectURLsForUploadedFiles = (results) => {
    // Find the file input element
    const fileInput = document.getElementById("manual_image")

    if (fileInput && fileInput.files.length > 0 && results.length > 0) {
      // If we have an uploaded file and results, create an object URL
      const file = fileInput.files[0]

      // Find the result that has isUploadedFile flag
      const uploadedResult = results.find((r) => r.isUploadedFile)

      if (uploadedResult) {
        // Create and assign object URL
        uploadedResult.objectURL = URL.createObjectURL(file)
      }
    }

    return results
  }

  const handlePageChange = (page) => {
    if (activeMode === "scoutai") {
      // Create a new FormData object with the current form values
      const form = document.querySelector("form")
      if (!form) return

      const formData = new FormData(form)
      formData.set("page", page.toString())

      handleFetchImages(formData)
    } else if (activeMode === "events") {
      // For Events API, use the events page change handler
      handleEventsPageChange(page - 1) // Convert to 0-indexed for Events API
    } else if (activeMode === "drivethru") {
      // For DriveThru API, use the drivethru page change handler
      handleDriveThruPageChange(page - 1) // Convert to 0-indexed for DriveThru API
    }
  }

  // Update the handleFormSubmit function to handle the Events API option
  const handleFormSubmit = (formData) => {
    const inputType = formData.get("input_type")

    // If switching modes, reset state
    if (inputType !== activeMode) {
      resetState(inputType)
    }

    if (inputType === "manual") {
      // For manual mode, we need a prompt
      const promptValue = formData.get("prompt")
      if (!promptValue) {
        setError(isDevMode ? "Please select a prompt for analysis." : "Something went wrong. Please try again.")
        return
      }
      handleManualAnalyze(formData)
    } else if (inputType === "events") {
      // For Events API, we need to handle API key validation first
      const apiKey = formData.get("api_key")
      const env = formData.get("events_env") || "production"

      setEventsApiKey(apiKey)
      setEventsEnvironment(env)

      if (isEventsKeyValid) {
        // If key is already validated, fetch events
        handleFetchEvents(formData)
      } else {
        // Otherwise, validate the key first
        validateEventsApiKey(apiKey, env)
      }
    } else if (inputType === "drivethru") {
      // For DriveThru API, we need to handle API key validation first
      const apiKey = formData.get("api_key")
      const env = formData.get("drivethru_env") || "production"

      setDriveThruApiKey(apiKey)
      setDriveThruEnvironment(env)

      if (isDriveThruKeyValid) {
        // If key is already validated, fetch DriveThru data
        handleFetchDriveThru(formData)
      } else {
        // Otherwise, validate the key first
        validateDriveThruApiKey(apiKey, env)
      }
    } else {
      // For Scout AI API, we don't need a prompt to fetch images
      // Remove any prompt validation here - prompt is only needed for processing
      handleFetchImages(formData)
    }
  }

  // Validate Events API key
  const validateEventsApiKey = async (apiKey, environment) => {
    console.log("🔍 Events API Key Validation - Starting", { environment, hasApiKey: !!apiKey })
    
    if (!apiKey) {
      console.error("❌ Events API Key Validation - API key is missing")
      setError("API key is required")
      return
    }

    setIsLoading(true)
    setError(null)
    setEventsEnvironment(environment)

    try {
      const baseUrl =
        environment === "production" ? "https://api.wobot.ai/client/v2" : "https://api-staging.wobot.ai/client/v2"

      const url = `${baseUrl}/locations/get`
      console.log("🌐 Events API Key Validation - Request URL:", url)

      const startTime = Date.now()
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "ScoutAI-Playground/1.0",
        },
        cache: "no-store",
        // Add timeout for server environments
        signal: AbortSignal.timeout(30000), // 30 second timeout
      })

      const fetchTime = Date.now() - startTime
      console.log(`⏱️  Events API Key Validation - Fetch completed in ${fetchTime}ms, status: ${response.status}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ Events API Key Validation - Response error:", {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText.substring(0, 500),
          headers: Object.fromEntries(response.headers.entries())
        })
        throw new Error(`API key validation failed: ${response.status} - ${errorText}`)
      }

      console.log("📦 Events API Key Validation - Parsing response...")
      const data = await response.json()
      console.log("✅ Events API Key Validation - Response parsed", {
        status: data.status,
        locationsCount: data.data?.length || 0
      })

      if (data.status === 200) {
        setEventsApiKey(apiKey)
        setIsEventsKeyValid(true)
        setLocations(data.data || [])
        console.log("🎯 Events API Key Validation - Success")
      } else {
        throw new Error(data.message || "API key validation failed")
      }
    } catch (error) {
      console.error("💥 Events API Key Validation - Error caught:", {
        name: error.name,
        message: error.message,
        stack: error.stack?.substring(0, 500)
      })
      setError(`API key validation failed: ${error.message}`)
      setIsEventsKeyValid(false)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch tasks for selected location
  const fetchTasks = async (locationId) => {
    if (!locationId || !isEventsKeyValid) return

    setIsLoading(true)
    setError(null)

    try {
      const url = `${getEventsBaseUrl()}/task/list?location=${locationId}`

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${eventsApiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        cache: "no-store",
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to fetch tasks: ${response.status} - ${errorText}`)
      }

      const data = await response.json()

      if (data.status === 200) {
        setTasks(data.data || [])
      } else {
        throw new Error(data.message || "Failed to fetch tasks")
      }
    } catch (error) {
      setError(`Failed to fetch tasks: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch cameras for selected location and task
  const fetchCameras = async (locationId, taskId) => {
    if (!locationId || !taskId || !isEventsKeyValid) return

    setIsLoading(true)
    setError(null)

    try {
      const url = `${getEventsBaseUrl()}/camera/get?location=${locationId}&task=${taskId}`

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${eventsApiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        cache: "no-store",
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to fetch cameras: ${response.status} - ${errorText}`)
      }

      const data = await response.json()

      if (data.status === 200) {
        setCameras(data.data?.data || [])
      } else {
        throw new Error(data.message || "Failed to fetch cameras")
      }
    } catch (error) {
      setError(`Failed to fetch cameras: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle location change
  const handleLocationChange = (locationId) => {
    setSelectedLocation(locationId)
    setSelectedTask("")
    setSelectedCamera("")
    setCameras([])

    if (locationId) {
      fetchTasks(locationId)
    } else {
      setTasks([])
    }
  }

  // Handle task change
  const handleTaskChange = (taskId) => {
    setSelectedTask(taskId)
    setSelectedCamera("")

    if (taskId && selectedLocation) {
      fetchCameras(selectedLocation, taskId)
    } else {
      setCameras([])
    }
  }

  // Add a handleCameraChange function
  const handleCameraChange = (cameraId) => {
    setSelectedCamera(cameraId)
  }

  // Fetch events from the API
  const handleFetchEvents = async (formData) => {
    setIsLoading(true)
    setImages([])
    setResults([])
    setSelectedImages([])
    setError(null)
    setApiCall("")
    setCurlCommand("")
    setApiResponse(null)
    setPrompt(formData.get("prompt") || "")
    setActiveMode("events")
    setSelectedModel(formData.get("model_type") || "gpt")

    // Get form values
    const limit = Number.parseInt(formData.get("events_limit")) || 10
    const page = Number.parseInt(formData.get("events_page")) || 0
    const fromDate = formData.get("events_from_date") || eventsFromDate
    const toDate = formData.get("events_to_date") || eventsToDate
    const locationId = selectedLocation || formData.get("events_location") || ""
    const taskId = selectedTask || formData.get("events_task") || ""
    const cameraId = selectedCamera || formData.get("events_camera") || ""

    // Update state
    setEventsLimit(limit)
    setEventsPage(page)
    setEventsFromDate(fromDate)
    setEventsToDate(toDate)

    try {
      // Build query parameters
      let queryParams = `?from=${fromDate}&to=${toDate}`

      if (locationId) {
        queryParams += `&location=${locationId}`
      }

      if (taskId) {
        queryParams += `&task=${taskId}`
      }

      if (cameraId) {
        queryParams += `&camera=${cameraId}`
      }

      const url = `${getEventsBaseUrl()}/events/get/${limit}/${page}${queryParams}`

      // Create a new FormData object for the server action
      const serverFormData = new FormData()
      serverFormData.append("api_key", eventsApiKey)
      serverFormData.append("events_env", eventsEnvironment)
      serverFormData.append("events_limit", limit.toString())
      serverFormData.append("events_page", page.toString())
      serverFormData.append("events_from_date", fromDate)
      serverFormData.append("events_to_date", toDate)
      serverFormData.append("events_location", locationId)
      serverFormData.append("events_task", taskId)
      serverFormData.append("events_camera", cameraId)

      const response = await fetchEventsAPI(serverFormData)

      // Check for errors
      if (response.error) {
        setError(response.error)
        return
      }

      // Update state with response data
      setImages(response.images || [])
      setPagination({
        currentPage: response.currentPage || 1,
        totalPages: response.totalPages || 1,
        totalCount: 0,
      })
      setTotalEvents(response.totalCount || 0)
      setApiCall(response.apiCall || "")
      setCurlCommand(response.curlCommand || "")
      setApiResponse(response.apiResponse)
      setStats({
        totalFetched: response.images?.length || 0,
        processedCount: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        modelUsed: selectedModel,
        geminiModel: selectedModel === "gemini" ? selectedGeminiModel : "gemini-2.5-flash",
      })

      // Show error if no images were fetched
      if (!response.images || response.images.length === 0) {
        setError(
          "No events were found. The Events API returned zero events. Please check your input parameters (task ID, dates) and try again.",
        )
      }
    } catch (error) {
      setError(`Error fetching events: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle Events API page change
  const handleEventsPageChange = (newPage) => {
    setEventsPage(newPage)

    // Create a new FormData object for the form submission
    const form = document.querySelector("form")
    if (!form) return

    const formData = new FormData(form)
    formData.set("events_page", newPage.toString())

    handleFetchEvents(formData)
  }

  // DriveThru API functions
  const validateDriveThruApiKey = async (apiKey, environment) => {
    if (!apiKey.trim()) {
      setError("API key is required")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Try to fetch locations as a validation test
      const baseUrl = environment === "production" ? "https://api.wobot.ai" : "https://api-staging.wobot.ai"
      const response = await fetch(`${baseUrl}/client/v2/locations/get`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      })

      if (!response.ok) {
        throw new Error(`API key validation failed: ${response.status}`)
      }

      const data = await response.json()

      if (data.status === 200) {
        // Store the API key and environment in state
        setDriveThruApiKey(apiKey)
        setDriveThruEnvironment(environment)
        setIsDriveThruKeyValid(true)
        setDriveThruLocations(data.data || [])
      } else {
        throw new Error(data.message || "API key validation failed")
      }
    } catch (error) {
      setError(`API key validation failed: ${error.message}`)
      setIsDriveThruKeyValid(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDriveThruLocationChange = (locationId) => {
    setSelectedDriveThruLocation(locationId)
    setSelectedDriveThruTask("")
    setSelectedDriveThruCamera("")
    setDriveThruTasks([])
    setDriveThruCameras([])

    if (locationId && isDriveThruKeyValid) {
      fetchDriveThruTasks(locationId)
    }
  }

  const fetchDriveThruTasks = async (locationId) => {
    if (!locationId) return

    setIsLoading(true)
    setError(null)

    try {
      const baseUrl = driveThruEnvironment === "production" ? "https://api.wobot.ai" : "https://api-staging.wobot.ai"
      const response = await fetch(`${baseUrl}/client/v2/task/list?location=${locationId}`, {
        headers: {
          Authorization: `Bearer ${driveThruApiKey}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.status}`)
      }

      const data = await response.json()

      if (data.status === 200) {
        setDriveThruTasks(data.data || [])
      } else {
        throw new Error(data.message || "Failed to fetch tasks")
      }
    } catch (error) {
      setError(`Failed to fetch tasks: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDriveThruTaskChange = (taskId) => {
    setSelectedDriveThruTask(taskId)
    setSelectedDriveThruCamera("")
    setDriveThruCameras([])

    if (taskId && selectedDriveThruLocation && isDriveThruKeyValid) {
      fetchDriveThruCameras(selectedDriveThruLocation, taskId)
    }
  }

  const fetchDriveThruCameras = async (locationId, taskId) => {
    if (!locationId || !taskId) return

    setIsLoading(true)
    setError(null)

    try {
      const baseUrl = driveThruEnvironment === "production" ? "https://api.wobot.ai" : "https://api-staging.wobot.ai"
      const response = await fetch(`${baseUrl}/client/v2/camera/get?location=${locationId}&task=${taskId}`, {
        headers: {
          Authorization: `Bearer ${driveThruApiKey}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch cameras: ${response.status}`)
      }

      const data = await response.json()

      if (data.status === 200) {
        setDriveThruCameras(data.data?.data || [])
      } else {
        throw new Error(data.message || "Failed to fetch cameras")
      }
    } catch (error) {
      setError(`Failed to fetch cameras: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDriveThruCameraChange = (cameraId) => {
    setSelectedDriveThruCamera(cameraId)
  }

  const handleFetchDriveThru = async (formData) => {
    setIsLoading(true)
    setImages([])
    setResults([])
    setSelectedImages([])
    setError(null)
    setApiCall("")
    setCurlCommand("")
    setApiResponse(null)
    setActiveMode("drivethru")

    // Store the DriveThru type for UI rendering
    const driveThruDataType = formData.get("drivethru_type") || "detections"
    setDriveThruType(driveThruDataType)

    try {
      const response = await fetchDriveThruAPI(formData)

      // Check for errors
      if (response.error) {
        // Temporarily show the actual error for debugging
        setError(`DriveThru API Error: ${response.error}`)
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
        modelUsed: selectedModel,
        geminiModel: selectedModel === "gemini" ? selectedGeminiModel : "gemini-2.5-flash",
      })

      // Show error if no images were fetched
      if (!response.images || response.images.length === 0) {
        setError(
          "No DriveThru data found. Please check your input parameters (dates, location) and try again.",
        )
      }
    } catch (error) {
      setError(`Error fetching DriveThru data: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle DriveThru API page change
  const handleDriveThruPageChange = (newPage) => {
    setDriveThruPage(newPage)

    // Create a new FormData object for the form submission
    const form = document.querySelector("form")
    if (!form) return

    const formData = new FormData(form)
    formData.set("drivethru_page", newPage.toString())

    handleFetchDriveThru(formData)
  }

  const handleDownload = async (format) => {
    try {
      // Prepare comprehensive data based on the active mode
      let downloadData = []
      let apiType = activeMode
      
      if (results.length > 0) {
        // If we have processed results, merge them with original images data
        downloadData = images.map((image, index) => {
          const result = results.find((r) => r.image === image.image) || {}
          return {
            ...image,
            ...result,
            serialNumber: image.serialNumber || index + 1,
            processed: !!result.label,
            error: !!result.error
          }
        })
      } else {
        // If no processed results, just use the images data
        downloadData = images.map((image, index) => ({
          ...image,
          serialNumber: image.serialNumber || index + 1,
          processed: false,
          error: false
        }))
      }
      
      // Add metadata based on API type and actual response structure
      if (activeMode === "scoutai") {
        downloadData = downloadData.map(item => ({
          ...item,
          scoutData: {
            imageId: item.id || item._id || "",
            companyId: item.companyId || "",
            taskId: item.taskId || "",
            locationId: item.locationId || "",
            date: item.date || "",
            time: item.time || "",
            createdAt: item.createdAt || "",
            // ScoutAI doesn't have complex metadata in the current implementation
            // The image URL is the main data point
          }
        }))
      } else if (activeMode === "events") {
        downloadData = downloadData.map(item => ({
          ...item,
          eventData: {
            // Event identification
            eventId: item.eventData?._id || "",
            uid: item.eventData?.uid || "",
            title: item.eventData?.title || "",
            
            // Timestamps
            date: item.eventData?.date || "",
            createdAt: item.eventData?.createdAt || "",
            detectedAt: item.eventData?.detectedAt || "",
            taskTime: item.eventData?.taskTime || "",
            
            // Location information
            location: item.eventData?.metadata?.location || "",
            locationId: item.eventData?.metadata?.locationId || "",
            city: item.eventData?.metadata?.city || "",
            region: item.eventData?.metadata?.region || "",
            
            // Task and camera information
            task: item.eventData?.metadata?.task || "",
            taskId: item.eventData?.task || "",
            camera: item.eventData?.camera?.camera || "",
            cameraId: item.eventData?.camera?._id || "",
            
            // Event details
            confidence: item.eventData?.confidence || "",
            modelType: item.eventData?.modelType?.label || "",
            timezone: item.eventData?.timezone || "",
            
            // Additional metadata
            checklist: item.eventData?.metadata?.checklist || "",
            raisedFrom: item.eventData?.raisedFrom || "",
            additionalInfo: item.eventData?.additionalInfo || "",
            
            // Incident information
            incidentInfo: item.eventData?.incidentInfo || [],
            
            // Store full event data for reference
            ...item.eventData
          }
        }))
      } else if (activeMode === "drivethru") {
        downloadData = downloadData.map(item => ({
          ...item,
          driveThruData: {
            // Detection/Journey identification
            detectionId: item.eventData?._id || "",
            journeyId: item.eventData?.journeyId || item.eventData?.journey || "",
            uid: item.eventData?.uid || "",
            
            // Timestamps
            date: item.eventData?.date || item.eventData?.dateToString || "",
            time: item.eventData?.time || "",
            createdAt: item.eventData?.created_at || item.eventData?.createdAt || "",
            updatedAt: item.eventData?.updated_at || item.eventData?.updatedAt || "",
            
            // Location information
            location: item.eventData?.metadata?.location || "",
            locationId: item.eventData?.location || "",
            city: item.eventData?.metadata?.city || "",
            region: item.eventData?.metadata?.region || "",
            
            // DriveThru specific data
            type: item.eventData?.type || "detection",
            station: item.eventData?.station || item.eventData?.stationData?.station || "",
            stationType: item.eventData?.stationType || item.eventData?.stationData?.stationType || "",
            orderNo: item.eventData?.orderNo || item.eventData?.stationData?.orderNo || "",
            
            // Vehicle information
            lp: item.eventData?.lp || "",
            lpr: item.eventData?.lpr || "",
            lprConfidence: item.eventData?.lprConfidence || "",
            confidenceScore: item.eventData?.confidenceScore || "",
            
            // Camera information
            camera: item.eventData?.camera || "",
            cameraId: item.eventData?.camera || "",
            
            // Journey specific data (for journey API)
            imageType: item.eventData?.imageType || "", // "entry" or "exit"
            duration: item.eventData?.stationData?.duration || "",
            transitTime: item.eventData?.stationData?.transitTime || "",
            entryTime: item.eventData?.stationData?.entryTime || "",
            exitTime: item.eventData?.stationData?.exitTime || "",
            
            // Additional metadata
            timezone: item.eventData?.timezone || "",
            primary: item.eventData?.primary || item.eventData?.stationData?.primary || false,
            halt: item.eventData?.halt || item.eventData?.stationData?.halt || false,
            goal: item.eventData?.goal || item.eventData?.stationData?.goal || "",
            
            // Store full event data for reference
            ...item.eventData
          }
        }))
      }

      const formData = new FormData()
      formData.append("data", JSON.stringify(downloadData))
      formData.append("format", format)
      formData.append("apiType", apiType)

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
      a.download = `${apiType}-results.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

    } catch (error) {
      setError(`Error downloading results: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  // Toggle dev mode modal
  const toggleDevModeModal = () => {
    setIsPasswordModalOpen(true)
  }

  // Handle dev mode password submission
  const handleDevModePassword = (success) => {
    if (success) {
      setIsDevMode(true)
    }
    setIsPasswordModalOpen(false)
  }

  // Handle prompt changes from the form
  const handlePromptChange = (newPrompt) => {
    setPrompt(newPrompt)
  }

  // Handle model changes from the form
  const handleModelChange = (newModel) => {
    setSelectedModel(newModel)
  }

  // Handle Gemini model changes from the form
  const handleGeminiModelChange = (newGeminiModel) => {
    console.log("🎯 handleGeminiModelChange called with:", newGeminiModel)
    setSelectedGeminiModel(newGeminiModel)
    console.log("  ✅ Updated selectedGeminiModel state to:", newGeminiModel)
  }

  // Get pricing information
  const pricing = calculatePricing()

  // Get friendly model name for display
  const getFriendlyModelName = (modelType) => {
    return modelType === "gemini" ? "Gemini" : "ChatGPT"
  }

  // Clean up object URLs when component unmounts or results change
  React.useEffect(() => {
    return () => {
      // Clean up any object URLs to prevent memory leaks
      results.forEach((result) => {
        if (result.objectURL) {
          URL.revokeObjectURL(result.objectURL)
        }
      })
    }
  }, [results])

  // Effect to update locations dropdown when API key is validated
  useEffect(() => {
    if (isEventsKeyValid && activeMode === "events") {
      // If we have a valid API key, update the form with the locations
      const locationSelect = document.getElementById("events_location")
      if (locationSelect) {
        // Populate the locations dropdown
        locationSelect.innerHTML = '<option value="">Select a location...</option>'
        locations.forEach((location) => {
          const option = document.createElement("option")
          option.value = location._id
          option.textContent = `${location.area} (${location.locationId})`
          locationSelect.appendChild(option)
        })
      }
    }
  }, [isEventsKeyValid, locations, activeMode])

  // Toggle calculator modal
  const toggleCalculator = () => {
    setShowCalculator(!showCalculator)
  }

  // Helper function to group DriveThru journey images by journey ID
  const groupJourneyImages = (images) => {
    const journeyGroups = {}
    
    images.forEach((image, index) => {
      const journeyId = image.eventData?.journeyId || image.eventData?._id || `journey-${index}`
      const carId = image.eventData?.lp || image.eventData?.lpr || `Car-${journeyId.slice(-6)}`
      
      if (!journeyGroups[journeyId]) {
        journeyGroups[journeyId] = {
          journeyId,
          carId,
          images: [],
          metadata: {
            location: image.eventData?.metadata?.location || "",
            date: image.eventData?.date || image.eventData?.dateToString || "",
            totalJourneyTime: image.eventData?.totalJourneyTime || 0,
            isCompleted: image.eventData?.isCompleted || false,
          }
        }
      }
      
      journeyGroups[journeyId].images.push({
        ...image,
        originalIndex: index
      })
    })
    
    return Object.values(journeyGroups)
  }

  // Update the return statement to remove the Events API tab
  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-baseline gap-3">
          <Image src="/images/wobot-logo.png" alt="Wobot.ai Logo" width={120} height={30} priority />
          <h1 className="text-2xl font-medium">Scout AI Playground</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Calculator toggle */}
          <button
            className={`p-1 rounded-md border ${
              showCalculator
                ? "border-green-500 text-green-500"
                : "border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400"
            }`}
            onClick={toggleCalculator}
            title="Cost Calculator"
          >
            <Calculator size={18} />
          </button>

          {/* Dev mode toggle */}
          <button
            className={`p-1 rounded-md border ${
              isDevMode
                ? "border-blue-500 text-blue-500"
                : "border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400"
            }`}
            onClick={toggleDevModeModal}
            title={isDevMode ? "Developer Mode Active" : "Enable Developer Mode"}
          >
            <Code size={18} />
          </button>

          {/* Theme toggle */}
          <button className="p-1 rounded-md border dark:border-gray-600" onClick={toggleTheme}>
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>

      {/* Show calculator if toggled */}
      {showCalculator && (
        <div className="mb-6">
          <CostCalculator isDevMode={isDevMode} />
        </div>
      )}

      {/* DEBUG: Log current state values */}
      {isDevMode && console.log("📊 Current state:", { selectedModel, selectedGeminiModel })}

      <DashboardForm
        onSubmit={handleFormSubmit}
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        onPageChange={handlePageChange}
        curlCommand={curlCommand}
        activeMode={activeMode}
        onModeChange={(mode) => resetState(mode)}
        onPromptChange={handlePromptChange}
        selectedModel={selectedModel}
        onModelChange={handleModelChange}
        selectedGeminiModel={selectedGeminiModel}
        onGeminiModelChange={handleGeminiModelChange}
        isDevMode={isDevMode}
        // Events API specific props
        isEventsKeyValid={isEventsKeyValid}
        eventsApiKey={eventsApiKey}
        eventsEnvironment={eventsEnvironment}
        eventsLocations={locations}
        eventsTasks={tasks}
        eventsCameras={cameras}
        eventsLocation={selectedLocation}
        eventsTask={selectedTask}
        eventsCamera={selectedCamera}
        eventsPage={eventsPage}
        onEventsApiValidate={(apiKey, env) => validateEventsApiKey(apiKey, env)}
        onEventsApiReset={() => setIsEventsKeyValid(false)}
        onEventsLocationChange={handleLocationChange}
        onEventsTaskChange={handleTaskChange}
        onEventsCameraChange={handleCameraChange}
        // DriveThru API specific props
        isDriveThruKeyValid={isDriveThruKeyValid}
        driveThruApiKey={driveThruApiKey}
        driveThruEnvironment={driveThruEnvironment}
        driveThruLocations={driveThruLocations}
        driveThruTasks={driveThruTasks}
        driveThruCameras={driveThruCameras}
        driveThruLocation={selectedDriveThruLocation}
        driveThruTask={selectedDriveThruTask}
        driveThruCamera={selectedDriveThruCamera}
        driveThruPage={driveThruPage}
        onDriveThruApiValidate={(apiKey, env) => validateDriveThruApiKey(apiKey, env)}
        onDriveThruApiReset={() => {
          setIsDriveThruKeyValid(false)
          setDriveThruApiKey("")
          setDriveThruEnvironment("production")
          setDriveThruLocations([])
          setDriveThruTasks([])
          setDriveThruCameras([])
          setSelectedDriveThruLocation("")
          setSelectedDriveThruTask("")
          setSelectedDriveThruCamera("")
        }}
        onDriveThruLocationChange={handleDriveThruLocationChange}
        onDriveThruTaskChange={handleDriveThruTaskChange}
        onDriveThruCameraChange={handleDriveThruCameraChange}
      />

      {/* Rest of the playground content... */}
      {isLoading && (
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent"></div>
            <p className="text-gray-500 dark:text-gray-400">
              {activeMode === "scoutai"
                ? "Fetching images..."
                : activeMode === "events"
                  ? "Fetching events..."
                  : activeMode === "drivethru"
                    ? "Fetching DriveThru data..."
                    : "Processing image..."}
            </p>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-600 dark:text-red-400">
          <h3 className="font-medium mb-2">Error</h3>
          {isDevMode ? (
            // Show detailed error in dev mode
            <p>{error}</p>
          ) : (
            // Show generic error in non-dev mode
            <p>Something went wrong. Please try again.</p>
          )}

          {isDevMode && apiResponse && (
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

          {isDevMode && (
            <div className="mt-4">
              <h4 className="font-medium mb-1">Troubleshooting Tips:</h4>
              <ul className="list-disc pl-5 text-sm">
                <li>Verify your Company ID and Task ID are correct</li>
                <li>Check that the date is valid and has images available</li>
                <li>Try a different page number if available</li>
                <li>Check the console logs for more detailed error information</li>
                <li>Ensure your API keys are valid and have sufficient credits</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Display processing stats if available - only in dev mode */}
      {stats.processedCount > 0 && isDevMode && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6 mt-6">
          <h3 className="text-lg font-medium mb-2">Processing Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p>
                <strong>Images processed:</strong> {stats.processedCount} of {stats.totalFetched}
              </p>
              <p>
                <strong>Model used:</strong> {getFriendlyModelName(stats.modelUsed)}
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
            {/* Actual Cost Section - only show for Gemini when available */}
            {pricing.actual && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-1">
                  Actual Cost ({getModelDisplayName(pricing.actual.model) || 'Gemini'})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-sm">
                  <div>
                    <p>Input: ${pricing.actual.inputCost}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      ({pricing.actual.inputTokens} tokens × ${pricing.actual.inputRate}/1M)
                    </p>
                  </div>
                  <div>
                    <p>Output: ${pricing.actual.outputCost}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      ({pricing.actual.outputTokens} tokens × ${pricing.actual.outputRate}/1M)
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Total: ${pricing.actual.totalCost}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {Math.floor(1 / (parseFloat(pricing.actual.totalCost) / stats.processedCount))} images per $1
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Candidates: {pricing.actual.candidatesTokens || 0}<br/>
                      Thoughts: {pricing.actual.thoughtsTokens || 0}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Estimated Cost Section */}
            {/* Estimated Cost Section - COMMENTED OUT */}
            {/* 
            <div className={`${pricing.actual ? 'border-t pt-3 border-gray-200 dark:border-gray-600' : ''} mb-4`}>
              <h4 className="text-sm font-medium mb-1">Estimated Cost (Legacy Pricing)</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                <div>
                  <p>Input: ${pricing.estimated.inputCost}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    (${stats.modelUsed === "gemini" ? "0.15" : "0.40"} / 1M tokens)
                  </p>
                </div>
                <div>
                  <p>Output: ${pricing.estimated.outputCost}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    (${stats.modelUsed === "gemini" ? "0.60" : "1.60"} / 1M tokens)
                  </p>
                </div>
                <div>
                  <p className="font-medium">Total: ${pricing.estimated.totalCost}</p>
                </div>
              </div>
            </div>
            */}

            {/* Comparison Section - COMMENTED OUT */}
            {/*
            {pricing.comparison && (
              <div className="border-t pt-3 border-gray-200 dark:border-gray-600">
                <h4 className="text-sm font-medium mb-1">Cost Comparison</h4>
                <div className="text-sm">
                  <p className={`${pricing.comparison.isActualHigher ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                    Actual vs Estimated: {pricing.comparison.isActualHigher ? '+' : ''}
                    ${pricing.comparison.totalCostDiff.toFixed(6)} 
                    ({pricing.comparison.costDiffPercentage.toFixed(1)}%)
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Token difference - Input: {pricing.comparison.inputTokenDiff > 0 ? '+' : ''}{pricing.comparison.inputTokenDiff}, 
                    Output: {pricing.comparison.outputTokenDiff > 0 ? '+' : ''}{pricing.comparison.outputTokenDiff}
                  </p>
                </div>
              </div>
            )}
            */}
          </div>

          <div className="mt-4">
            <div className="flex items-center gap-1 border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden w-fit">
              <button
                onClick={() => handleDownload("json")}
                className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Download as JSON"
              >
                JSON
              </button>
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>
              <button
                onClick={() => handleDownload("csv")}
                className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Download as CSV"
              >
                CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Display ScoutAI, Events API, or DriveThru API images and Process button */}
      {(activeMode === "scoutai" || activeMode === "events" || activeMode === "drivethru") && images.length > 0 && !isLoading && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-medium">
                {activeMode === "events" ? "Events" : activeMode === "drivethru" ? "DriveThru Data" : "Images"} ({images.length})
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
              {/* Download buttons - always available when there are images */}
              <div className="flex items-center gap-1 border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
                <button
                  onClick={() => handleDownload("json")}
                  className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title="Download as JSON"
                >
                  JSON
                </button>
                <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>
                <button
                  onClick={() => handleDownload("csv")}
                  className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title="Download as CSV"
                >
                  CSV
                </button>
              </div>

              {/* Process with selected model button - always show but disabled when appropriate */}
              <button
                onClick={handleProcessImages}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  !isProcessing && selectedImages.length > 0 && prompt
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                }`}
                disabled={isProcessing || selectedImages.length === 0 || !prompt}
                title={
                  !prompt 
                    ? "Select a prompt to process images"
                    : selectedImages.length === 0
                    ? "Select images to process"
                    : isProcessing
                    ? "Processing in progress..."
                    : "Process selected images"
                }
              >
                {isProcessing 
                  ? "Processing..." 
                  : selectedImages.length > 0 
                    ? `Process ${selectedImages.length} Selected${isDevMode ? ` with ${getFriendlyModelName(selectedModel)}` : ""}`
                    : "Process Selected"
                }
              </button>

              {/* Pagination controls */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center gap-2 ml-4">
                  <button
                    className="px-2 py-1 border rounded-l-md text-sm flex items-center justify-center disabled:opacity-50"
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={pagination.currentPage <= 1 || isLoading || isProcessing}
                    aria-label="Previous page"
                  >
                    ←
                  </button>
                  <span className="px-3 py-1 border-t border-b text-sm">
                    {pagination.currentPage} / {pagination.totalPages}
                  </span>
                  <button
                    className="px-2 py-1 border rounded-r-md text-sm flex items-center justify-center disabled:opacity-50"
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={pagination.currentPage >= pagination.totalPages || isLoading || isProcessing}
                    aria-label="Next page"
                  >
                    →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Image grid */}
          {activeMode === "drivethru" && driveThruType === "journey" ? (
            /* DriveThru Journey Mode - Group images by journey */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {groupJourneyImages(images).map((journey, journeyIndex) => {
                // Format the date/time properly
                const formatDateTime = (dateStr) => {
                  if (!dateStr) return ""
                  try {
                    return new Date(dateStr).toLocaleString()
                  } catch (e) {
                    return dateStr
                  }
                }

                return (
                  <div
                    key={journey.journeyId}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border"
                  >
                    {/* Journey Header - Simplified */}
                    <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 border-b">
                      <div className="flex justify-between items-center">
                        <div className="flex flex-col gap-1">
                          <h3 className="font-medium text-lg">{journey.carId}</h3>
                          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                            {journey.metadata.location && (
                              <span>📍 {journey.metadata.location}</span>
                            )}
                            {journey.metadata.date && (
                              <span>📅 {formatDateTime(journey.metadata.date)}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {journey.images.length} images
                          </span>
                          {journey.metadata.isCompleted && (
                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded-full">
                              Completed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Journey Images - With slider for more than 2 images */}
                    <div className="p-4">
                      {journey.images.length <= 2 ? (
                        /* Show all images if 2 or fewer */
                        <div className="grid grid-cols-2 gap-4">
                          {journey.images.map((item, imageIndex) => {
                            // Find the corresponding result if it exists
                            const result = results.find((r) => r.image === item.image) || {}
                            // Merge the result with the original item to preserve selection state
                            const displayItem = { ...item, ...result }

                            // Sanitize error messages for non-dev mode
                            let displayLabel = displayItem.label
                            if (!isDevMode && displayItem.error) {
                              displayLabel = sanitizeErrorMessage(displayLabel)
                            }

                            return (
                              <div
                                key={`${journey.journeyId}-${imageIndex}`}
                                className={`bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden ${
                                  displayItem.error ? "border-red-300 dark:border-red-700 border-2" : ""
                                } ${selectedImages.includes(item.originalIndex) ? "ring-2 ring-blue-500" : ""}`}
                              >
                                <div className="relative w-full h-40 cursor-pointer" onClick={() => toggleImageSelection(item.originalIndex)}>

                                  {/* Selection checkbox */}
                                  <div className="absolute top-2 left-2 z-10" onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type="checkbox"
                                      checked={selectedImages.includes(item.originalIndex)}
                                      onChange={() => toggleImageSelection(item.originalIndex)}
                                      className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                  </div>

                                  {displayItem.image && displayItem.image.startsWith("http") ? (
                                    <Image
                                      src={displayItem.image || "/placeholder.svg"}
                                      alt={`${journey.carId} - ${displayItem.eventData?.imageType || "Image"}`}
                                      fill
                                      className="object-cover"
                                      unoptimized
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-600">
                                      <p className="text-sm text-gray-500 dark:text-gray-400">{displayItem.image || "No image"}</p>
                                    </div>
                                  )}
                                </div>

                                {/* Simplified image details - only AI response */}
                                <div className="p-3">
                                  {displayItem.processed ? (
                                    <p className="text-sm">
                                      <strong>AI:</strong>{" "}
                                      {isDevMode && displayItem.error && displayItem.detailedError
                                        ? displayItem.detailedError
                                        : displayLabel}
                                    </p>
                                  ) : (
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Not processed</p>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        /* Slider for more than 2 images */
                        <div className="relative">
                          <div 
                            id={`slider-${journey.journeyId}`}
                            className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                          >
                            {journey.images.map((item, imageIndex) => {
                              // Find the corresponding result if it exists
                              const result = results.find((r) => r.image === item.image) || {}
                              // Merge the result with the original item to preserve selection state
                              const displayItem = { ...item, ...result }

                              // Sanitize error messages for non-dev mode
                              let displayLabel = displayItem.label
                              if (!isDevMode && displayItem.error) {
                                displayLabel = sanitizeErrorMessage(displayLabel)
                              }

                              return (
                                <div
                                  key={`${journey.journeyId}-${imageIndex}`}
                                  className={`flex-shrink-0 w-48 bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden ${
                                    displayItem.error ? "border-red-300 dark:border-red-700 border-2" : ""
                                  } ${selectedImages.includes(item.originalIndex) ? "ring-2 ring-blue-500" : ""}`}
                                >
                                  <div className="relative w-full h-32 cursor-pointer" onClick={() => toggleImageSelection(item.originalIndex)}>
                                    {/* Image type badge */}
                                    <div className="absolute top-1 left-1 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs font-medium z-10">
                                      {displayItem.eventData?.imageType === "entry" ? "Entry" : "Exit"}
                                    </div>

                                    {/* Station info */}
                                    {displayItem.eventData?.stationData?.station && (
                                      <div className="absolute top-1 right-1 bg-blue-600 bg-opacity-80 text-white px-1 py-0.5 rounded text-xs z-10">
                                        {displayItem.eventData.stationData.station}
                                      </div>
                                    )}

                                    {/* Selection checkbox */}
                                    <div className="absolute bottom-1 right-1 z-10" onClick={(e) => e.stopPropagation()}>
                                      <input
                                        type="checkbox"
                                        checked={selectedImages.includes(item.originalIndex)}
                                        onChange={() => toggleImageSelection(item.originalIndex)}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                      />
                                    </div>

                                    {displayItem.image && displayItem.image.startsWith("http") ? (
                                      <Image
                                        src={displayItem.image || "/placeholder.svg"}
                                        alt={`${journey.carId} - ${displayItem.eventData?.imageType || "Image"}`}
                                        fill
                                        className="object-cover"
                                        unoptimized
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-600">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{displayItem.image || "No image"}</p>
                                      </div>
                                    )}
                                  </div>

                                  {/* Simplified image details - only AI response */}
                                  <div className="p-2">
                                    {displayItem.processed ? (
                                      <p className="text-xs">
                                        <strong>AI:</strong>{" "}
                                        {isDevMode && displayItem.error && displayItem.detailedError
                                          ? displayItem.detailedError
                                          : displayLabel}
                                      </p>
                                    ) : (
                                      <p className="text-xs text-gray-500 dark:text-gray-400">Not processed</p>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                          
                          {/* Scroll indicators */}
                          <div className="flex justify-center mt-2 gap-1">
                            {Array.from({ length: Math.ceil(journey.images.length / 2) }).map((_, index) => (
                              <div
                                key={index}
                                className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600"
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* Regular grid for other modes (ScoutAI, Events, DriveThru Detections) */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {images.map((item, index) => {
                // Find the corresponding result if it exists
                const result = results.find((r) => r.image === item.image) || {}
                // Merge the result with the original item to preserve selection state
                const displayItem = { ...item, ...result }

                // Sanitize error messages for non-dev mode
                let displayLabel = displayItem.label
                if (!isDevMode && displayItem.error) {
                  displayLabel = sanitizeErrorMessage(displayLabel)
                }

                return (
                  <div
                    key={index}
                    className={`bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden ${
                      displayItem.error ? "border-red-300 dark:border-red-700 border-2" : ""
                    } ${selectedImages.includes(index) ? "ring-2 ring-blue-500" : ""}`}
                  >
                    <div className="relative w-full h-60 cursor-pointer" onClick={() => toggleImageSelection(index)}>
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
                          className="object-fill"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                          <p className="text-sm text-gray-500 dark:text-gray-400">{displayItem.image || "No image"}</p>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      {/* Show event details if available */}
                      {displayItem.eventData && false && (
                        <div className="mb-2">
                          <p className="text-sm font-medium">{displayItem.eventData.title || "Event"}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(displayItem.eventData.createdAt).toLocaleString()}
                          </p>
                          {displayItem.eventData.metadata && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {displayItem.eventData.metadata.location || displayItem.eventData.metadata.locationId || ""}
                            </p>
                          )}
                        </div>
                      )}

                      {displayItem.processed ? (
                        <>
                          <p className="text-sm">
                            <strong>Label:</strong>{" "}
                            {isDevMode && displayItem.error && displayItem.detailedError
                              ? displayItem.detailedError
                              : displayLabel}
                          </p>
                          {displayItem.modelUsed && isDevMode && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Processed with: {getFriendlyModelName(displayItem.modelUsed)}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">Not processed yet</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Bottom pagination controls */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <div className="flex items-center gap-2">
                <button
                  className="px-2 py-1 border rounded-l-md text-sm flex items-center justify-center disabled:opacity-50"
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage <= 1 || isLoading || isProcessing}
                  aria-label="Previous page"
                >
                  ←
                </button>
                <span className="px-3 py-1 border-t border-b text-sm">
                  {pagination.currentPage} / {pagination.totalPages}
                </span>
                <button
                  className="px-2 py-1 border rounded-r-md text-sm flex items-center justify-center disabled:opacity-50"
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage >= pagination.totalPages || isLoading || isProcessing}
                  aria-label="Next page"
                >
                  →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Show manual results if any */}
      {activeMode === "manual" && results.length > 0 && !isLoading && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-medium">Manual Upload Results ({results.length})</h2>
            
            {/* Download buttons for manual results */}
            <div className="flex items-center gap-1 border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
              <button
                onClick={() => handleDownload("json")}
                className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Download as JSON"
              >
                JSON
              </button>
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>
              <button
                onClick={() => handleDownload("csv")}
                className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Download as CSV"
              >
                CSV
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {results.map((item, index) => {
              // Sanitize error messages for non-dev mode
              let displayLabel = item.label
              if (!isDevMode && item.error) {
                displayLabel = sanitizeErrorMessage(displayLabel)
              }

              return (
                <div
                  key={index}
                  className={`bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden ${
                    item.error ? "border-red-300 dark:border-red-700 border-2" : ""
                  }`}
                >
                  <div className="relative w-full h-60">
                    {item.objectURL ? (
                      // Display uploaded file using object URL
                      <Image
                        src={item.objectURL || "/placeholder.svg"}
                        alt={`Uploaded Image ${index + 1}`}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : item.image && item.image.startsWith("http") ? (
                      // Display image from URL
                      <Image
                        src={item.image || "/placeholder.svg"}
                        alt={`Image ${index + 1}`}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      // Fallback display
                      <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {item.isUploadedFile ? `Uploaded: ${item.image}` : item.image || "Uploaded Image"}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-sm">
                      <strong>Label:</strong>{" "}
                      {isDevMode && item.error && item.detailedError ? item.detailedError : displayLabel}
                    </p>
                    {item.modelUsed && isDevMode && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Processed with: {getFriendlyModelName(item.modelUsed)}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Gemini API Logs Viewer - only in dev mode */}
      {isDevMode && (
        <div className="mt-6">
          <GeminiLogsViewer isDevMode={isDevMode} refreshTrigger={logsRefreshTrigger} />
        </div>
      )}

      {/* Password modal for dev mode */}
      <PasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSubmit={handleDevModePassword}
      />
    </div>
  )
}
