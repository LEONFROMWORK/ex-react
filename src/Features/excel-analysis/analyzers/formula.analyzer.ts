import { IAnalyzer, IAnalysisResult } from '../types/excel-analysis.types'
import ExcelJS from 'exceljs'

export class FormulaAnalyzer implements IAnalyzer {
  name = 'FormulaAnalyzer'
  
  async analyze(workbook: ExcelJS.Workbook): Promise<IAnalysisResult[]> {
    const results: IAnalysisResult[] = []
    
    workbook.eachSheet((worksheet) => {
      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell, colNumber) => {
          if (cell.type === ExcelJS.ValueType.Formula || cell.formula) {
            const issues = this.analyzeFormula(
              cell.formula || cell.value?.toString() || '',
              worksheet.name,
              cell.address
            )
            results.push(...issues)
          }
        })
      })
    })
    
    return results
  }
  
  private analyzeFormula(
    formula: string,
    sheetName: string,
    cellAddress: string
  ): IAnalysisResult[] {
    const results: IAnalysisResult[] = []
    
    // 순환 참조 검사
    if (formula.includes(cellAddress)) {
      results.push({
        code: 'CIRCULAR_REFERENCE',
        type: 'error',
        severity: 'critical',
        message: '순환 참조가 발견되었습니다',
        suggestion: '수식에서 자기 자신을 참조하지 않도록 수정하세요',
        location: {
          sheet: sheetName,
          cell: cellAddress,
          formula
        },
        category: 'formula'
      })
    }
    
    // 휠발성 함수 검사
    const volatileFunctions = ['NOW', 'TODAY', 'RAND', 'RANDBETWEEN', 'OFFSET', 'INDIRECT']
    const usedVolatile = volatileFunctions.filter(fn => 
      formula.toUpperCase().includes(fn + '(')
    )
    
    if (usedVolatile.length > 0) {
      results.push({
        code: 'VOLATILE_FUNCTION',
        type: 'performance',
        severity: 'medium',
        message: `휠발성 함수 사용: ${usedVolatile.join(', ')}`,
        suggestion: '휠발성 함수는 파일 성능에 영향을 줄 수 있습니다',
        location: {
          sheet: sheetName,
          cell: cellAddress,
          formula
        },
        category: 'formula'
      })
    }
    
    // 복잡한 수식 검사
    if (formula.length > 200 || (formula.match(/\(/g) || []).length > 10) {
      results.push({
        code: 'COMPLEX_FORMULA',
        type: 'maintainability',
        severity: 'medium',
        message: '매우 복잡한 수식입니다',
        suggestion: '수식을 여러 셀로 나누어 가독성을 향상시키세요',
        location: {
          sheet: sheetName,
          cell: cellAddress,
          formula
        },
        category: 'formula'
      })
    }
    
    // #REF! 오류 검사
    if (formula.includes('#REF!')) {
      results.push({
        code: 'REF_ERROR',
        type: 'error',
        severity: 'high',
        message: '참조 오류가 발견되었습니다',
        suggestion: '삭제된 셀이나 시트를 참조하고 있습니다',
        location: {
          sheet: sheetName,
          cell: cellAddress,
          formula
        },
        autoFixable: false,
        category: 'formula'
      })
    }
    
    // VLOOKUP vs INDEX/MATCH 권장
    if (formula.toUpperCase().includes('VLOOKUP(')) {
      results.push({
        code: 'VLOOKUP_USAGE',
        type: 'performance',
        severity: 'low',
        message: 'VLOOKUP 사용 감지',
        suggestion: 'INDEX/MATCH 조합이 더 유연하고 빠를 수 있습니다',
        location: {
          sheet: sheetName,
          cell: cellAddress,
          formula
        },
        category: 'formula'
      })
    }
    
    return results
  }
}