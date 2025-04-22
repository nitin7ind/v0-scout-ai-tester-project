"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { analyzeImages } from "@/app/actions"
import type { AnalysisResult, PaginationInfo } from "@/lib/types"
import ResultsDisplay from "@/components/results-display"
import DashboardForm from "@/components/dashboard-form"

export default function Dashboard() {
  const [results, setResults] = useState<AnalysisResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
  })
  const [stats, setStats] = useState({
    totalFetched: 0,
    processedCount: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  })
  const { theme, setTheme } = useTheme()
  const router = useRouter()

  const handleAnalyze = async (formData: FormData) => {
    setIsLoading(true)
    setProgress(0)
    setResults([])
    setError(null)

    try {
      console.log("Starting image analysis...")
      const response = await analyzeImages(formData, (current, total) => {
        const percent = Math.round((current / total) * 100)
        setProgress(percent)
        console.log(`Processing progress: ${percent}% (${current}/${total})`)
      })

      console.log("Analysis complete:", response)
      setResults(response.results)
      setStats({
        totalFetched: response.totalFetched,
        processedCount: response.processedCount,
        promptTokens: response.promptTokens,
        completionTokens: response.completionTokens,
        totalTokens: response.totalTokens,
      })
      setPagination({
        currentPage: response.currentPage || 1,
        totalPages: response.totalPages || 1,
        totalCount: response.totalCount || response.totalFetched,
      })

      if (response.results.length === 0) {
        setError("No images were processed. Please check your input parameters and try again.")
      }
    } catch (error) {
      console.error("Error analyzing images:", error)
      setError(`Error analyzing images: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePageChange = (page: number) => {
    // Create a new FormData object with the current form values
    const form = document.querySelector("form") as HTMLFormElement
    if (!form) return

    const formData = new FormData(form)
    formData.set("page", page.toString())

    handleAnalyze(formData)
  }

  const handleDownload = async (format: "csv" | "json") => {
    try {
      console.log(`Downloading results as ${format}...`)
      const formData = new FormData()
      formData.append("data", JSON.stringify(results))
      formData.append("format", format)

      const response = await fetch("/api/download", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`)
      }

      if (format === "json") {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "results.json"
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else if (format === "csv") {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "results.csv"
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
      console.log(`Download complete: ${format}`)
    } catch (error) {
      console.error("Error downloading results:", error)
      setError(`Error downloading results: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">ScoutAI Image Dashboard</h1>
        <Button variant="outline" size="icon" onClick={toggleTheme}>
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </div>

      <DashboardForm
        onSubmit={handleAnalyze}
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        onPageChange={handlePageChange}
      />

      {isLoading && (
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p className="text-muted-foreground">
              Processing images... <span>{progress}%</span>
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-600 dark:text-red-400">
          <p>{error}</p>
        </div>
      )}

      {results.length > 0 && (
        <ResultsDisplay
          results={results}
          stats={{
            ...stats,
            totalCount: pagination.totalCount,
          }}
          onDownload={handleDownload}
          pagination={pagination}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  )
}
