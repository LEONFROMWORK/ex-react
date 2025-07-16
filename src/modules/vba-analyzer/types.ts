// VBA 분석 모듈 타입 정의

export interface VBAModule {
  name: string
  code: string
  type: 'Standard' | 'Class' | 'Form' | 'Document'
  lineCount: number
}

export interface VBASecurityRisk {
  pattern: string
  description: string
  severity: 'high' | 'medium' | 'low'
  module: string
  line?: number
  suggestion: string
}

export interface VBAPerformanceIssue {
  type: string
  module: string
  description: string
  impact: 'high' | 'medium' | 'low'
  suggestion: string
  codeSnippet?: string
}

export interface VBACodeQuality {
  issue: string
  type: 'naming' | 'structure' | 'complexity' | 'documentation'
  module: string
  suggestion: string
}

export interface VBAAnalysisResult {
  modules: VBAModule[]
  securityRisks: VBASecurityRisk[]
  performanceIssues: VBAPerformanceIssue[]
  codeQuality: VBACodeQuality[]
  summary: {
    totalModules: number
    totalLines: number
    riskLevel: 'high' | 'medium' | 'low'
    performanceScore: number
    qualityScore: number
  }
  aiInsights?: string[]
  error?: string
}