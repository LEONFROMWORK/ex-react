import { HyperFormula, ConfigParams, Sheet } from 'hyperformula'
import ExcelJS from 'exceljs'

export interface FormulaEngineConfig extends Partial<ConfigParams> {
  // 추가 설정 옵션
  enableCaching?: boolean
  maxCacheSize?: number
  parallelProcessing?: boolean
}

export interface FormulaValidationResult {
  isValid: boolean
  error: string | null
  suggestion?: string
}

export interface FormulaEvaluationResult {
  result: any
  error?: string
  executionTime: number
}

export interface CircularReference {
  cells: string[]
  description: string
}

export interface FormulaDependency {
  formula: string
  dependencies: string[]
  precedents: string[]
}

export class FormulaEngine {
  private hf: HyperFormula | null = null
  private config: FormulaEngineConfig
  private sheetMapping: Map<string, number> = new Map()
  private initializationTime: number = 0

  constructor(config: FormulaEngineConfig = {}) {
    this.config = {
      // 기본 HyperFormula 설정
      licenseKey: 'gpl-v3',
      useColumnIndex: false,
      useStats: true,
      
      // 성능 최적화 설정
      binarySearchThreshold: 100,
      chooseRandomSampleInStatisticalFunctions: true,
      
      // 날짜 처리
      dateFormats: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'],
      timeFormats: ['hh:mm', 'hh:mm:ss'],
      
      // 함수 설정
      functionArgSeparator: ',',
      decimalSeparator: '.',
      thousandSeparator: ',',
      
      // 커스텀 설정
      enableCaching: true,
      maxCacheSize: 1000,
      parallelProcessing: false,
      
      ...config
    }
  }

  /**
   * ExcelJS 워크북을 HyperFormula로 로드
   */
  async loadWorkbook(workbook: ExcelJS.Workbook): Promise<void> {
    const startTime = performance.now()
    
    try {
      // HyperFormula 인스턴스 생성
      const sheets: Sheet[] = []
      this.sheetMapping.clear()
      
      // 각 워크시트를 HyperFormula 형식으로 변환
      workbook.eachSheet((worksheet, sheetId) => {
        const sheetData: any[][] = []
        const maxRow = worksheet.rowCount
        const maxCol = worksheet.columnCount
        
        // 시트 데이터 추출
        for (let row = 1; row <= maxRow; row++) {
          const rowData: any[] = []
          const worksheetRow = worksheet.getRow(row)
          
          for (let col = 1; col <= maxCol; col++) {
            const cell = worksheetRow.getCell(col)
            
            if (cell.type === ExcelJS.ValueType.Formula) {
              // 수식은 문자열로 전달
              rowData.push(cell.formula || '')
            } else if (cell.type === ExcelJS.ValueType.Date) {
              // 날짜는 시리얼 넘버로 변환
              const date = cell.value as Date
              rowData.push(this.dateToSerial(date))
            } else {
              // 일반 값
              rowData.push(cell.value ?? '')
            }
          }
          
          sheetData.push(rowData)
        }
        
        sheets.push(sheetData)
        this.sheetMapping.set(worksheet.name, sheetId - 1)
      })
      
      // HyperFormula 인스턴스 생성
      this.hf = HyperFormula.buildFromSheets(sheets, this.config)
      
      this.initializationTime = performance.now() - startTime
      console.log(`HyperFormula 초기화 완료: ${this.initializationTime.toFixed(2)}ms`)
      
    } catch (error) {
      console.error('HyperFormula 로드 실패:', error)
      throw new Error(`워크북 로드 실패: ${error}`)
    }
  }

  /**
   * 리소스 정리
   */
  async destroy(): Promise<void> {
    if (this.hf) {
      this.hf.destroy()
      this.hf = null
      this.sheetMapping.clear()
    }
  }

