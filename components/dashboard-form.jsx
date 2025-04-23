"use client"

import { useState, useEffect } from "react"
import { getCurrentDate, cn } from "@/lib/utils"
import tasksData from "@/lib/tasks.json"

export default function DashboardForm({
  onSubmit,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  curlCommand,
  activeMode = "scoutai",
  onModeChange,
  onPromptChange,
  selectedModel = "gpt",
  onModelChange,
  isDevMode = false,
}) {
  const [inputType, setInputType] = useState(activeMode)
  const [selectedTask, setSelectedTask] = useState("")
  const [customPrompt, setCustomPrompt] = useState("")
  const [prompt, setPrompt] = useState("")
  const [modelType, setModelType] = useState(isDevMode ? selectedModel : "gemini")
  const currentDate = getCurrentDate()

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
            Select Task
          </label>
          <select
            id="task"
            name="task"
            value={selectedTask}
            onChange={(e) => setSelectedTask(e.target.value)}
            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            required
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

        {/* Only show prompt textarea if it's a custom prompt or if in dev mode */}
        {(selectedTask === "custom" || (selectedTask && isDevMode)) && (
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
        )}

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

        <div className="space-y-2">
          <span className="block text-sm font-medium">Select Image Input Method</span>
          <div className="flex gap-4">
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
          </div>
        </div>

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
                  Task ID
                </label>
                <input
                  id="task_id"
                  name="task_id"
                  placeholder="Task ID"
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="date" className="block text-sm font-medium">
                  Date
                </label>
                <input
                  id="date"
                  name="date"
                  type="date"
                  defaultValue={currentDate}
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
                  defaultValue="5"
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

        <button
          type="submit"
          className="w-full py-2 px-4 border border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 font-medium rounded-md bg-transparent hover:bg-blue-50 dark:hover:bg-blue-900/20"
          disabled={!selectedTask}
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
