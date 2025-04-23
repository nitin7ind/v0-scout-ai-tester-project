"use client"

import { useState, useEffect } from "react"
import { getCurrentDate, cn } from "@/lib/utils"
import tasksData from "@/lib/tasks.json"

export default function DashboardForm({ onSubmit, currentPage = 1, totalPages = 1, onPageChange, curlCommand }) {
  const [inputType, setInputType] = useState("scoutai")
  const [selectedTask, setSelectedTask] = useState("")
  const [customPrompt, setCustomPrompt] = useState("")
  const [prompt, setPrompt] = useState("")
  const currentDate = getCurrentDate()

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)

    // Ensure the correct prompt is submitted
    formData.set("prompt", prompt)

    await onSubmit(formData)
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

        {(selectedTask === "custom" || selectedTask) && (
          <div className="space-y-2">
            <label htmlFor="prompt" className="block text-sm font-medium">
              {selectedTask === "custom" ? "Custom Prompt" : "Task Prompt"}
            </label>
            <textarea
              id="prompt"
              name="prompt_display" // This is just for display, we'll use the state value when submitting
              value={selectedTask === "custom" ? customPrompt : prompt}
              onChange={(e) => {
                if (selectedTask === "custom") {
                  setCustomPrompt(e.target.value)
                }
              }}
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
                onChange={() => setInputType("scoutai")}
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
                onChange={() => setInputType("manual")}
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
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md"
          disabled={!selectedTask}
        >
          {inputType === "scoutai" ? "Fetch Images" : "Analyze"}
        </button>
      </form>

      {/* Display curl command below the button */}
      {curlCommand && (
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
