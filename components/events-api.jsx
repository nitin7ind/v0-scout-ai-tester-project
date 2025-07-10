"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { processImagesWithGPT } from "@/app/actions/image-processing"
import tasksData from "@/lib/tasks.json"

export default function EventsAPI({ isDevMode = false, selectedGeminiModel = "gemini-2.5-flash" }) {
  const [apiKey, setApiKey] = useState("")
  const [environment, setEnvironment] = useState("production")
  const [isKeyValid, setIsKeyValid] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [locations, setLocations] = useState([])
  const [tasks, setTasks] = useState([])
  const [cameras, setCameras] = useState([])
  const [selectedLocation, setSelectedLocation] = useState("")
  const [selectedTask, setSelectedTask] = useState("")
  const [selectedCamera, setSelectedCamera] = useState("")
  const [fromDate, setFromDate] = useState(getDefaultFromDate())
  const [toDate, setToDate] = useState(getDefaultToDate())
  const [limit, setLimit] = useState(10)
  const [page, setPage] = useState(0)
  const [events, setEvents] = useState([])
  const [totalPages, setTotalPages] = useState(0)
  const [totalEvents, setTotalEvents] = useState(0)
  const [selectedPromptTask, setSelectedPromptTask] = useState("")
  const [customPrompt, setCustomPrompt] = useState("")
  const [prompt, setPrompt] = useState("")
  const [selectedImages, setSelectedImages] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [processedResults, setProcessedResults] = useState([])
  const [stats, setStats] = useState({
    processedCount: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    modelUsed: "gemini",
    geminiModel: selectedGeminiModel,
  })

  // Helper function to get default from date (3 days ago)
  function getDefaultFromDate() {
    const date = new Date()
    date.setDate(date.getDate() - 3)
    return date.toISOString().split("T")[0]
  }

  // Helper function to get default to date (today)
  function getDefaultToDate() {
    return new Date().toISOString().split("T")[0]
  }

  // Validate API key
  const validateApiKey = async () => {
    if (!apiKey.trim()) {
      setError("API key is required")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Use our API route for validation
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'validate',
          apiKey: apiKey,
          environment: environment
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `API key validation failed: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        setIsKeyValid(true)
        setLocations(data.locations || [])
      } else {
        throw new Error(data.error || "API key validation failed")
      }
    } catch (error) {
      console.error("API key validation error:", error)
      setError(`API key validation failed: ${error.message}`)
      setIsKeyValid(false)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch tasks when location changes
  useEffect(() => {
    if (isKeyValid && selectedLocation) {
      fetchTasks()
    } else {
      setTasks([])
      setSelectedTask("")
    }
  }, [selectedLocation, isKeyValid])

  // Fetch cameras when task and location change
  useEffect(() => {
    if (isKeyValid && selectedLocation && selectedTask) {
      fetchCameras()
    } else {
      setCameras([])
      setSelectedCamera("")
    }
  }, [selectedLocation, selectedTask, isKeyValid])

  // Set prompt based on selected task
  useEffect(() => {
    if (selectedPromptTask === "custom") {
      setPrompt(customPrompt)
    } else {
      const selectedTaskData = tasksData.tasks.find((task) => task.id === selectedPromptTask)
      if (selectedTaskData) {
        setPrompt(selectedTaskData.prompt)
        setCustomPrompt(selectedTaskData.prompt)
      }
    }
  }, [selectedPromptTask, customPrompt])

  // Fetch tasks for selected location
  const fetchTasks = async () => {
    if (!selectedLocation) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'tasks',
          apiKey: apiKey,
          environment: environment,
          location: selectedLocation
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to fetch tasks: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        setTasks(data.tasks || [])
      } else {
        throw new Error(data.error || "Failed to fetch tasks")
      }
    } catch (error) {
      console.error("Error fetching tasks:", error)
      setError(`Failed to fetch tasks: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch cameras for selected location and task
  const fetchCameras = async () => {
    if (!selectedLocation || !selectedTask) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'cameras',
          apiKey: apiKey,
          environment: environment,
          location: selectedLocation,
          task: selectedTask
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to fetch cameras: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        setCameras(data.cameras || [])
      } else {
        throw new Error(data.error || "Failed to fetch cameras")
      }
    } catch (error) {
      console.error("Error fetching cameras:", error)
      setError(`Failed to fetch cameras: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch events
  const fetchEvents = async (e) => {
    if (e) e.preventDefault()

    if (!selectedTask) {
      setError("Task selection is required")
      return
    }

    setIsLoading(true)
    setError(null)
    setEvents([])

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'events',
          apiKey: apiKey,
          environment: environment,
          from: fromDate,
          to: toDate,
          location: selectedLocation,
          task: selectedTask,
          camera: selectedCamera,
          limit: limit,
          page: page
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to fetch events: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        setEvents(data.events || [])
        setTotalPages(data.totalPages || 0)
        setTotalEvents(data.total || 0)

        // Reset selected images and processed results
        setSelectedImages([])
        setProcessedResults([])
      } else {
        throw new Error(data.error || "Failed to fetch events")
      }
    } catch (error) {
      console.error("Error fetching events:", error)
      setError(`Failed to fetch events: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle page change
  const handlePageChange = (newPage) => {
    setPage(newPage)
    // Fetch events with new page
    setTimeout(() => {
      fetchEvents()
    }, 0)
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
    if (selectedImages.length === events.length) {
      setSelectedImages([])
    } else {
      setSelectedImages(events.map((_, index) => index))
    }
  }

  // Process selected images
  const processSelectedImages = async () => {
    if (!prompt) {
      setError("Please select a prompt for analysis")
      return
    }

    if (selectedImages.length === 0) {
      setError("Please select at least one image to process")
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      // Prepare images for processing
      const imagesToProcess = selectedImages.map((index) => ({
        image: events[index].image,
        processed: false,
        label: null,
        serialNumber: index + 1,
      }))

      // Process images with appropriate model
      const modelType = isDevMode ? "gpt" : "gemini"
      const batchSize = 10 // Default batch size for events API
      const geminiModel = selectedGeminiModel // Use the passed geminiModel prop
      const response = await processImagesWithGPT(imagesToProcess, prompt, null, modelType, batchSize, geminiModel)

      if (response.error) {
        throw new Error(response.error)
      }

      // Update processed results
      setProcessedResults(response.results || [])
      setStats({
        processedCount: response.processedCount || 0,
        promptTokens: response.promptTokens || 0,
        completionTokens: response.completionTokens || 0,
        totalTokens: response.totalTokens || 0,
        modelUsed: response.modelUsed || modelType,
        geminiModel: modelType === "gemini" ? geminiModel : undefined,
      })
    } catch (error) {
      console.error("Error processing images:", error)
      setError(`Error processing images: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  // Get friendly model name for display
  const getFriendlyModelName = (modelType) => {
    return modelType === "gemini" ? "Gemini" : "ChatGPT"
  }

  return (
    <div className="space-y-6">
      {/* API Key Input Section */}
      {!isKeyValid ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-medium mb-4">Events API Authentication</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="apiKey" className="block text-sm font-medium">
                API Key
              </label>
              <input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Wobot API key"
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="environment" className="block text-sm font-medium">
                Environment
              </label>
              <select
                id="environment"
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="production">Production</option>
                <option value="staging">Staging</option>
              </select>
            </div>

            <button
              onClick={validateApiKey}
              disabled={isLoading || !apiKey.trim()}
              className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? "Validating..." : "Validate API Key"}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Events Query Form */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-medium">Events Query</h2>
              <button onClick={() => setIsKeyValid(false)} className="text-sm text-blue-600 dark:text-blue-400">
                Change API Key
              </button>
            </div>

            <form onSubmit={fetchEvents} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="location" className="block text-sm font-medium">
                    Location
                  </label>
                  <select
                    id="location"
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="">Select a location...</option>
                    {locations.map((location) => (
                      <option key={location._id} value={location._id}>
                        {location.area} ({location.locationId})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="task" className="block text-sm font-medium">
                    Task
                  </label>
                  <select
                    id="task"
                    value={selectedTask}
                    onChange={(e) => setSelectedTask(e.target.value)}
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                    disabled={!selectedLocation || tasks.length === 0}
                  >
                    <option value="">Select a task...</option>
                    {tasks.map((task) => (
                      <option key={task._id} value={task._id}>
                        {task.task}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="camera" className="block text-sm font-medium">
                    Camera (Optional)
                  </label>
                  <select
                    id="camera"
                    value={selectedCamera}
                    onChange={(e) => setSelectedCamera(e.target.value)}
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                    disabled={!selectedTask || cameras.length === 0}
                  >
                    <option value="">All Cameras</option>
                    {cameras.map((camera) => (
                      <option key={camera._id} value={camera._id}>
                        {camera.camera} ({camera.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="limit" className="block text-sm font-medium">
                    Results Per Page
                  </label>
                  <input
                    id="limit"
                    type="number"
                    min="1"
                    max="50"
                    value={limit}
                    onChange={(e) => setLimit(Math.min(50, Math.max(1, Number.parseInt(e.target.value) || 1)))}
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="fromDate" className="block text-sm font-medium">
                    From Date
                  </label>
                  <input
                    id="fromDate"
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="toDate" className="block text-sm font-medium">
                    To Date
                  </label>
                  <input
                    id="toDate"
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !selectedTask}
                className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? "Fetching Events..." : "Fetch Events"}
              </button>
            </form>
          </div>

          {/* Prompt Selection */}
          {events.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-medium mb-4">Select Analysis Prompt</h2>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="promptTask" className="block text-sm font-medium">
                    Select Task
                  </label>
                  <select
                    id="promptTask"
                    value={selectedPromptTask}
                    onChange={(e) => setSelectedPromptTask(e.target.value)}
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="" disabled>
                      Select a task...
                    </option>
                    {tasksData.tasks.map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.name}
                      </option>
                    ))}
                    <option value="custom">Custom Prompt</option>
                  </select>
                </div>

                {selectedPromptTask === "custom" && (
                  <div className="space-y-2">
                    <label htmlFor="customPrompt" className="block text-sm font-medium">
                      Custom Prompt
                    </label>
                    <textarea
                      id="customPrompt"
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="Enter prompt for image analysis"
                      className="w-full min-h-32 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                      required
                    />
                  </div>
                )}

                {selectedPromptTask && selectedPromptTask !== "custom" && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
                    <h3 className="text-sm font-medium mb-2">Selected Prompt</h3>
                    <p className="text-sm">{prompt}</p>
                  </div>
                )}

                {selectedImages.length > 0 && (
                  <button
                    onClick={processSelectedImages}
                    disabled={isProcessing || !prompt}
                    className="w-full py-2 px-4 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {isProcessing ? "Processing Images..." : `Process ${selectedImages.length} Selected Images`}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Events Results */}
          {events.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-medium">
                    Events ({events.length})
                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                      Page {page + 1} of {totalPages} ({totalEvents} total)
                    </span>
                  </h2>

                  {/* Select all checkbox */}
                  <div className="ml-4 flex items-center">
                    <input
                      type="checkbox"
                      id="select-all"
                      checked={selectedImages.length === events.length && events.length > 0}
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

                {/* Pagination controls */}
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      className="px-3 py-1 border rounded-md text-sm flex items-center disabled:opacity-50"
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page <= 0 || isLoading}
                    >
                      ← Previous
                    </button>
                    <span className="text-sm">
                      Page {page + 1} of {totalPages}
                    </span>
                    <button
                      className="px-3 py-1 border rounded-md text-sm flex items-center disabled:opacity-50"
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= totalPages - 1 || isLoading}
                    >
                      Next →
                    </button>
                  </div>
                )}
              </div>

              {/* Processing stats if available */}
              {stats.processedCount > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <h3 className="text-lg font-medium mb-2">Processing Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p>
                        <strong>Images processed:</strong> {stats.processedCount} of {selectedImages.length}
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
                </div>
              )}

              {/* Events grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {events.map((event, index) => {
                  // Find the corresponding result if it exists
                  const result = processedResults.find((r) => r.image === event.image) || {}

                  return (
                    <div
                      key={index}
                      className={`bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden ${
                        result.error ? "border-red-300 dark:border-red-700 border-2" : ""
                      } ${selectedImages.includes(index) ? "ring-2 ring-blue-500" : ""}`}
                    >
                      <div className="relative w-full h-48 cursor-pointer" onClick={() => toggleImageSelection(index)}>
                        {/* Selection checkbox */}
                        <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedImages.includes(index)}
                            onChange={() => toggleImageSelection(index)}
                            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </div>

                        {event.image ? (
                          <Image
                            src={event.image || "/placeholder.svg"}
                            alt={`Event ${index + 1}`}
                            fill
                            className="object-fill"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                            <p className="text-sm text-gray-500 dark:text-gray-400">No image</p>
                          </div>
                        )}
                      </div>

                      <div className="p-4">
                        <div className="mb-2">
                          <p className="text-sm">
                            <strong>Event:</strong> {event.title || "N/A"}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(event.createdAt).toLocaleString()}
                          </p>
                        </div>

                        {result.processed && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-sm">
                              <strong>Analysis:</strong> {result.label}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Bottom pagination controls */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-6">
                  <div className="flex items-center gap-2">
                    <button
                      className="px-3 py-1 border rounded-md text-sm flex items-center disabled:opacity-50"
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page <= 0 || isLoading}
                    >
                      ← Previous
                    </button>
                    <span className="text-sm">
                      Page {page + 1} of {totalPages}
                    </span>
                    <button
                      className="px-3 py-1 border rounded-md text-sm flex items-center disabled:opacity-50"
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= totalPages - 1 || isLoading}
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Error display */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-600 dark:text-red-400">
          <h3 className="font-medium mb-2">Error</h3>
          <p>{error}</p>
        </div>
      )}
    </div>
  )
}