  /**
   * 수식 유효성 검증
   */
  validateFormula(formula: string, context?: { sheet?: string, cell?: string }): FormulaValidationResult {
    if (!this.hf) {
      return { isValid: false, error: 'FormulaEngine이 초기화되지 않았습니다' }
    }

    try {
      // 임시 셀에서 수식 테스트
      const sheetId = context?.sheet ? this.sheetMapping.get(context.sheet) ?? 0 : 0
      
      
      // HyperFormula는 parse 메서드가 없으므로 직접 평가로 검증
      // 임시 셀에 수식을 설정하여 유효성 검사
      const testRow = 0
      const testCol = 0
      
      try {
        this.hf.setCellContents({ sheet: sheetId, row: testRow, col: testCol }, formula)
        const result = this.hf.getCellValue({ sheet: sheetId, row: testRow, col: testCol })
        
        // 에러 체크
        if (result && typeof result === 'object' && 'type' in result && result.type === 'ERROR') {
          return {
            isValid: false,
            error: `수식 오류: ${result.value}`,
            suggestion: this.getSuggestionForError(result.value)
          }
        }
        
        // 정리
        this.hf.setCellContents({ sheet: sheetId, row: testRow, col: testCol }, null)
      } catch (parseError: any) {
        return {
          isValid: false,
          error: parseError.message || '수식 구문 오류',
          suggestion: '수식 구문을 확인하세요'
        }
      }
      
      return { isValid: true, error: null }
      
    } catch (error: any) {
      return {
        isValid: false,
        error: error.message || '수식 검증 실패',
        suggestion: '수식 구문을 확인하세요'
      }
    }
  }

  /**
   * 수식 평가
   */
  evaluateFormula(formula: string, context?: { sheet?: string, cell?: string }): FormulaEvaluationResult {
    if (!this.hf) {
      return { result: null, error: 'FormulaEngine이 초기화되지 않았습니다', executionTime: 0 }
    }

    const startTime = performance.now()
    
    try {
      const sheetId = context?.sheet ? this.sheetMapping.get(context.sheet) ?? 0 : 0
      
      // 임시 셀에 수식 설정하여 평가
      const tempRow = this.hf.getSheetDimensions(sheetId).height
      const tempCol = this.hf.getSheetDimensions(sheetId).width
      
      this.hf.setCellContents({ sheet: sheetId, row: tempRow, col: tempCol }, formula)
      const result = this.hf.getCellValue({ sheet: sheetId, row: tempRow, col: tempCol })
      
      // 임시 셀 정리
      this.hf.setCellContents({ sheet: sheetId, row: tempRow, col: tempCol }, null)
      
      const executionTime = performance.now() - startTime
      
      return { result, executionTime }
      
    } catch (error: any) {
      const executionTime = performance.now() - startTime
      return { 
        result: null, 
        error: error.message || '수식 평가 실패',
        executionTime 
      }
    }
  }

  /**
   * 순환 참조 검사
   */
  detectCircularReferences(): CircularReference[] {
    if (!this.hf) {
      return []
    }

    const circularRefs: CircularReference[] = []
    
    // HyperFormula는 자동으로 순환 참조를 감지함
    // 각 시트의 모든 셀을 검사
    for (const [sheetName, sheetId] of this.sheetMapping) {
      const dimensions = this.hf.getSheetDimensions(sheetId)
      
      for (let row = 0; row < dimensions.height; row++) {
        for (let col = 0; col < dimensions.width; col++) {
          const cellValue = this.hf.getCellValue({ sheet: sheetId, row, col })
          
          if (cellValue && typeof cellValue === 'object' && cellValue.type === 'ERROR' && cellValue.value === 'CYCLE') {
            const cellAddress = this.getCellAddress(sheetName, row, col)
            
            // 순환 참조에 포함된 셀들 찾기
            const dependencies = this.hf.getCellDependencies({ sheet: sheetId, row, col })
            const cells = [cellAddress]
            
            if (dependencies) {
              dependencies.forEach(dep => {
                cells.push(this.getCellAddress(sheetName, dep.row, dep.col))
              })
            }
            
            circularRefs.push({
              cells,
              description: `순환 참조 감지: ${cells.join(' → ')}`
            })
          }
        }
      }
    }
    
    return circularRefs
  }

