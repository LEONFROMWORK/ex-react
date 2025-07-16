import ExcelJS from 'exceljs'
import { AnalysisModule, AnalysisResult } from '../types'

export class DataTypeCheckerModule implements AnalysisModule {
  name = 'data-type-checker'
  
  async analyze(workbook: ExcelJS.Workbook): Promise<AnalysisResult[]> {
    const results: AnalysisResult[] = []
    
    workbook.eachSheet(worksheet => {
      // 열별 데이터 타입 추적
      const columnTypes = new Map<number, Set<string>>()
      const columnValues = new Map<number, any[]>()
      
      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell, colNumber) => {
          const location = `${worksheet.name}!${cell.address}`
          
          // 1. 텍스트로 저장된 숫자 검출
          if (cell.type === ExcelJS.ValueType.String && cell.value !== null) {
            const value = String(cell.value).trim()
            
            // 숫자처럼 보이는 텍스트
            if (!isNaN(Number(value)) && value !== '') {
              results.push({
                type: 'warning',
                severity: 'medium',
                location,
                message: '텍스트로 저장된 숫자입니다',
                suggestion: '=VALUE(TRIM(' + cell.address + ')) 함수를 사용하거나, 데이터 > 텍스트 나누기를 사용하여 숫자로 변환하세요',
                code: 'TEXT_AS_NUMBER',
                metadata: {
                  value: value,
                  suggestedValue: Number(value)
                }
              })
            }
            
            // 날짜처럼 보이는 텍스트
            const datePattern = /^\d{4}[-\/]\d{1,2}[-\/]\d{1,2}$/
            if (datePattern.test(value)) {
              results.push({
                type: 'warning',
                severity: 'low',
                location,
                message: '텍스트로 저장된 날짜입니다',
                suggestion: '=DATEVALUE(' + cell.address + ') 함수를 사용하여 날짜로 변환하세요',
                code: 'TEXT_AS_DATE',
                metadata: {
                  value: value
                }
              })
            }
          }
          
          // 2. 잘못된 날짜 형식
          if (cell.type === ExcelJS.ValueType.Date && cell.value !== null) {
            const dateValue = cell.value as Date
            if (isNaN(dateValue.getTime())) {
              results.push({
                type: 'error',
                severity: 'medium',
                location,
                message: '잘못된 날짜 형식입니다',
                suggestion: '유효한 날짜 형식(YYYY-MM-DD)을 사용하세요',
                code: 'INVALID_DATE'
              })
            }
          }
          
          // 3. 오류 값 검출
          if (cell.type === ExcelJS.ValueType.Error) {
            const errorValue = String(cell.value)
            results.push({
              type: 'error',
              severity: 'high',
              location,
              message: `수식 오류: ${errorValue}`,
              suggestion: this.getErrorSuggestion(errorValue),
              code: 'FORMULA_ERROR',
              metadata: {
                errorType: errorValue
              }
            })
          }
          
          // 열별 데이터 타입 수집 (일관성 검사용)
          if (!columnTypes.has(colNumber)) {
            columnTypes.set(colNumber, new Set())
            columnValues.set(colNumber, [])
          }
          
          const valueType = this.getValueType(cell)
          if (valueType && rowNumber > 1) { // 헤더 제외
            columnTypes.get(colNumber)!.add(valueType)
            columnValues.get(colNumber)!.push({
              row: rowNumber,
              type: valueType,
              value: cell.value
            })
          }
        })
      })
      
      // 4. 열의 데이터 타입 일관성 검사
      columnTypes.forEach((types, colNumber) => {
        if (types.size > 1 && !types.has('empty')) {
          const values = columnValues.get(colNumber) || []
          if (values.length > 5) { // 충분한 데이터가 있을 때만
            const columnLetter = this.getColumnLetter(colNumber)
            
            results.push({
              type: 'warning',
              severity: 'low',
              location: `${worksheet.name}!${columnLetter}:${columnLetter}`,
              message: '열의 데이터 타입이 일치하지 않습니다',
              suggestion: '동일한 데이터 타입을 사용하여 일관성을 유지하세요',
              code: 'INCONSISTENT_COLUMN_TYPE',
              metadata: {
                types: Array.from(types),
                sampleRows: values.slice(0, 3).map(v => v.row)
              }
            })
          }
        }
      })
    })
    
    return results
  }
  
  private getValueType(cell: ExcelJS.Cell): string | null {
    if (cell.value === null || cell.value === undefined || cell.value === '') {
      return 'empty'
    }
    
    switch (cell.type) {
      case ExcelJS.ValueType.Number:
        return 'number'
      case ExcelJS.ValueType.String:
        return 'string'
      case ExcelJS.ValueType.Date:
        return 'date'
      case ExcelJS.ValueType.Boolean:
        return 'boolean'
      case ExcelJS.ValueType.Formula:
        return 'formula'
      case ExcelJS.ValueType.Error:
        return 'error'
      default:
        return null
    }
  }
  
  private getColumnLetter(colNumber: number): string {
    let letter = ''
    while (colNumber > 0) {
      const modulo = (colNumber - 1) % 26
      letter = String.fromCharCode(65 + modulo) + letter
      colNumber = Math.floor((colNumber - modulo) / 26)
    }
    return letter
  }
  
  private getErrorSuggestion(errorType: string): string {
    const suggestions: Record<string, string> = {
      '#REF!': '참조가 유효하지 않습니다. 삭제된 셀이나 시트를 참조하고 있는지 확인하세요.',
      '#VALUE!': '수식에 잘못된 데이터 타입이 사용되었습니다. 숫자가 필요한 곳에 텍스트가 있는지 확인하세요.',
      '#DIV/0!': '0으로 나누기 오류입니다. =IF(B1=0, 0, A1/B1)과 같이 조건부 수식을 사용하세요.',
      '#NAME?': '함수 이름이나 범위 이름이 잘못되었습니다. 철자를 확인하세요.',
      '#NULL!': '잘못된 범위 교집합입니다. 범위 참조를 확인하세요.',
      '#NUM!': '숫자가 너무 크거나 작습니다. 계산을 확인하세요.',
      '#N/A': '값을 사용할 수 없습니다. VLOOKUP이나 MATCH 함수의 조회 값을 확인하세요.'
    }
    
    return suggestions[errorType] || '수식을 검토하고 수정하세요.'
  }
}