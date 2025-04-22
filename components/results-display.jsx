"use client"

import Image from "next/image"

export default function ResultsDisplay({ results, stats, onDownload, pagination, onPageChange, apiCall }) {
  const totalCount = stats.totalCount || stats.totalFetched

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">Processing Summary</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Images</h3>
              <p>
                <strong>Total images available:</strong> {totalCount}
              </p>
              <p>
                <strong>Images on this page:</strong> {stats.processedCount}
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

          <div className="flex flex-wrap gap-2 mt-6 justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => onDownload("csv")}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Download CSV
              </button>
              <button
                onClick={() => onDownload("json")}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
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

      <h2 className="text-xl font-semibold mt-8 mb-4">
        Analysis Results ({results.length})
        {pagination && totalCount > 0 && (
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
            Showing {(pagination.currentPage - 1) * results.length + 1}-
            {Math.min(pagination.currentPage * results.length, totalCount)} of {totalCount}
          </span>
        )}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {results.length > 0 ? (
          results.map((item, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="relative w-full h-48">
                {item.image.startsWith("http") ? (
                  <Image
                    src={item.image || "/placeholder.svg"}
                    alt="Analyzed image"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{item.image}</p>
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

      {pagination && pagination.totalPages > 1 && onPageChange && (
        <div className="flex justify-center mt-6">
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
        </div>
      )}
    </div>
  )
}
