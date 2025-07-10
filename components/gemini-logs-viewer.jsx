'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { ScrollArea } from './ui/scroll-area'

export default function GeminiLogsViewer({ isDevMode = false, refreshTrigger = 0 }) {
  const [logs, setLogs] = useState([])
  const [selectedLog, setSelectedLog] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchLogs = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/logs?action=list')
      if (!response.ok) {
        throw new Error('Failed to fetch logs')
      }
      const data = await response.json()
      const sortedLogs = (data.files || []).sort((a, b) => new Date(b.created) - new Date(a.created))
      setLogs(sortedLogs)
      
      // Auto-select the latest log if there are logs and no log is currently selected
      if (sortedLogs.length > 0 && (!selectedLog || refreshTrigger > 0)) {
        await viewLog(sortedLogs[0].filename)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const viewLog = async (filename) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/logs?action=view&filename=${filename}`)
      if (!response.ok) {
        throw new Error('Failed to fetch log content')
      }
      const data = await response.json()
      setSelectedLog(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const downloadLog = async (filename) => {
    try {
      const response = await fetch(`/api/logs?action=download&filename=${filename}`)
      if (!response.ok) {
        throw new Error('Failed to download log')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError(err.message)
    }
  }

  const resetLogs = async () => {
    if (!confirm('Are you sure you want to delete all log files? This action cannot be undone.')) {
      return
    }
    
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/logs?action=reset', {
        method: 'DELETE'
      })
      if (!response.ok) {
        throw new Error('Failed to reset logs')
      }
      
      // Clear the current state
      setLogs([])
      setSelectedLog(null)
      
      // Show success message briefly
      alert('All logs have been successfully reset.')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isDevMode) {
      fetchLogs()
    }
  }, [isDevMode])

  // Refresh logs when refreshTrigger changes (after processing)
  useEffect(() => {
    if (isDevMode && refreshTrigger > 0) {
      fetchLogs()
    }
  }, [refreshTrigger, isDevMode])

  if (!isDevMode) {
    return null
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Gemini API Response Logs
            <div className="flex gap-2">
              <Button onClick={resetLogs} disabled={loading} size="sm" variant="destructive">
                {loading ? 'Resetting...' : 'Reset Logs'}
              </Button>
              <Button onClick={fetchLogs} disabled={loading} size="sm">
                {loading ? 'Loading...' : 'Refresh'}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="text-red-500 mb-4 p-2 bg-red-50 rounded">
              Error: {error}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            {/* Log Files List */}
            <div>
              <h3 className="font-semibold mb-2">Log Files ({logs.length})</h3>
              <div className="h-[400px] border rounded p-2 overflow-auto bg-white">
                {logs.length === 0 ? (
                  <p className="text-gray-500 text-sm">No log files found</p>
                ) : (
                  <div className="space-y-2">
                    {logs.map((log, index) => (
                      <div
                        key={index}
                        className={`p-2 border rounded cursor-pointer transition-colors ${
                          selectedLog && selectedLog.filename === log.filename
                            ? 'bg-blue-50 border-blue-300 shadow-sm'
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => viewLog(log.filename)}
                      >
                        <div className="font-mono text-xs break-all mb-1">
                          {log.filename}
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>{new Date(log.created).toLocaleString()}</span>
                          <span>{(log.size / 1024).toFixed(1)} KB</span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-1 h-6 text-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            downloadLog(log.filename)
                          }}
                        >
                          Download
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Log Content Viewer */}
            <div>
              <h3 className="font-semibold mb-2">Log Content</h3>
              <div className="h-[400px] border rounded p-2 overflow-auto bg-white">
                {selectedLog ? (
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <strong>Timestamp:</strong>
                        <div className="font-mono text-xs">
                          {new Date(selectedLog.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <strong>Model:</strong>
                        <Badge variant="outline">{selectedLog.model}</Badge>
                      </div>
                      <div>
                        <strong>Success:</strong>
                        <Badge variant={selectedLog.metadata.success ? "default" : "destructive"}>
                          {selectedLog.metadata.success ? "Yes" : "No"}
                        </Badge>
                      </div>
                      <div>
                        <strong>Processing Time:</strong>
                        <span className="text-xs">{selectedLog.metadata.processingTime}ms</span>
                      </div>
                    </div>

                    <div>
                      <strong>Prompt:</strong>
                      <div className="bg-gray-50 p-2 rounded text-xs font-mono max-h-20 overflow-auto border">
                        <div className="whitespace-pre-wrap break-words">{selectedLog.prompt}</div>
                      </div>
                    </div>

                    {selectedLog.response?.usageMetadata && (
                      <div>
                        <strong>Actual Tokens:</strong>
                        <div className="text-xs">
                          Prompt: {selectedLog.response.usageMetadata.promptTokenCount}, 
                          Completion: {(selectedLog.response.usageMetadata.candidatesTokenCount || 0) + (selectedLog.response.usageMetadata.thoughtsTokenCount || 0)}
                        </div>
                      </div>
                    )}

                    {selectedLog.metadata.estimatedTokens && !selectedLog.response?.usageMetadata && (
                      <div>
                        <strong>Estimated Tokens:</strong>
                        <div className="text-xs">
                          Prompt: {selectedLog.metadata.estimatedTokens.prompt}, 
                          Completion: {selectedLog.metadata.estimatedTokens.completion}, 
                          Total: {selectedLog.metadata.estimatedTokens.total}
                        </div>
                      </div>
                    )}

                    {selectedLog.response && (
                      <div>
                        <strong>Response:</strong>
                        <div className="bg-gray-50 p-2 rounded text-xs font-mono max-h-40 overflow-auto border">
                          <pre className="whitespace-pre-wrap break-words">{JSON.stringify(selectedLog.response, null, 2)}</pre>
                        </div>
                      </div>
                    )}

                    {selectedLog.error && (
                      <div>
                        <strong>Error:</strong>
                        <div className="bg-red-50 p-2 rounded text-xs text-red-700">
                          {selectedLog.error.message}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Select a log file to view its content</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
