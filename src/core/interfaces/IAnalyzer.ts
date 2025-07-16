// SOLID 원칙 - Interface Segregation Principle (ISP)
// 인터페이스를 작게 분리하여 필요한 것만 구현

export interface IAnalyzer {
  analyze(data: Buffer): Promise<IAnalysisResult[]>
}

export interface IReportGenerator {
  generateReport(results: IAnalysisResult[]): Promise<string>
}

export interface IAnalysisResult {
  type: 'error' | 'warning' | 'suggestion'
  severity: 'high' | 'medium' | 'low'
  location: string
  message: string
  code?: string
  suggestion?: string
  metadata?: Record<string, any>
}

// Single Responsibility Principle (SRP)
// 각 분석기는 하나의 책임만 가짐
export interface ICircularReferenceAnalyzer extends IAnalyzer {
  detectCycles(formulas: Map<string, string[]>): string[][]
}

export interface IDataTypeAnalyzer extends IAnalyzer {
  checkDataConsistency(data: any[][]): IAnalysisResult[]
}

export interface IFormulaAnalyzer extends IAnalyzer {
  optimizeFormulas(formulas: string[]): IAnalysisResult[]
}

// Dependency Inversion Principle (DIP)
// 구체적인 구현이 아닌 추상화에 의존
export interface IAnalyzerFactory {
  createAnalyzer(type: AnalyzerType): IAnalyzer
}

export enum AnalyzerType {
  CIRCULAR_REFERENCE = 'circular_reference',
  DATA_TYPE = 'data_type',
  FORMULA = 'formula',
  VBA = 'vba'
}

// Open/Closed Principle (OCP)
// 확장에는 열려있고 수정에는 닫혀있음
export interface IAnalyzerPlugin {
  name: string
  version: string
  analyze(data: Buffer): Promise<IAnalysisResult[]>
}

export interface IAnalyzerRegistry {
  register(plugin: IAnalyzerPlugin): void
  getAnalyzer(name: string): IAnalyzerPlugin | undefined
  getAllAnalyzers(): IAnalyzerPlugin[]
}