  /**
   * 수식 최적화
   */
  optimizeFormula(formula: string): string {
    if (!formula || !this.hf) {
      return formula
    }

    // 기본적인 수식 최적화 규칙
    let optimized = formula
    
    // 불필요한 괄호 제거
    optimized = optimized.replace(/\(\(([^()]+)\)\)/g, '($1)')
    
    // 이중 부호 단순화
    optimized = optimized.replace(/--/g, '+')
    optimized = optimized.replace(/\+-/g, '-')
    
    // 0과의 연산 단순화
    optimized = optimized.replace(/\+0\b/g, '')
    optimized = optimized.replace(/\*0\b/g, '*0')
    optimized = optimized.replace(/\b0\*/g, '0*')
    
    // 1과의 곱셈 단순화
    optimized = optimized.replace(/\*1\b/g, '')
    optimized = optimized.replace(/\b1\*/g, '')
    
    return optimized
  }

  /**
   * 수식 의존성 분석
   */
  getDependencies(formula: string, context?: { sheet?: string, cell?: string }): string[] {
    if (!this.hf || !context) {
      return []
    }

    try {
      const sheetId = context.sheet ? this.sheetMapping.get(context.sheet) ?? 0 : 0
      const dependencies: string[] = []
      
      // HyperFormula의 getDependencies 메서드 사용
      // 임시로 수식을 설정하여 의존성 추출
      const tempRow = 0
      const tempCol = 0
      
      this.hf.setCellContents({ sheet: sheetId, row: tempRow, col: tempCol }, formula)
      
      // getCellDependencies 메서드 사용
      const deps = this.hf.getCellDependencies({ sheet: sheetId, row: tempRow, col: tempCol })
      
      if (deps) {
        deps.forEach(dep => {
          const depAddress = this.getCellAddress(context.sheet || 'Sheet1', dep.row, dep.col)
          dependencies.push(depAddress)
        })
      }
      
      // 정리
      this.hf.setCellContents({ sheet: sheetId, row: tempRow, col: tempCol }, null)
      
      return dependencies
      
    } catch (error) {
      console.error('의존성 분석 실패:', error)
      return []
    }
  }

  /**
   * 성능 통계 가져오기
   */
  getPerformanceStats() {
    if (!this.hf) {
      return null
    }

    // HyperFormula의 getStats는 Map을 반환함
    const stats = this.hf.getStats()
    
    return {
      initializationTime: this.initializationTime,
      cacheHitRate: 0, // HyperFormula doesn't provide this directly
      evaluatedCells: stats.get('CELLS_EVALUATED') || 0,
      totalCells: stats.get('CELLS') || 0,
      formulaCells: stats.get('FORMULAS') || 0
    }
  }

  // 유틸리티 함수들
  
  private dateToSerial(date: Date): number {
    // Excel의 날짜 시리얼 넘버 (1900년 1월 1일 = 1)
    const excelEpoch = new Date(1900, 0, 1)
    const dayMs = 24 * 60 * 60 * 1000
    return Math.floor((date.getTime() - excelEpoch.getTime()) / dayMs) + 2
  }

  private getCellAddress(sheet: string, row: number, col: number): string {
    const colLetter = this.columnNumberToLetter(col + 1)
    return `${sheet}!${colLetter}${row + 1}`
  }

  private columnNumberToLetter(col: number): string {
    let letter = ''
    while (col > 0) {
      col--
      letter = String.fromCharCode(65 + (col % 26)) + letter
      col = Math.floor(col / 26)
    }
    return letter
  }

  private getSuggestionForError(errorType: string): string {
    const suggestions: Record<string, string> = {
      'SYNTAX': '수식 구문을 확인하세요. 괄호와 쉼표가 올바른지 확인하세요.',
      'REF': '참조하는 셀이나 범위가 유효한지 확인하세요.',
      'NAME': '함수 이름이나 정의된 이름이 올바른지 확인하세요.',
      'VALUE': '인수의 데이터 타입이 올바른지 확인하세요.',
      'DIV0': '0으로 나누는 연산을 피하세요. IF 함수로 조건 처리를 추가하세요.',
      'CYCLE': '순환 참조가 발생했습니다. 수식 간 참조 관계를 확인하세요.'
    }
    
    return suggestions[errorType] || '수식을 다시 확인해주세요.'
  }
}