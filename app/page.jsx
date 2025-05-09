"use client"

import React, { useState, useEffect } from "react"
import { useTheme } from "@/components/theme-provider"
import { fetchScoutAIImages, processImagesWithGPT, analyzeImages, fetchEventsAPI } from "@/app/actions"
import DashboardForm from "@/components/dashboard-form"
import PasswordModal from "@/components/password-modal"
import Image from "next/image"
import { Calculator, Code, Moon, Sun } from "lucide-react"
import CostCalculator from "@/components/cost-calculator"

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
  const [selectedModel, setSelectedModel] = useState("gemini") // Default to gemini (Glacier)
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
  })
  const { theme, setTheme } = useTheme()
  const [showCalculator, setShowCalculator] = useState(false)

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

  // Calculate pricing based on token usage and model
  const calculatePricing = () => {
    // Different pricing for different models
    let inputRate, outputRate

    if (stats.modelUsed === "gemini") {
      // Gemini pricing
      inputRate = 0.15 / 1000000 // $0.15 per 1M tokens
      outputRate = 0.6 / 1000000 // $0.60 per 1M tokens
    } else {
      // GPT pricing
      inputRate = 0.4 / 1000000 // $0.40 per 1M tokens
      outputRate = 1.6 / 1000000 // $1.60 per 1M tokens
    }

    const inputCost = stats.promptTokens * inputRate
    const outputCost = stats.completionTokens * outputRate
    const totalCost = inputCost + outputCost

    return {
      inputCost: inputCost.toFixed(6),
      outputCost: outputCost.toFixed(6),
      totalCost: totalCost.toFixed(6),
      modelUsed: stats.modelUsed,
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
    setSelectedModel(formData.get("model_type") || "gpt")

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
        modelUsed: selectedModel,
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

  // Update the handleProcessImages function to show batch processing progress
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
      const totalToProcess = indicesToProcess ? selectedImages.length : images.length

      console.log(`Processing ${totalToProcess} images with ${selectedModel.toUpperCase()}...`)

      // Get batch size from form if in dev mode
      let batchSize = 10 // Default batch size
      if (isDevMode) {
        const batchSizeInput = document.getElementById("batch_size")
        if (batchSizeInput) {
          batchSize = Number.parseInt(batchSizeInput.value) || 10
        }
      }

      // Show initial progress
      setProgress(5)

      const response = await processImagesWithGPT(images, prompt, indicesToProcess, selectedModel, batchSize)

      // Update progress as processing completes
      setProgress(100)

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
        modelUsed: response.modelUsed || selectedModel,
      })

      // Show warning if some images failed processing
      if (response.errorCount > 0) {
        console.warn(`Warning: ${response.errorCount} of ${totalToProcess} images failed to process.`)
      }
    } catch (error) {
      console.error("Error processing images:", error)
      setError(`Error processing images: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsProcessing(false)
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
    setSelectedModel(formData.get("model_type") || "gpt")

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
        modelUsed: response.modelUsed || selectedModel,
      })
    } catch (error) {
      console.error("Error analyzing images:", error)
      setError(`Error analyzing images: ${error instanceof Error ? error.message : String(error)}`)
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
    } else {
      handleFetchImages(formData)
    }
  }

  // Validate Events API key
  const validateEventsApiKey = async (apiKey, environment) => {
    if (!apiKey) {
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

      // Create and log the curl command for debugging
      const curlCommand = `curl -X GET "${url}" -H "Authorization: Bearer ${apiKey.substring(0, 5)}..."`
      console.log("=== LOCATIONS API REQUEST ===")
      console.log(`URL: ${url}`)
      console.log(`Headers: { Authorization: "Bearer ${apiKey.substring(0, 5)}..." }`)
      console.log(
        `Full curl command for testing: ${curlCommand.replace(apiKey.substring(0, 5) + "...", "${YOUR_API_KEY}")}`,
      )

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        cache: "no-store",
      })

      console.log("Locations API response status:", response.status)
      console.log("Locations API response headers:", Object.fromEntries([...response.headers.entries()]))

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`API key validation failed (${response.status}): ${errorText}`)
        throw new Error(`API key validation failed: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log("Locations API response data:", data)

      if (data.status === 200) {
        setEventsApiKey(apiKey)
        setIsEventsKeyValid(true)
        setLocations(data.data || [])
        console.log("API key validated successfully. Locations:", data.data)
      } else {
        throw new Error(data.message || "API key validation failed")
      }
    } catch (error) {
      console.error("API key validation error:", error)
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

      // Create and log the curl command for debugging
      const curlCommand = `curl -X GET "${url}" -H "Authorization: Bearer ${eventsApiKey.substring(0, 5)}..."`
      console.log("=== TASK API REQUEST ===")
      console.log(`URL: ${url}`)
      console.log(`Headers: { Authorization: "Bearer ${eventsApiKey.substring(0, 5)}..." }`)
      console.log(
        `Full curl command for testing: ${curlCommand.replace(eventsApiKey.substring(0, 5) + "...", "${YOUR_API_KEY}")}`,
      )

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${eventsApiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        cache: "no-store",
      })

      console.log("Task API response status:", response.status)
      console.log("Task API response headers:", Object.fromEntries([...response.headers.entries()]))

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Failed to fetch tasks (${response.status}): ${errorText}`)
        throw new Error(`Failed to fetch tasks: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log("Task API response data:", data)

      if (data.status === 200) {
        setTasks(data.data || [])
        console.log("Tasks fetched:", data.data)
      } else {
        throw new Error(data.message || "Failed to fetch tasks")
      }
    } catch (error) {
      console.error("Error fetching tasks:", error)
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

      // Create and log the curl command for debugging
      const curlCommand = `curl -X GET "${url}" -H "Authorization: Bearer ${eventsApiKey.substring(0, 5)}..."`
      console.log("=== CAMERA API REQUEST ===")
      console.log(`URL: ${url}`)
      console.log(`Headers: { Authorization: "Bearer ${eventsApiKey.substring(0, 5)}..." }`)
      console.log(
        `Full curl command for testing: ${curlCommand.replace(eventsApiKey.substring(0, 5) + "...", "${YOUR_API_KEY}")}`,
      )

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${eventsApiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        cache: "no-store",
      })

      console.log("Camera API response status:", response.status)
      console.log("Camera API response headers:", Object.fromEntries([...response.headers.entries()]))

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Failed to fetch cameras (${response.status}): ${errorText}`)
        throw new Error(`Failed to fetch cameras: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log("Camera API response data:", data)

      if (data.status === 200) {
        setCameras(data.data?.data || [])
        console.log("Cameras fetched:", data.data?.data)
      } else {
        throw new Error(data.message || "Failed to fetch cameras")
      }
    } catch (error) {
      console.error("Error fetching cameras:", error)
      setError(`Failed to fetch cameras: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle location change
  const handleLocationChange = (locationId) => {
    console.log("Location changed to:", locationId)
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
    console.log("Task changed to:", taskId)
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
    console.log("Camera changed to:", cameraId)
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

      // Create and log the curl command for debugging
      const curlCommand = `curl -X GET "${url}" -H "Authorization: Bearer ${eventsApiKey.substring(0, 5)}..."`
      console.log("=== EVENTS API REQUEST ===")
      console.log(`URL: ${url}`)
      console.log(`Headers: { Authorization: "Bearer ${eventsApiKey.substring(0, 5)}..." }`)
      console.log(
        `Full curl command for testing: ${curlCommand.replace(eventsApiKey.substring(0, 5) + "...", "${YOUR_API_KEY}")}`,
      )

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

      console.log("Fetching events from Events API...")
      const response = await fetchEventsAPI(serverFormData)
      console.log("Fetch complete:", response)

      // Check for errors
      if (response.error) {
        setError(response.error)
        console.error("Error returned from fetchEventsAPI:", response.error)
        return
      }

      // Update state with response data
      setImages(response.images || [])
      setPagination({
        currentPage: response.currentPage || 1,
        totalPages: response.totalPages || 1,
        totalCount: response.totalCount || 0,
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
      })

      // Show error if no images were fetched
      if (!response.images || response.images.length === 0) {
        setError(
          "No events were found. The Events API returned zero events. Please check your input parameters (task ID, dates) and try again.",
        )
      }
    } catch (error) {
      console.error("Error fetching events:", error)
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

  // Add a toggleCalculator function
  const toggleCalculator = () => {
    setShowCalculator(!showCalculator)
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

  // Get pricing information
  const pricing = calculatePricing()

  // Get friendly model name for display
  const getFriendlyModelName = (modelType) => {
    return modelType === "gemini" ? "Glacier-2.5" : "Comet-4.1"
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

  // Update the return statement to remove the Events API tab
  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-baseline gap-3">
          <Image src="/images/wobot-logo.png" alt="Wobot.ai Logo" width={120} height={30} />
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
                  : "Processing image..."}
            </p>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-600 dark:text-red-400">
          <h3 className="font-medium mb-2">Error</h3>
          <p>{error}</p>

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
            <h4 className="text-sm font-medium mb-1">Estimated Cost</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
              <div>
                <p>Input: ${pricing.inputCost}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  (${stats.modelUsed === "gemini" ? "0.15" : "0.40"} / 1M tokens)
                </p>
              </div>
              <div>
                <p>Output: ${pricing.outputCost}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  (${stats.modelUsed === "gemini" ? "0.60" : "1.60"} / 1M tokens)
                </p>
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

      {/* Display ScoutAI or Events API images and Process button */}
      {(activeMode === "scoutai" || activeMode === "events") && images.length > 0 && !isLoading && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-medium">
                {activeMode === "events" ? "Events" : "Images"} ({images.length})
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
              {/* Process with selected model button - only show when images are selected */}
              {!isProcessing && selectedImages.length > 0 && (
                <button
                  onClick={handleProcessImages}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Process {selectedImages.length} Selected
                  {isDevMode ? ` with ${getFriendlyModelName(selectedModel)}` : ""}
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
                          <strong>Label:</strong> {displayItem.label}
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

          {/* Bottom pagination controls */}
          {pagination && (
            <div className="flex justify-between items-center mt-6">
              <div className="flex items-center gap-2">
                <label htmlFor="images_per_page" className="text-sm text-gray-600 dark:text-gray-400">
                  Images per page:
                </label>
                <select
                  id="images_per_page"
                  name="limit"
                  className="text-sm border rounded-md p-1 dark:bg-gray-700 dark:border-gray-600"
                  defaultValue="10"
                  onChange={(e) => {
                    const form = document.querySelector("form")
                    if (form) {
                      const formData = new FormData(form)
                      formData.set("limit", e.target.value)
                      formData.set("page", "1") // Reset to page 1 when changing limit
                      handleFormSubmit(formData)
                    }
                  }}
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>

              {pagination.totalPages > 1 && (
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
              )}
            </div>
          )}
        </div>
      )}

      {/* Show manual results if any */}
      {activeMode === "manual" && results.length > 0 && !isLoading && (
        <div className="mt-6">
          <h2 className="text-xl font-medium mb-4">Manual Upload Results</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {results.map((item, index) => (
              <div
                key={index}
                className={`bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden ${
                  item.error ? "border-red-300 dark:border-red-700 border-2" : ""
                }`}
              >
                <div className="relative w-full h-48">
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
                    <strong>Label:</strong> {item.label}
                  </p>
                  {item.modelUsed && isDevMode && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Processed with: {getFriendlyModelName(item.modelUsed)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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
      />

      {/* Password modal for dev mode */}
      <PasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSubmit={handleDevModePassword}
      />
    </div>
  )
}
