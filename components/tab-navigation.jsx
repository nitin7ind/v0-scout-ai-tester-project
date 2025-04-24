"use client"

export default function TabNavigation({ activeTab, onTabChange }) {
  const tabs = [
    { id: "playground", label: "Playground" },
    { id: "calculator", label: "Calculator" },
  ]

  return (
    <div className="flex border-b mb-6">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2 font-medium ${
            activeTab === tab.id
              ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
