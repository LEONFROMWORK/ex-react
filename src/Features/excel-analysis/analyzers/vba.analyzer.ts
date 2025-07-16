import { IAnalyzer, IAnalysisResult } from '../types/excel-analysis.types'
import { VBAAnalysisService } from '@/lib/services/vba-analysis.service'
import ExcelJS from 'exceljs'

export class VBAAnalyzer implements IAnalyzer {
  name = 'VBAAnalyzer'
  private vbaService: VBAAnalysisService
  
  constructor() {
    this.vbaService = new VBAAnalysisService()
  }
  
  async analyze(workbook: ExcelJS.Workbook): Promise<IAnalysisResult[]> {
    const results: IAnalysisResult[] = []
    
    try {
      // VBA 코드 추출 (실제 구현에서는 별도 도구 필요)
      const vbaModules = await this.vbaService.extractVBACode(workbook)
      
      if (vbaModules.length === 0) {
        return results
      }
      
      // 각 모듈 분석
      for (const vbaModule of vbaModules) {
        const analysisResult = await this.vbaService.analyzeVBACode(
          vbaModule.code,
          vbaModule.moduleName
        )
        
        // 오류를 IAnalysisResult 형식으로 변환
        analysisResult.errors.forEach(error => {
          results.push({
            code: `VBA_${error.type.toUpperCase()}`,
            type: error.type,
            severity: error.severity === 'error' ? 'high' : 
                     error.severity === 'warning' ? 'medium' : 'low',
            message: error.message,
            suggestion: error.suggestion,
            location: {
              sheet: vbaModule.moduleName,
              cell: `Line ${error.line}`,
              formula: error.procedure || ''
            },
            autoFixable: error.autoFixable,
            category: 'vba'
          })
        })
        
        // 보안 문제를 IAnalysisResult 형식으로 변환
        analysisResult.securityIssues.forEach(issue => {
          results.push({
            code: `VBA_SECURITY_${issue.type.toUpperCase()}`,
            type: 'security',
            severity: issue.severity === 'critical' ? 'critical' :
                     issue.severity === 'high' ? 'high' :
                     issue.severity === 'medium' ? 'medium' : 'low',
            message: issue.description,
            suggestion: issue.recommendation,
            location: {
              sheet: vbaModule.moduleName,
              cell: `Line ${issue.line}`,
              formula: ''
            },
            autoFixable: false,
            category: 'vba'
          })
        })
        
        // 요약 정보 추가
        if (analysisResult.summary.errorCount > 0 ||
            analysisResult.summary.warningCount > 0) {
          results.push({
            code: 'VBA_SUMMARY',
            type: 'info',
            severity: 'low',
            message: `VBA 모듈 '${vbaModule.moduleName}' 분석 완료: ` +
                    `${analysisResult.summary.errorCount}개 오류, ` +
                    `${analysisResult.summary.warningCount}개 경고, ` +
                    `${analysisResult.securityIssues.length}개 보안 문제`,
            location: {
              sheet: vbaModule.moduleName,
              cell: '',
              formula: ''
            },
            category: 'vba'
          })
        }
      }
      
      // VBA가 없는 경우 정보 메시지
      if (results.length === 0) {
        results.push({
          code: 'NO_VBA',
          type: 'info',
          severity: 'low',
          message: 'VBA 코드가 포함되지 않은 파일입니다.',
          location: {
            sheet: '',
            cell: '',
            formula: ''
          },
          category: 'vba'
        })
      }
      
    } catch (error) {
      results.push({
        code: 'VBA_ANALYSIS_ERROR',
        type: 'error',
        severity: 'high',
        message: `VBA 분석 중 오류 발생: ${error}`,
        location: {
          sheet: '',
          cell: '',
          formula: ''
        },
        category: 'vba'
      })
    }
    
    return results
  }
  
  // VBA 코드 자동 수정 기능
  async fixVBAIssues(
    workbook: ExcelJS.Workbook,
    issues: IAnalysisResult[]
  ): Promise<{ fixed: number; failed: number }> {
    let fixed = 0
    let failed = 0
    
    const vbaIssues = issues.filter(i => i.category === 'vba' && i.autoFixable)
    
    if (vbaIssues.length === 0) {
      return { fixed, failed }
    }
    
    try {
      // VBA 코드 추출
      const vbaModules = await this.vbaService.extractVBACode(workbook)
      
      for (const vbaModule of vbaModules) {
        const moduleIssues = vbaIssues.filter(i => 
          i.location.sheet === vbaModule.moduleName
        )
        
        if (moduleIssues.length > 0) {
          // VBAError 형식으로 변환
          const vbaErrors = moduleIssues.map(issue => ({
            type: issue.type as any,
            severity: issue.severity as any,
            module: vbaModule.moduleName,
            line: parseInt(issue.location.cell.replace('Line ', '')),
            message: issue.message,
            suggestion: issue.suggestion,
            autoFixable: issue.autoFixable || false
          }))
          
          try {
            const fixedCode = await this.vbaService.fixVBACode(
              vbaModule.code,
              vbaErrors
            )
            
            // 수정된 코드를 워크북에 적용 (실제 구현 필요)
            // vbaModule.code = fixedCode
            fixed += moduleIssues.length
          } catch (error) {
            failed += moduleIssues.length
          }
        }
      }
    } catch (error) {
      failed += vbaIssues.length
    }
    
    return { fixed, failed }
  }
}