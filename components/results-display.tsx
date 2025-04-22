"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { AnalysisResult } from "@/lib/types"
import Image from "next/image"

interface ResultsDisplayProps {
  results: AnalysisResult[]
  stats: {
    totalFetched: number
    processedCount: number
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  onDownload: (format: "csv" | "json") => void
}

export default function ResultsDisplay({ results, stats, onDownload }: ResultsDisplayProps) {
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
                  <strong>Total images fetched:</strong> {stats.totalFetched}
                </p>
                <p>
                  <strong>Images processed:</strong> {stats.processedCount}
                </p>
                <p>
                  <strong>Success rate:</strong>{" "}
                  {stats.totalFetched > 0 ? `${Math.round((stats.processedCount / stats.totalFetched) * 100)}%` : "N/A"}
                </p>
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

            <div className="flex gap-2 mt-6">
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
          </div>
        </CardContent>
      </Card>

      <h2 className="text-xl font-semibold mt-8 mb-4">Analysis Results ({results.length})</h2>

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
    </div>
  )
}
