"use client"

import Image from "next/image"
import { useState } from "react"

export default function ResultsDisplay({ results, stats, onDownload, pagination, onPageChange, apiCall, apiResponse }) {
  const totalCount = stats.totalCount || stats.totalFetched
  const [showApiResponse, setShowApiResponse] = useState(false)

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="space-y-4">
          <h2 className="text-xl font-medium mb-4">Processing Summary</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Images</h3>
              <p>
                <strong>Total images processed:</strong> {stats.processedCount} of {stats.totalFetched}
              </p>
              {pagination && (
                <p>
                  <strong>Page:</strong> {pagination.currentPage} of {pagination.totalPages}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-medium">Token Usage</h3>
              <p>
                <strong>Prompt tokens:</strong> {stats.promptTokens.toLocaleString()}
              </p>
              <p>
                <strong>Completion tokens:</strong> {stats.completionTokens.toLocaleString()}
              </p>
              <p>
                <strong>Total tokens:</strong> {stats.totalTokens.toLocaleString()}
              </p>
            </div>
          </div>

          {apiResponse && (
            <div className="mt-4">
              <button
                onClick={() => setShowApiResponse(!showApiResponse)}
                className="text-blue-600 dark:text-blue-400 text-sm flex items-center gap-1"
              >
                {showApiResponse ? "Hide" : "Show"} API Response Details
                <span className="text-xs">{showApiResponse ? "▲" : "▼"}</span>
              </button>

              {showApiResponse && (
                <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-700 rounded-md overflow-x-auto">
                  <div className="mb-2">
                    <strong>Status:</strong> {apiResponse.status || "N/A"}
                    {apiResponse.message && (
                      <div>
                        <strong>Message:</strong> {apiResponse.message}
                      </div>
                    )}
                  </div>

                  {apiResponse.data && (
                    <div className="mb-2">
                      <div>
                        <strong>Page:</strong> {apiResponse.data.page || "N/A"}
                      </div>
                      <div>
                        <strong>Limit:</strong> {apiResponse.data.limit || "N/A"}
                      </div>
                      <div>
                        <strong>Total Pages:</strong> {apiResponse.data.totalPages || "N/A"}
                      </div>
                      <div>
                        <strong>Total Images:</strong> {apiResponse.data.total || "N/A"}
                      </div>
                      <div>
                        <strong>Has Next Page:</strong> {apiResponse.data.hasNextPage ? "Yes" : "No"}
                      </div>
                      <div>
                        <strong>Images in Response:</strong> {apiResponse.data.data?.length || 0}
                      </div>
                    </div>
                  )}

                  <details>
                    <summary className="cursor-pointer text-blue-600 dark:text-blue-400">View Raw JSON</summary>
                    <pre className="mt-2 text-xs whitespace-pre-wrap">{JSON.stringify(apiResponse, null, 2)}</pre>
                  </details>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2 mt-6 justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => onDownload("csv")}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                disabled={results.length === 0}
              >
                Download CSV
              </button>
              <button
                onClick={() => onDownload("json")}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                disabled={results.length === 0}
              >
                Download JSON
              </button>
            </div>

            {pagination && pagination.totalPages > 1 && onPageChange && (
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-1 border rounded-md text-sm flex items-center disabled:opacity-50"
                  onClick={() => onPageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage <= 1}
                >
                  ← Previous
                </button>
                <span className="text-sm">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                <button
                  className="px-3 py-1 border rounded-md text-sm flex items-center disabled:opacity-50"
                  onClick={() => onPageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage >= pagination.totalPages}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <h2 className="text-xl font-medium mt-8 mb-4">Analysis Results ({results.length})</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {results.length > 0 ? (
          results.map((item, index) => (
            <div
              key={index}
              className={`bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden ${
                item.error ? "border-red-300 dark:border-red-700 border-2" : ""
              }`}
            >
              <div className="relative w-full h-60">
                {item.image && item.image.startsWith("http") ? (
                  <Image
                    src={item.image || "/placeholder.svg"}
                    alt={`Image ${index + 1}`}
                    fill
                    className="object-contain" // Changed from object-fill to object-contain
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{item.image || "No image"}</p>
                  </div>
                )}
              </div>
              <div className="p-4">
                <p className="text-sm">
                  <strong>Label:</strong> {item.label}
                </p>
                {item.tokens && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Tokens: {item.tokens.total} (Prompt: {item.tokens.prompt}, Completion: {item.tokens.completion})
                  </p>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="col-span-3 text-center text-gray-500 dark:text-gray-400 py-8">No results to display</p>
        )}
      </div>
    </div>
  )
}
