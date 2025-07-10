"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import tasksData from "@/lib/tasks.json"
import { scoutAITasks } from "@/lib/scout-ai-tasks"

// Add this function at the top of the component
// Get default from date (30 days ago)
function getDefaultFromDate() {
  const date = new Date()
  date.setDate(date.getDate() - 3)
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
  activeMode = "events", // Changed default to events
  onModeChange,
  onPromptChange,
  selectedModel = "gpt",
  onModelChange,
  selectedGeminiModel = "gemini-2.5-flash",
  onGeminiModelChange,
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
  // DriveThru API specific props
  isDriveThruKeyValid = false,
  driveThruApiKey = "",
  driveThruEnvironment = "production",
  driveThruLocations = [],
  driveThruTasks = [],
  driveThruCameras = [],
  driveThruLocation = "",
  driveThruTask = "",
  driveThruCamera = "",
  driveThruPage = 0,
  onDriveThruApiValidate,
  onDriveThruApiReset,
  onDriveThruLocationChange,
  onDriveThruTaskChange,
  onDriveThruCameraChange,
}) {
  const [inputType, setInputType] = useState("events") // Default to 'events'
  const [selectedTask, setSelectedTask] = useState("custom") // Set custom as default
  const [customPrompt, setCustomPrompt] = useState("")
  const [prompt, setPrompt] = useState("")
  const [modelType, setModelType] = useState(isDevMode ? selectedModel : "gemini")
  const [localSelectedModel, setLocalSelectedModel] = useState(
    selectedModel === "gpt" ? "gpt" : selectedGeminiModel
  ) // Track the actual dropdown value locally
  const currentDate = getCurrentDate()
  const yesterdayDate = getYesterdayDate()
  const [companyId, setCompanyId] = useState("")
  const [error, setError] = useState(null)
  
  // Add state for Scout AI task selection
  const [selectedTaskId, setSelectedTaskId] = useState(scoutAITasks.length > 0 ? scoutAITasks[0].id : "")
  const [isCustomTask, setIsCustomTask] = useState(false)

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
      setModelType("gemini") // Always use gemini in default mode
    }
  }, [selectedModel, isDevMode])

  // Update local selected model when props change
  useEffect(() => {
    const newLocalModel = selectedModel === "gpt" ? "gpt" : selectedGeminiModel
    setLocalSelectedModel(newLocalModel)
    console.log("📝 Updated localSelectedModel to:", newLocalModel, "based on selectedModel:", selectedModel, "selectedGeminiModel:", selectedGeminiModel)
  }, [selectedModel, selectedGeminiModel])

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
    const inputType = formData.get("input_type")

    // Ensure the correct prompt is submitted
    formData.set("prompt", prompt)

    // Determine model type and gemini model from form data
    const selectedModel = formData.get("model_type")
    console.log("🔍 Form submission debug:")
    console.log("  selectedModel from form:", selectedModel)
    console.log("  inputType:", inputType)
    
    if (selectedModel === "gpt") {
      formData.set("model_type", "gpt")
      // Remove gemini_model if it exists
      formData.delete("gemini_model")
      console.log("  ✅ Set model_type to 'gpt'")
    } else {
      // It's a Gemini model variant
      formData.set("model_type", "gemini")
      formData.set("gemini_model", selectedModel) // The selected Gemini variant
      console.log("  ✅ Set model_type to 'gemini'")
      console.log("  ✅ Set gemini_model to:", selectedModel)
    }
    
    // Final verification
    console.log("  Final formData model_type:", formData.get("model_type"))
    console.log("  Final formData gemini_model:", formData.get("gemini_model"))

    // Only validate prompt for manual mode, not for scoutai or events
    if (inputType === "manual") {
      if (!prompt) {
        setError("Please select a prompt for analysis.")
        return
      }
    }

    // Clear any previous errors
    setError(null)

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
          />
          <input type="hidden" name="prompt" value={prompt} />
        </div>

        {/* Only show model selection in dev mode */}
        {isDevMode && (
          <div className="space-y-2">
            <label htmlFor="model_type" className="block text-sm font-medium">
              Select AI Model
            </label>
            <select
              id="model_type"
              name="model_type"
              value={localSelectedModel}
              onChange={(e) => {
                const value = e.target.value
                console.log("🎯 Dropdown onChange fired with value:", value)
                
                // Update local state immediately
                setLocalSelectedModel(value)
                
                if (value === "gpt") {
                  handleModelChange("gpt")
                  console.log("  ✅ Set modelType to 'gpt'")
                } else {
                  handleModelChange("gemini")
                  console.log("  ✅ Set modelType to 'gemini'")
                  if (onGeminiModelChange) {
                    onGeminiModelChange(value)
                    console.log("  ✅ Called onGeminiModelChange with:", value)
                  }
                }
              }}
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
              <option value="gemini-2.5-flash-lite-preview-06-17">Gemini 2.5 Flash Lite Preview 06-17</option>
              <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
              <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
              <option value="gpt">ChatGPT 4.1</option>
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Choose the AI model to use for image processing
            </p>
          </div>
        )}

        {/* When not in dev mode, send the default Gemini model as hidden fields */}
        {!isDevMode && (
          <>
            <input type="hidden" name="model_type" value={localSelectedModel} />
          </>
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
                id="events"
                name="input_type"
                value="events"
                checked={inputType === "events"}
                onChange={() => handleInputTypeChange("events")}
              />
              <label htmlFor="events">Events API</label>
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
                id="drivethru"
                name="input_type"
                value="drivethru"
                checked={inputType === "drivethru"}
                onChange={() => handleInputTypeChange("drivethru")}
              />
              <label htmlFor="drivethru">DriveThru API</label>
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
              {/* Only show environment in dev mode */}
              {isDevMode && (
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
              )}
              {/* Add hidden input for environment when not in dev mode */}
              {!isDevMode && <input type="hidden" name="env" value="prod" />}

              {/* Only show company ID field if not provided in URL */}
              {(!companyId || isDevMode) && (
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
              )}
              {/* Add hidden input for company ID when provided in URL and not in dev mode */}
              {companyId && !isDevMode && <input type="hidden" name="company_id" value={companyId} />}

              <div className="space-y-2">
                <label htmlFor="task_id" className="block text-sm font-medium">
                  Task
                </label>
                <div className="relative">
                  <select
                    id="task_id_select"
                    name="task_id_select"
                    value={isCustomTask ? "custom" : selectedTaskId}
                    onChange={(e) => {
                      if (e.target.value === "custom") {
                        setIsCustomTask(true)
                        setSelectedTaskId("")
                      } else {
                        setIsCustomTask(false)
                        setSelectedTaskId(e.target.value)
                      }
                    }}
                    className={cn(
                      "w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600",
                      isCustomTask && "hidden"
                    )}
                  >
                    <option value="">Select a task...</option>
                    {scoutAITasks.map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.name}
                      </option>
                    ))}
                    <option value="custom">+ Enter Custom Task ID</option>
                  </select>
                  
                  {isCustomTask && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={selectedTaskId}
                        onChange={(e) => setSelectedTaskId(e.target.value)}
                        placeholder="Enter task ID (e.g. 681b97b6d80705cc948ddfe4)"
                        className="flex-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomTask(false)
                          setSelectedTaskId(scoutAITasks.length > 0 ? scoutAITasks[0].id : "")
                        }}
                        className="px-3 py-2 text-sm border rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                        title="Back to predefined tasks"
                      >
                        ↩
                      </button>
                    </div>
                  )}
                  
                  {/* Hidden input to ensure the correct value is submitted */}
                  <input
                    type="hidden"
                    name="task_id"
                    value={selectedTaskId}
                  />
                </div>
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
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-4 items-end">
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
                      <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                        (API page: {currentPage - 1})
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="limit" className="block text-sm font-medium">
                    Per Page
                  </label>
                  <input
                    id="limit"
                    name="limit"
                    type="number"
                    min="1"
                    defaultValue="12"
                    className="w-20 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                    required
                  />
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

        {inputType === "drivethru" && (
          <div className="space-y-4">
            {/* API Key section - only show if not validated */}
            {!isDriveThruKeyValid ? (
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
                    <label htmlFor="drivethru_env" className="block text-sm font-medium">
                      Environment
                    </label>
                    <select
                      id="drivethru_env"
                      name="drivethru_env"
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
                    const env = document.getElementById("drivethru_env").value
                    if (onDriveThruApiValidate) onDriveThruApiValidate(apiKey, env)
                  }}
                  className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Validate API Key
                </button>
              </div>
            ) : (
              /* DriveThru API configuration - show after API key is validated */
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">DriveThru API Query</h3>
                  <button
                    type="button"
                    onClick={() => {
                      if (onDriveThruApiReset) onDriveThruApiReset()
                    }}
                    className="text-sm text-blue-600 dark:text-blue-400"
                  >
                    Change API Key
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="drivethru_type" className="block text-sm font-medium">
                      DriveThru Data Type
                    </label>
                    <select
                      id="drivethru_type"
                      name="drivethru_type"
                      className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                      defaultValue="detections"
                    >
                      <option value="detections">Detections</option>
                      <option value="journey">Journey</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="drivethru_location" className="block text-sm font-medium">
                      Location (Optional)
                    </label>
                    <select
                      id="drivethru_location"
                      name="drivethru_location"
                      value={driveThruLocation || ""}
                      onChange={(e) => {
                        if (onDriveThruLocationChange) {
                          onDriveThruLocationChange(e.target.value)
                        }
                      }}
                      className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                    >
                      <option value="">All Locations</option>
                      {driveThruLocations &&
                        driveThruLocations.map((location) => (
                          <option key={location._id} value={location._id}>
                            {location.area} ({location.locationId})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="drivethru_limit" className="block text-sm font-medium">
                      Results Per Page
                    </label>
                    <input
                      id="drivethru_limit"
                      name="drivethru_limit"
                      type="number"
                      min="1"
                      max="50"
                      defaultValue="10"
                      className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="drivethru_page" className="block text-sm font-medium">
                      Page
                    </label>
                    <input
                      id="drivethru_page"
                      name="drivethru_page"
                      type="number"
                      min="0"
                      defaultValue="0"
                      className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="drivethru_from_date" className="block text-sm font-medium">
                      From Date
                    </label>
                    <input
                      id="drivethru_from_date"
                      name="drivethru_from_date"
                      type="date"
                      defaultValue={getDefaultFromDate()}
                      className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="drivethru_to_date" className="block text-sm font-medium">
                      To Date
                    </label>
                    <input
                      id="drivethru_to_date"
                      name="drivethru_to_date"
                      type="date"
                      defaultValue={yesterdayDate}
                      className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Hidden fields to store API key and environment - always include these */}
            <input type="hidden" name="api_key" value={driveThruApiKey || ""} />
            <input type="hidden" name="drivethru_env" value={driveThruEnvironment || "production"} />
          </div>
        )}

        {/* Display error message if any */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="w-full py-2 px-4 border border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 font-medium rounded-md bg-transparent hover:bg-blue-50 dark:hover:bg-blue-900/20"
        >
          {inputType === "scoutai" ? "Fetch Images" : inputType === "events" ? "Fetch Events" : inputType === "drivethru" ? "Fetch DriveThru Data" : "Analyze"}
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
