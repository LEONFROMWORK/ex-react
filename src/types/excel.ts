export enum ErrorType {
  FORMULA_ERROR = "FORMULA_ERROR",
  DATA_ERROR = "DATA_ERROR",
  FORMAT_ERROR = "FORMAT_ERROR",
  DIVISION_BY_ZERO = "DIVISION_BY_ZERO",
  VALUE_ERROR = "VALUE_ERROR",
  REFERENCE_ERROR = "REFERENCE_ERROR",
  NAME_ERROR = "NAME_ERROR",
  NUMBER_ERROR = "NUMBER_ERROR",
  NOT_AVAILABLE = "NOT_AVAILABLE",
  NULL_ERROR = "NULL_ERROR",
  CIRCULAR_REFERENCE = "CIRCULAR_REFERENCE",
  DATE_ERROR = "DATE_ERROR",
  EMPTY_CELL = "EMPTY_CELL",
  PROCESSING_ERROR = "PROCESSING_ERROR",
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