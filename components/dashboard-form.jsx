"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import tasksData from "@/lib/tasks.json"
import { scoutAITasks } from "@/lib/scout-ai-tasks"

// Add this function at the top of the component
// Get default from date (30 days ago)
function getDefaultFromDate() {
  const date = new Date()
  date.setDate(date.getDate() - 30)
  return date.toISOString().split("T")[0]
}

// Get current date in YYYY-MM-DD format
function getCurrentDate() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

// Get yesterday's date in YYYY-MM-DD format
function getYesterdayDate() {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const year = yesterday.getFullYear()
  const month = String(yesterday.getMonth() + 1).padStart(2, "0")
  const day = String(yesterday.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export default function DashboardForm({
  onSubmit,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  curlCommand,
  activeMode = "scoutai", // Changed default to scoutai
  onModeChange,
  onPromptChange,
  selectedModel = "gpt",
  onModelChange,
  isDevMode = false,
  // Events API specific props
  isEventsKeyValid = false,
  eventsApiKey = "",
  eventsEnvironment = "production",
  eventsLocations = [],
  eventsTasks = [],
  eventsCameras = [],
  eventsLocation = "",
  eventsTask = "",
  eventsCamera = "",
  eventsPage = 0,
  onEventsApiValidate,
  onEventsApiReset,
  onEventsLocationChange,
  onEventsTaskChange,
  onEventsCameraChange,
}) {
  const [inputType, setInputType] = useState(activeMode)
  const [selectedTask, setSelectedTask] = useState("custom") // Set custom as default
  const [customPrompt, setCustomPrompt] = useState("")
  const [prompt, setPrompt] = useState("")
  const [modelType, setModelType] = useState(isDevMode ? selectedModel : "gemini")
  const currentDate = getCurrentDate()
  const yesterdayDate = getYesterdayDate()
  const [companyId, setCompanyId] = useState("")

  // Check for company ID in URL on component mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search)
      const companyParam = urlParams.get("company")
      if (companyParam) {
        setCompanyId(companyParam)
      }
    }
  }, [])

  // Update inputType when activeMode changes
  useEffect(() => {
    setInputType(activeMode)
  }, [activeMode])

  // Update modelType when selectedModel changes
  useEffect(() => {
    if (isDevMode) {
      setModelType(selectedModel)
    } else {
      setModelType("gemini") // Always use gemini (Glacier) in default mode
    }
  }, [selectedModel, isDevMode])

  // Set prompt based on selected task
  useEffect(() => {
    if (selectedTask === "custom") {
      setPrompt(customPrompt)
    } else {
      const selectedTaskData = tasksData.tasks.find((task) => task.id === selectedTask)
      if (selectedTaskData) {
        setPrompt(selectedTaskData.prompt)
        setCustomPrompt(selectedTaskData.prompt) // Also update custom prompt field for editing
      }
    }
  }, [selectedTask, customPrompt])

  // Notify parent component when prompt changes
  useEffect(() => {
    if (onPromptChange && prompt) {
      onPromptChange(prompt)
    }
  }, [prompt, onPromptChange])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)

    // Ensure the correct prompt is submitted
    formData.set("prompt", prompt)

    // Add model type to form data
    formData.set("model_type", modelType)

    await onSubmit(formData)
  }

  // Handle input type change
  const handleInputTypeChange = (type) => {
    setInputType(type)
    if (onModeChange) {
      onModeChange(type)
    }
  }

  // Handle model type change
  const handleModelChange = (type) => {
    setModelType(type)
    if (onModelChange) {
      onModelChange(type)
    }
  }

  // Handle prompt change in custom mode
  const handleCustomPromptChange = (e) => {
    const newPrompt = e.target.value
    setCustomPrompt(newPrompt)
    if (selectedTask === "custom") {
      setPrompt(newPrompt)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="task" className="block text-sm font-medium">
            Select Prompt
          </label>
          <select
            id="task"
            name="task"
            value={selectedTask}
            onChange={(e) => setSelectedTask(e.target.value)}
            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            required
          >
            <option value="custom">Custom Prompt</option>
            {tasksData.tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.name}
              </option>
            ))}
          </select>
        </div>

        {/* Always show prompt textarea since custom is default */}
        <div className="space-y-2">
          <label htmlFor="prompt" className="block text-sm font-medium">
            {selectedTask === "custom" ? "Custom Prompt" : "Task Prompt"}
          </label>
          <textarea
            id="prompt"
            name="prompt_display" // This is just for display, we'll use the state value when submitting
            value={selectedTask === "custom" ? customPrompt : prompt}
            onChange={handleCustomPromptChange}
            placeholder="Enter prompt for image analysis"
            className={cn(
              "w-full min-h-32 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600",
              selectedTask !== "custom" && "bg-gray-50 dark:bg-gray-800",
            )}
            readOnly={selectedTask !== "custom"}
            required
          />
          <input type="hidden" name="prompt" value={prompt} />
        </div>

        {/* Only show model selection in dev mode */}
        {isDevMode && (
          <div className="space-y-2">
            <label htmlFor="model_type" className="block text-sm font-medium">
              Select AI Model
            </label>
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="model_gpt"
                  name="model_type"
                  value="gpt"
                  checked={modelType === "gpt"}
                  onChange={() => handleModelChange("gpt")}
                />
                <label htmlFor="model_gpt">Comet-4.1</label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="model_gemini"
                  name="model_type"
                  value="gemini"
                  checked={modelType === "gemini"}
                  onChange={() => handleModelChange("gemini")}
                />
                <label htmlFor="model_gemini">Glacier-2.5</label>
              </div>
            </div>
          </div>
        )}

        {/* Add a batch size option for developers */}
        {isDevMode && (
          <div className="space-y-2">
            <label htmlFor="batch_size" className="block text-sm font-medium">
              Batch Size
            </label>
            <input
              id="batch_size"
              name="batch_size"
              type="number"
              min="1"
              max="20"
              defaultValue="10"
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Process images in smaller batches to avoid timeouts (developer mode only)
            </p>
          </div>
        )}

        <div className="space-y-2">
          <span className="block text-sm font-medium">Select Image Input Method</span>
          <div className="flex gap-4">
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="manual"
                name="input_type"
                value="manual"
                checked={inputType === "manual"}
                onChange={() => handleInputTypeChange("manual")}
              />
              <label htmlFor="manual">Manual Upload or URL</label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="scoutai"
                name="input_type"
                value="scoutai"
                checked={inputType === "scoutai"}
                onChange={() => handleInputTypeChange("scoutai")}
              />
              <label htmlFor="scoutai">ScoutAI API</label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="events"
                name="input_type"
                value="events"
                checked={inputType === "events"}
                onChange={() => handleInputTypeChange("events")}
              />
              <label htmlFor="events">Events API</label>
            </div>
          </div>
        </div>

        {inputType === "manual" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="manual_image" className="block text-sm font-medium">
                Upload Image
              </label>
              <input
                id="manual_image"
                name="manual_image"
                type="file"
                accept="image/*"
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="manual_url" className="block text-sm font-medium">
                Or paste image URL
              </label>
              <input
                id="manual_url"
                name="manual_url"
                placeholder="https://example.com/image.jpg"
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
          </div>
        )}

        {inputType === "scoutai" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label htmlFor="env" className="block text-sm font-medium">
                  Environment
                </label>
                <select
                  id="env"
                  name="env"
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                  defaultValue="prod"
                >
                  <option value="prod">Production</option>
                  <option value="staging">Staging</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="company_id" className="block text-sm font-medium">
                  Company ID
                </label>
                <input
                  id="company_id"
                  name="company_id"
                  placeholder="Company ID"
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="location_id" className="block text-sm font-medium">
                  Location ID (optional)
                </label>
                <input
                  id="location_id"
                  name="location_id"
                  placeholder="Location ID"
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="task_id" className="block text-sm font-medium">
                  Task
                </label>
                <select
                  id="task_id"
                  name="task_id"
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                  defaultValue={scoutAITasks.length > 0 ? scoutAITasks[0].id : ""}
                  required
                >
                  <option value="">Select a task...</option>
                  {scoutAITasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="date" className="block text-sm font-medium">
                  Date
                </label>
                <input
                  id="date"
                  name="date"
                  type="date"
                  defaultValue={yesterdayDate}
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="limit" className="block text-sm font-medium">
                  Images Per Page
                </label>
                <input
                  id="limit"
                  name="limit"
                  type="number"
                  min="1"
                  defaultValue="12"
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <label htmlFor="page" className="block text-sm font-medium">
                  Page
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="page"
                    name="page"
                    type="number"
                    min="1"
                    defaultValue={currentPage.toString()}
                    className="w-20 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                    required
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400">of {totalPages || 1}</span>
                  {isDevMode && (
                    <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">(API page: {currentPage - 1})</span>
                  )}
                </div>
              </div>

              {onPageChange && totalPages > 1 && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="px-3 py-1 border rounded-md text-sm disabled:opacity-50"
                    disabled={currentPage <= 1}
                    onClick={() => onPageChange(currentPage - 1)}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1 border rounded-md text-sm disabled:opacity-50"
                    disabled={currentPage >= totalPages}
                    onClick={() => onPageChange(currentPage + 1)}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {inputType === "events" && (
          <div className="space-y-4">
            {/* API Key section - only show if not validated */}
            {!isEventsKeyValid ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="api_key" className="block text-sm font-medium">
                      API Key
                    </label>
                    <input
                      id="api_key"
                      name="api_key"
                      type="password"
                      placeholder="Enter your Wobot API key"
                      className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="events_env" className="block text-sm font-medium">
                      Environment
                    </label>
                    <select
                      id="events_env"
                      name="events_env"
                      className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                      defaultValue="production"
                    >
                      <option value="production">Production</option>
                      <option value="staging">Staging</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const apiKey = document.getElementById("api_key").value
                    const env = document.getElementById("events_env").value
                    if (onEventsApiValidate) onEventsApiValidate(apiKey, env)
                  }}
                  className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Validate API Key
                </button>
              </div>
            ) : (
              /* Location, Task, Camera selection - show after API key is validated */
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Events API Query</h3>
                  <button
                    type="button"
                    onClick={() => {
                      if (onEventsApiReset) onEventsApiReset()
                    }}
                    className="text-sm text-blue-600 dark:text-blue-400"
                  >
                    Change API Key
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="events_location" className="block text-sm font-medium">
                      Location
                    </label>
                    <select
                      id="events_location"
                      name="events_location"
                      value={eventsLocation || ""}
                      onChange={(e) => {
                        if (onEventsLocationChange) {
                          onEventsLocationChange(e.target.value)
                        }
                      }}
                      className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                    >
                      <option value="">Select a location...</option>
                      {eventsLocations &&
                        eventsLocations.map((location) => (
                          <option key={location._id} value={location._id}>
                            {location.area} ({location.locationId})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="events_task" className="block text-sm font-medium">
                      Task
                    </label>
                    <select
                      id="events_task"
                      name="events_task"
                      value={eventsTask || ""}
                      onChange={(e) => {
                        if (onEventsTaskChange) {
                          onEventsTaskChange(e.target.value)
                        }
                      }}
                      className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                      disabled={!eventsLocation || !eventsTasks || eventsTasks.length === 0}
                    >
                      <option value="">Select a task...</option>
                      {eventsTasks &&
                        eventsTasks.map((task) => (
                          <option key={task._id} value={task._id}>
                            {task.task}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="events_camera" className="block text-sm font-medium">
                      Camera (Optional)
                    </label>
                    <select
                      id="events_camera"
                      name="events_camera"
                      value={eventsCamera || ""}
                      onChange={(e) => {
                        if (onEventsCameraChange) {
                          onEventsCameraChange(e.target.value)
                        }
                      }}
                      className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                      disabled={!eventsTask || !eventsCameras || eventsCameras.length === 0}
                    >
                      <option value="">All Cameras</option>
                      {eventsCameras &&
                        eventsCameras.map((camera) => (
                          <option key={camera._id} value={camera._id}>
                            {camera.camera} ({camera.status})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="events_limit" className="block text-sm font-medium">
                      Results Per Page
                    </label>
                    <input
                      id="events_limit"
                      name="events_limit"
                      type="number"
                      min="1"
                      max="50"
                      defaultValue="10"
                      className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="events_from_date" className="block text-sm font-medium">
                      From Date
                    </label>
                    <input
                      id="events_from_date"
                      name="events_from_date"
                      type="date"
                      defaultValue={getDefaultFromDate()}
                      className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="events_to_date" className="block text-sm font-medium">
                      To Date
                    </label>
                    <input
                      id="events_to_date"
                      name="events_to_date"
                      type="date"
                      defaultValue={yesterdayDate}
                      className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                      required
                    />
                  </div>
                </div>

                {/* Hidden fields to store API key and environment */}
                <input type="hidden" name="api_key" value={eventsApiKey || ""} />
                <input type="hidden" name="events_env" value={eventsEnvironment || "production"} />
                <input type="hidden" name="events_page" value={eventsPage || 0} />
              </div>
            )}
          </div>
        )}

        <button
          type="submit"
          className="w-full py-2 px-4 border border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 font-medium rounded-md bg-transparent hover:bg-blue-50 dark:hover:bg-blue-900/20"
          disabled={inputType !== "scoutai" && !selectedTask}
        >
          {inputType === "scoutai" ? "Fetch Images" : "Analyze"}
        </button>
      </form>

      {/* Display curl command below the button - only in dev mode */}
      {curlCommand && isDevMode && (
        <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-md overflow-x-auto">
          <h3 className="text-sm font-medium mb-1">ScoutAI API Call:</h3>
          <div className="bg-gray-200 dark:bg-gray-800 p-2 rounded-md overflow-x-auto">
            <code className="text-xs break-all whitespace-pre-wrap">{curlCommand}</code>
          </div>
        </div>
      )}
    </div>
  )
}
