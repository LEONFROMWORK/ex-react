export enum ErrorType {
  FORMULA_ERROR = "FORMULA_ERROR",
  DATA_ERROR = "DATA_ERROR",
  FORMAT_ERROR = "FORMAT_ERROR",
}

export interface ExcelError {
  type: ErrorType
  location: string // e.g., "Sheet1!A1"
  description: string
  value: any
  suggestion?: string
  severity: "low" | "medium" | "high"
  corrected?: boolean
}

export interface AnalysisResult {
  success: boolean
  totalErrors: number
  errors: ExcelError[]
  summary: string
  aiAnalysis?: {
    tier: "TIER1" | "TIER2"
    confidence: number
    tokensUsed: number
    suggestions?: string[]
  }
}

export interface CorrectionReport {
  originalErrors: number
  correctedErrors: number
  skippedErrors: number
  processingTime: number
  details: ExcelError[]
  aiInsights?: string
}