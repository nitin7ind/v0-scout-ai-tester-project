"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { AnalysisResult, PaginationInfo } from "@/lib/types"
import Image from "next/image"

interface ResultsDisplayProps {
  results: AnalysisResult[]
  stats: {
    totalFetched: number
    processedCount: number
    promptTokens: number
    completionTokens: number
    totalTokens: number
    totalCount?: number
  }
  onDownload: (format: "csv" | "json") => void
  pagination?: PaginationInfo
  onPageChange?: (page: number) => void
}

export default function ResultsDisplay({ results, stats, onDownload, pagination, onPageChange }: ResultsDisplayProps) {
  const totalCount = stats.totalCount || stats.totalFetched

  return (
    <div className="space-y-6 mt-6">
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
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
                <Button
                  onClick={() => onDownload("csv")}
                  variant="outline"
                  className="bg-green-600 text-white hover:bg-green-700"
                >
                  Download CSV
                </Button>
                <Button
                  onClick={() => onDownload("json")}
                  variant="outline"
                  className="bg-purple-600 text-white hover:bg-purple-700"
                >
                  Download JSON
                </Button>
              </div>

              {pagination && pagination.totalPages > 1 && onPageChange && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(pagination.currentPage - 1)}
                    disabled={pagination.currentPage <= 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                  </Button>
                  <span className="text-sm">
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(pagination.currentPage + 1)}
                    disabled={pagination.currentPage >= pagination.totalPages}
                  >
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 className="text-xl font-semibold mt-8 mb-4">
        Analysis Results ({results.length})
        {pagination && totalCount > 0 && (
          <span className="text-sm font-normal text-muted-foreground ml-2">
            Showing {(pagination.currentPage - 1) * results.length + 1}-
            {Math.min(pagination.currentPage * results.length, totalCount)} of {totalCount}
          </span>
        )}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {results.length > 0 ? (
          results.map((item, index) => (
            <Card key={index} className="overflow-hidden">
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
              <CardContent className="p-4">
                <p className="text-sm">
                  <strong>Label:</strong> {item.label}
                </p>
                {item.tokens && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Tokens: {item.tokens.total} (Prompt: {item.tokens.prompt}, Completion: {item.tokens.completion})
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="col-span-3 text-center text-muted-foreground py-8">No results to display</p>
        )}
      </div>

      {pagination && pagination.totalPages > 1 && onPageChange && (
        <div className="flex justify-center mt-6">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <span className="text-sm">
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage >= pagination.totalPages}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
