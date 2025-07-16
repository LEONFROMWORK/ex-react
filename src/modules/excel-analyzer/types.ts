// Excel 분석 모듈 타입 정의

export interface AnalysisModule {
  name: string
  analyze(workbook: any): Promise<AnalysisResult[]>
}

export interface AnalysisResult {
  type: 'error' | 'warning' | 'suggestion'
  severity: 'high' | 'medium' | 'low'
  location: string
  message: string
  suggestion?: string
  code?: string
  metadata?: Record<string, any>
}

export interface ExcelAnalyzerOptions {
  modules?: AnalysisModule[]
  skipModules?: string[]
  maxErrors?: number
}

export interface DependencyGraph {
  nodes: Map<string, CellNode>
  edges: Map<string, Set<string>>
}

export interface CellNode {
  address: string
  formula?: string
  value?: any
  dependencies: string[]
  dependents: string[]
}