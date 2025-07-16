import ExcelJS from 'exceljs'
import { AnalysisModule, AnalysisResult, ExcelAnalyzerOptions } from './types'
import { CircularReferenceModule } from './modules/circular-reference'
import { DataTypeCheckerModule } from './modules/data-type-checker'
import { FormulaOptimizerModule } from './modules/formula-optimizer'

export class ExcelAnalyzer {
  private modules: Map<string, AnalysisModule> = new Map()
  private options: ExcelAnalyzerOptions
  
  constructor(options: ExcelAnalyzerOptions = {}) {
    this.options = {
      maxErrors: 100,
      ...options
    }
    
    // 기본 모듈 등록
    if (!options.modules) {
      this.registerModule(new CircularReferenceModule())
      this.registerModule(new DataTypeCheckerModule())
      this.registerModule(new FormulaOptimizerModule())
    } else {
      options.modules.forEach(module => this.registerModule(module))
    }
  }
  
  registerModule(module: AnalysisModule) {
    this.modules.set(module.name, module)
  }
  
  async analyze(fileBuffer: Buffer): Promise<AnalysisResult[]> {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(fileBuffer)
    
    const allResults: AnalysisResult[] = []
    const skipModules = new Set(this.options.skipModules || [])
    
    // 각 모듈 실행
    for (const [name, module] of this.modules) {
      if (skipModules.has(name)) continue
      
      try {
        console.log(`Running analysis module: ${name}`)
        const results = await module.analyze(workbook)
        allResults.push(...results)
        
        // 최대 오류 수 체크
        if (allResults.length >= this.options.maxErrors!) {
          break
        }
      } catch (error) {
        console.error(`Error in module ${name}:`, error)
        allResults.push({
          type: 'error',
          severity: 'high',
          location: 'Analysis Module',
          message: `분석 모듈 ${name} 실행 중 오류 발생`,
          code: 'MODULE_ERROR',
          metadata: { error: String(error) }
        })
      }
    }
    
    // 결과 정렬 (심각도 순)
    return this.sortResults(allResults)
  }
  
  private sortResults(results: AnalysisResult[]): AnalysisResult[] {
    const severityOrder = { high: 0, medium: 1, low: 2 }
    const typeOrder = { error: 0, warning: 1, suggestion: 2 }
    
    return results.sort((a, b) => {
      // 먼저 타입으로 정렬
      const typeDiff = typeOrder[a.type] - typeOrder[b.type]
      if (typeDiff !== 0) return typeDiff
      
      // 같은 타입이면 심각도로 정렬
      return severityOrder[a.severity] - severityOrder[b.severity]
    })
  }
  
  async generateReport(results: AnalysisResult[]): Promise<string> {
    const grouped = this.groupResults(results)
    let report = '# Excel 분석 보고서\n\n'
    
    report += `## 요약\n`
    report += `- 총 ${results.length}개 항목 발견\n`
    report += `- 오류: ${grouped.error?.length || 0}개\n`
    report += `- 경고: ${grouped.warning?.length || 0}개\n`
    report += `- 제안: ${grouped.suggestion?.length || 0}개\n\n`
    
    if (grouped.error && grouped.error.length > 0) {
      report += `## 🔴 오류 (${grouped.error.length}개)\n\n`
      grouped.error.forEach((result, idx) => {
        report += `### ${idx + 1}. ${result.message}\n`
        report += `- 위치: ${result.location}\n`
        report += `- 심각도: ${result.severity}\n`
        if (result.suggestion) {
          report += `- 해결 방법: ${result.suggestion}\n`
        }
        report += '\n'
      })
    }
    
    if (grouped.warning && grouped.warning.length > 0) {
      report += `## 🟡 경고 (${grouped.warning.length}개)\n\n`
      grouped.warning.forEach((result, idx) => {
        report += `### ${idx + 1}. ${result.message}\n`
        report += `- 위치: ${result.location}\n`
        if (result.suggestion) {
          report += `- 권장 사항: ${result.suggestion}\n`
        }
        report += '\n'
      })
    }
    
    if (grouped.suggestion && grouped.suggestion.length > 0) {
      report += `## 💡 개선 제안 (${grouped.suggestion.length}개)\n\n`
      grouped.suggestion.forEach((result, idx) => {
        report += `### ${idx + 1}. ${result.message}\n`
        report += `- 위치: ${result.location}\n`
        report += `- 제안: ${result.suggestion}\n`
        report += '\n'
      })
    }
    
    return report
  }
  
  private groupResults(results: AnalysisResult[]): Record<string, AnalysisResult[]> {
    return results.reduce((acc, result) => {
      if (!acc[result.type]) acc[result.type] = []
      acc[result.type].push(result)
      return acc
    }, {} as Record<string, AnalysisResult[]>)
  }
}

// Export types and modules
export * from './types'
export { CircularReferenceModule } from './modules/circular-reference'
export { DataTypeCheckerModule } from './modules/data-type-checker'
export { FormulaOptimizerModule } from './modules/formula-optimizer'