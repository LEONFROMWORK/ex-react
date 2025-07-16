// Service interfaces for dependency injection

export interface IFileService {
  uploadFile(file: File): Promise<string>
  downloadFile(fileId: string): Promise<Blob>
  deleteFile(fileId: string): Promise<void>
}

export interface IAnalysisService {
  analyzeFile(fileId: string, options?: AnalysisOptions): Promise<AnalysisResult[]>
  getAnalysisStatus(fileId: string): Promise<AnalysisStatus>
}

export interface IErrorCorrectionService {
  applyFixes(fileId: string, fixIds: string[]): Promise<CorrectionResult>
  previewFix(fileId: string, fixId: string): Promise<FixPreview>
}

export interface IVBAService {
  analyzeVBA(fileId: string): Promise<VBAAnalysisResult>
  fixVBAErrors(fileId: string, errorIds: string[]): Promise<VBAFixResult>
}

export interface IExcelGenerationService {
  generateFromPrompt(prompt: string): Promise<GeneratedFile>
  generateFromTemplate(templateId: string, data: any): Promise<GeneratedFile>
}

export interface IChatService {
  sendMessage(message: string, context?: FileContext): Promise<ChatResponse>
  getHistory(sessionId: string): Promise<ChatMessage[]>
}

// DTOs
export interface AnalysisOptions {
  includeVBA?: boolean
  includePerformance?: boolean
  autoFixThreshold?: 'high' | 'medium' | 'low'
}

export interface AnalysisResult {
  id: string
  type: 'error' | 'warning' | 'optimization' | 'vba'
  severity: 'high' | 'medium' | 'low'
  location: string
  description: string
  suggestion?: string
  canAutoFix: boolean
}

export interface AnalysisStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  currentStep?: string
  estimatedTime?: number
}

export interface CorrectionResult {
  success: boolean
  appliedFixes: string[]
  failedFixes: string[]
  newFileId: string
}

export interface FixPreview {
  before: string
  after: string
  affectedCells: string[]
  confidence: number
}

export interface VBAAnalysisResult {
  modules: VBAModule[]
  errors: VBAError[]
  security: SecurityIssue[]
}

export interface VBAModule {
  name: string
  type: 'standard' | 'class' | 'form'
  code: string
  lineCount: number
}

export interface VBAError {
  id: string
  module: string
  line: number
  type: string
  message: string
  suggestion?: string
}

export interface SecurityIssue {
  severity: 'critical' | 'high' | 'medium' | 'low'
  type: string
  description: string
  recommendation: string
}

export interface GeneratedFile {
  fileId: string
  name: string
  preview: any[][]
  template?: string
}

export interface FileContext {
  fileId: string
  worksheet?: string
  range?: string
}

export interface ChatResponse {
  message: string
  suggestions?: string[]
  codeSnippets?: CodeSnippet[]
}

export interface CodeSnippet {
  language: 'excel' | 'vba' | 'python'
  code: string
  description?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  fileContext?: string
}