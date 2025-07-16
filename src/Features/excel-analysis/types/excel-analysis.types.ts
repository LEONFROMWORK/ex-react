// Types for Excel Analysis Feature
import { Workbook } from 'exceljs'

// Core interfaces following Interface Segregation Principle
export interface IAnalyzer {
  name: string
  analyze(workbook: Workbook): Promise<IAnalysisIssue[]>
}

export interface IAnalysisIssue {
  type: 'error' | 'warning' | 'suggestion'
  severity: 'high' | 'medium' | 'low'
  location: string
  message: string
  code?: string
  suggestion?: string
  metadata?: Record<string, any>
}

export interface IAnalysisResult {
  id: string
  userId: string
  results: IAnalysisIssue[]
  metadata: IAnalysisMetadata
  createdAt: Date
  updatedAt?: Date
  status: 'pending' | 'processing' | 'completed' | 'failed'
}

export interface IAnalysisMetadata {
  fileName: string
  fileSize: number
  analyzersUsed: string[]
  processingTime: number
  worksheetCount?: number
  cellCount?: number
}

// DTOs for API communication
export interface AnalyzeFileRequest {
  file: File
  options?: {
    skipAnalyzers?: string[]
    maxIssues?: number
  }
}

export interface AnalyzeFileResponse {
  success: boolean
  analysisId?: string
  results?: IAnalysisResult
  error?: string
}

// Events for real-time updates
export interface IAnalysisEvent {
  type: 'started' | 'progress' | 'completed' | 'failed'
  analysisId: string
  data?: any
  timestamp: Date
}

// Feature configuration
export interface IExcelAnalysisConfig {
  maxFileSize: number
  supportedFormats: string[]
  analyzers: {
    [key: string]: {
      enabled: boolean
      priority: number
      config?: any
    }
  }
}