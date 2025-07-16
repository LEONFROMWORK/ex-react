import { IAnalysisService, AnalysisOptions, AnalysisResult, AnalysisStatus } from '../interfaces'
import { ExcelAnalyzer, AnalysisItem } from '@/lib/modules/excel-analyzer'
import * as XLSX from 'xlsx'

export class ExcelAnalysisService implements IAnalysisService {
  private analyzer: ExcelAnalyzer
  private analysisStatus: Map<string, AnalysisStatus> = new Map()
  
  constructor() {
    this.analyzer = new ExcelAnalyzer()
  }
  
  async analyzeFile(fileId: string, options?: AnalysisOptions): Promise<AnalysisResult[]> {
    try {
      // Update status
      this.updateStatus(fileId, {
        status: 'processing',
        progress: 0,
        currentStep: '파일 로드 중...'
      })
      
      // Load file from localStorage (mock)
      const workbook = await this.loadWorkbook(fileId)
      
      this.updateStatus(fileId, {
        status: 'processing',
        progress: 30,
        currentStep: '오류 분석 중...'
      })
      
      // Run analysis
      const moduleResults = await this.analyzer.analyze(workbook, {
        includeOptimizations: options?.includePerformance,
        includeWarnings: true,
        deepAnalysis: true
      })
      
      this.updateStatus(fileId, {
        status: 'processing',
        progress: 70,
        currentStep: '결과 정리 중...'
      })
      
      // Convert to API format
      const results: AnalysisResult[] = []
      
      for (const moduleResult of moduleResults) {
        for (const item of moduleResult.results) {
          results.push(this.convertToAnalysisResult(item))
        }
      }
      
      // Add VBA analysis if requested
      if (options?.includeVBA) {
        this.updateStatus(fileId, {
          status: 'processing',
          progress: 85,
          currentStep: 'VBA 코드 분석 중...'
        })
        
        const vbaResults = await this.analyzeVBA(workbook)
        results.push(...vbaResults)
      }
      
      this.updateStatus(fileId, {
        status: 'completed',
        progress: 100,
        currentStep: '분석 완료'
      })
      
      return results
    } catch (error) {
      this.updateStatus(fileId, {
        status: 'failed',
        progress: 0,
        currentStep: '분석 실패'
      })
      
      console.error('Analysis error:', error)
      throw new Error('파일 분석 중 오류가 발생했습니다')
    }
  }
  
  async getAnalysisStatus(fileId: string): Promise<AnalysisStatus> {
    return this.analysisStatus.get(fileId) || {
      status: 'pending',
      progress: 0
    }
  }
  
  private updateStatus(fileId: string, status: AnalysisStatus) {
    this.analysisStatus.set(fileId, status)
  }
  
  private async loadWorkbook(fileId: string): Promise<any> {
    // In production, load from server
    // For now, create mock workbook
    const mockData = [
      ['Name', 'Value', 'Formula'],
      ['Total', 100, '=SUM(B3:B10)'],
      ['Item1', 10, '=10'],
      ['Item2', '=B3*2', '=B3*2'],
      ['Item3', '#DIV/0!', '=B3/0'],
      ['Item4', '#REF!', '=InvalidSheet!A1'],
      ['Circular', '=B7', '=B7'],
      ['VLOOKUP Test', '=VLOOKUP(A2,Sheet2!A:B,2,FALSE)', '=VLOOKUP(A2,Sheet2!A:B,2,FALSE)'],
      ['Complex', '=IF(B2>50,VLOOKUP(A2,Sheet2!A:C,3,FALSE),INDEX(Sheet2!C:C,MATCH(A2,Sheet2!A:A,0)))', ''],
      ['Spaces', '  Trimmed  ', '']
    ]
    
    const ws = XLSX.utils.aoa_to_sheet(mockData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    
    return wb
  }
  
  private convertToAnalysisResult(item: AnalysisItem): AnalysisResult {
    const typeMap = {
      error: 'error' as const,
      warning: 'warning' as const,
      optimization: 'optimization' as const,
      info: 'warning' as const
    }
    
    const severityMap = {
      critical: 'high' as const,
      high: 'high' as const,
      medium: 'medium' as const,
      low: 'low' as const
    }
    
    return {
      id: item.id,
      type: typeMap[item.type],
      severity: severityMap[item.severity],
      location: this.formatLocation(item.location),
      description: item.description,
      suggestion: item.suggestion,
      canAutoFix: item.autoFixAvailable
    }
  }
  
  private formatLocation(location: CellLocation): string {
    if (location.range) {
      return `${location.sheet}!${location.range}`
    } else if (location.cell) {
      return `${location.sheet}!${location.cell}`
    } else if (location.row !== undefined && location.column !== undefined) {
      return `${location.sheet}!R${location.row}C${location.column}`
    }
    return location.sheet
  }
  
  private async analyzeVBA(workbook: any): Promise<AnalysisResult[]> {
    // Mock VBA analysis results
    return [
      {
        id: 'vba-001',
        type: 'vba',
        severity: 'medium',
        location: 'Module1',
        description: 'Missing error handling in Sub ProcessData()',
        suggestion: 'Add On Error Resume Next or proper error handling',
        canAutoFix: true
      },
      {
        id: 'vba-002',
        type: 'vba',
        severity: 'low',
        location: 'ThisWorkbook',
        description: 'Unused variable declaration: Dim tempValue As String',
        suggestion: 'Remove unused variable',
        canAutoFix: true
      }
    ]
  }
}

// Type import from excel-analyzer
interface CellLocation {
  sheet: string
  cell?: string
  range?: string
  row?: number
  column?: number
}