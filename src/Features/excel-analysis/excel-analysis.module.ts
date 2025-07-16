// Vertical Slice Architecture - Excel Analysis Feature Module
import { ExcelAnalysisAPI } from './api/excel-analysis.api'
import { ExcelAnalysisService } from './services/excel-analysis.service'
import { ExcelAnalysisRepository } from './repositories/excel-analysis.repository'
import { CircularReferenceAnalyzer } from './analyzers/circular-reference.analyzer'
import { DataTypeAnalyzer } from './analyzers/data-type.analyzer'
import { FormulaOptimizer } from './analyzers/formula-optimizer.analyzer'
import { IAnalysisResult } from './types/excel-analysis.types'

// Feature Module - 모든 Excel 분석 관련 기능을 포함
export class ExcelAnalysisModule {
  private static instance: ExcelAnalysisModule
  private service: ExcelAnalysisService
  private repository: ExcelAnalysisRepository
  
  private constructor() {
    // 의존성 주입 설정
    this.repository = new ExcelAnalysisRepository()
    
    // 분석기 등록
    const analyzers = [
      new CircularReferenceAnalyzer(),
      new DataTypeAnalyzer(),
      new FormulaOptimizer()
    ]
    
    this.service = new ExcelAnalysisService(this.repository, analyzers)
  }
  
  static getInstance(): ExcelAnalysisModule {
    if (!ExcelAnalysisModule.instance) {
      ExcelAnalysisModule.instance = new ExcelAnalysisModule()
    }
    return ExcelAnalysisModule.instance
  }
  
  // Public API
  async analyzeFile(fileBuffer: Buffer, userId: string): Promise<IAnalysisResult> {
    return this.service.analyzeFile(fileBuffer, userId)
  }
  
  async getAnalysisHistory(userId: string, limit: number = 10) {
    return this.repository.getAnalysisHistory(userId, limit)
  }
  
  async getAnalysisById(analysisId: string, userId: string) {
    return this.repository.getAnalysisById(analysisId, userId)
  }
  
  // Feature health check
  async healthCheck(): Promise<{ status: string; details: any }> {
    return {
      status: 'healthy',
      details: {
        analyzers: this.service.getRegisteredAnalyzers(),
        repository: await this.repository.ping()
      }
    }
  }
}