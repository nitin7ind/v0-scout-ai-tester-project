"use client"

import { useEffect } from "react"
import { cn } from "@/lib/utils"
import tasksData from "@/lib/tasks.json"

export default function TaskSelector({
  selectedTask,
  setSelectedTask,
  prompt,
  setPrompt,
  customPrompt,
  setCustomPrompt,
  isDevMode,
}) {
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
  }, [selectedTask, customPrompt, setPrompt, setCustomPrompt])

  // Handle prompt change in custom mode
  const handleCustomPromptChange = (e) => {
    const newPrompt = e.target.value
    setCustomPrompt(newPrompt)
    if (selectedTask === "custom") {
      setPrompt(newPrompt)
    }
  }

  return (
    <>
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
          {/* SmartSafe Enclosure Open at the top */}
          {tasksData.tasks
            .filter((task) => task.name === "SmartSafe Enclosure Open")
            .map((task) => (
              <option key={task.id} value={task.id}>
                {task.name}
              </option>
            ))}
          {/* All other tasks */}
          {tasksData.tasks
            .filter((task) => task.name !== "SmartSafe Enclosure Open")
            .map((task) => (
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
    </>
  )
}
