export interface AnalysisResult {
  image: string
  label: string
  tokens: {
    prompt: number
    completion: number
    total: number
  }
}
