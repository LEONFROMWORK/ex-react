// Service Layer - Business Logic
import ExcelJS from 'exceljs'
import { IAnalyzer, IAnalysisResult } from '../types/excel-analysis.types'
import { ExcelAnalysisRepository } from '../repositories/excel-analysis.repository'
import { EventEmitter } from 'events'

export class ExcelAnalysisService extends EventEmitter {
  private analyzers: Map<string, IAnalyzer> = new Map()
  
  constructor(
    private repository: ExcelAnalysisRepository,
    analyzers: IAnalyzer[]
  ) {
    super()
    
    // Register analyzers
    analyzers.forEach(analyzer => {
      this.registerAnalyzer(analyzer)
    })
  }
  
  registerAnalyzer(analyzer: IAnalyzer) {
    this.analyzers.set(analyzer.name, analyzer)
    this.emit('analyzer:registered', analyzer.name)
  }
  
  async analyzeFile(fileBuffer: Buffer, userId: string): Promise<IAnalysisResult> {
    const startTime = Date.now()
    
    try {
      // Load workbook
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(fileBuffer)
      
      // Run all analyzers
      const allResults: any[] = []
      
      for (const [name, analyzer] of this.analyzers) {
        this.emit('analysis:start', { analyzer: name })
        
        try {
          const results = await analyzer.analyze(workbook)
          allResults.push(...results)
          this.emit('analysis:complete', { analyzer: name, count: results.length })
        } catch (error) {
          this.emit('analysis:error', { analyzer: name, error })
          allResults.push({
            type: 'error',
            severity: 'high',
            location: `Analyzer: ${name}`,
            message: `분석 중 오류 발생: ${error}`
          })
        }
      }
      
      // Save analysis results
      const analysis = await this.repository.saveAnalysis({
        userId,
        results: allResults,
        metadata: {
          fileName: 'uploaded-file.xlsx',
          fileSize: fileBuffer.length,
          analyzersUsed: Array.from(this.analyzers.keys()),
          processingTime: Date.now() - startTime
        }
      })
      
      this.emit('analysis:saved', { analysisId: analysis.id })
      
      return analysis
    } catch (error) {
      this.emit('analysis:failed', error)
      throw error
    }
  }
  
  getRegisteredAnalyzers(): string[] {
    return Array.from(this.analyzers.keys())
  }
  
  // Feature-specific business logic
  async suggestOptimizations(analysisId: string): Promise<any> {
    const analysis = await this.repository.getAnalysisById(analysisId)
    
    if (!analysis) {
      throw new Error('Analysis not found')
    }
    
    // Business logic for generating optimization suggestions
    const suggestions = []
    
    // Check for circular references
    const circularRefs = analysis.results.filter(r => r.code === 'CIRCULAR_REFERENCE')
    if (circularRefs.length > 0) {
      suggestions.push({
        priority: 'high',
        type: 'circular_reference',
        message: `${circularRefs.length}개의 순환 참조를 발견했습니다. 즉시 수정이 필요합니다.`,
        solution: '수식 추적 도구를 사용하여 순환 고리를 찾아 제거하세요.'
      })
    }
    
    // Check for performance issues
    const performanceIssues = analysis.results.filter(r => 
      r.code === 'VOLATILE_FUNCTION' || r.code === 'COMPLEX_FORMULA'
    )
    if (performanceIssues.length > 5) {
      suggestions.push({
        priority: 'medium',
        type: 'performance',
        message: '성능 문제가 될 수 있는 수식이 많습니다.',
        solution: 'VLOOKUP을 INDEX/MATCH로 변경하고, 휘발성 함수 사용을 줄이세요.'
      })
    }
    
    return suggestions
  }
}