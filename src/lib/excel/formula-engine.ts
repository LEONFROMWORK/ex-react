import { HyperFormula, ConfigParams } from "hyperformula"
import ExcelJS from "exceljs"

export class FormulaEngine {
  private hf: HyperFormula

  constructor() {
    // HyperFormula 설정
    const options: Partial<ConfigParams> = {
      licenseKey: "gpl-v3", // GPL 라이센스 사용
      useColumnIndex: false, // A1 notation 사용
      language: "koKR", // 한국어 지원
      dateFormats: ["YYYY-MM-DD", "YYYY/MM/DD", "DD/MM/YYYY"],
      functionArgSeparator: ",",
      decimalSeparator: ".",
      thousandSeparator: ",",
      arrayColumnSeparator: ",",
      arrayRowSeparator: ";",
      // 추가 설정
      evaluateNullToZero: false,
      precisionRounding: 10,
      useStats: true,
    }

    this.hf = HyperFormula.buildEmpty(options as ConfigParams)
  }

  /**
   * ExcelJS 워크북의 데이터를 HyperFormula로 로드
   */
  async loadWorkbook(workbook: ExcelJS.Workbook): Promise<void> {
    // 각 워크시트를 HyperFormula 시트로 변환
    for (const worksheet of workbook.worksheets) {
      const sheetData = this.extractSheetData(worksheet)
      const sheetName = worksheet.name
      
      // HyperFormula에 시트 추가
      const sheetId = this.hf.addSheet(sheetName)
      
      if (sheetId !== null && sheetId !== undefined && sheetData.length > 0) {
        // 데이터 설정
        this.hf.setSheetContent(Number(sheetId), sheetData)
      }
    }
  }

  /**
   * ExcelJS 워크시트에서 데이터 추출
   */
  private extractSheetData(worksheet: ExcelJS.Worksheet): any[][] {
    const data: any[][] = []
    const maxRow = worksheet.rowCount
    const maxCol = worksheet.columnCount

    // 모든 행과 열을 순회
    for (let rowNum = 1; rowNum <= maxRow; rowNum++) {
      const rowData: any[] = []
      const row = worksheet.getRow(rowNum)
      
      for (let colNum = 1; colNum <= maxCol; colNum++) {
        const cell = row.getCell(colNum)
        
        if (cell.type === ExcelJS.ValueType.Formula) {
          // 수식인 경우 수식 문자열 저장
          rowData.push(cell.formula || cell.value)
        } else if (cell.type === ExcelJS.ValueType.Date) {
          // 날짜는 ISO 형식으로 변환
          const dateValue = cell.value as Date
          rowData.push(dateValue.toISOString().split('T')[0])
        } else {
          // 일반 값
          rowData.push(cell.value)
        }
      }
      
      data.push(rowData)
    }
    
    return data
  }

  /**
   * 수식 검증 및 오류 확인
   */
  validateFormula(formula: string, sheetName?: string): {
    isValid: boolean
    error?: string
    result?: any
  } {
    try {
      // 임시 셀에서 수식 평가
      const sheetId = sheetName ? this.hf.getSheetId(sheetName) : 0
      if (sheetId === null || sheetId === undefined) {
        return { isValid: false, error: "시트를 찾을 수 없습니다" }
      }

      // 빈 셀 찾기
      const testAddress = { sheet: sheetId as number, row: 9999, col: 9999 }
      
      // 수식 설정 및 평가
      this.hf.setCellContents(testAddress, formula)
      const result = this.hf.getCellValue(testAddress)
      
      // 오류 확인
      if (result && typeof result === "object" && "error" in result) {
        return {
          isValid: false,
          error: this.translateError((result as any).error),
          result: result.error
        }
      }
      
      // 정리
      this.hf.setCellContents(testAddress, null)
      
      return { isValid: true, result }
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : "알 수 없는 오류"
      }
    }
  }

  /**
   * 수식 재계산
   */
  recalculate(): void {
    this.hf.rebuildAndRecalculate()
  }

  /**
   * 특정 셀의 수식 평가
   */
  evaluateCell(sheetName: string, row: number, col: number): any {
    const sheetId = this.hf.getSheetId(sheetName)
    if (sheetId === null || sheetId === undefined) return null
    
    return this.hf.getCellValue({ sheet: sheetId as number, row: row - 1, col: col - 1 })
  }

  /**
   * 수식 의존성 분석
   */
  getDependencies(sheetName: string, row: number, col: number): {
    precedents: string[]
    dependents: string[]
  } {
    const sheetId = this.hf.getSheetId(sheetName)
    if (sheetId === null || sheetId === undefined) return { precedents: [], dependents: [] }
    
    const address = { sheet: sheetId as number, row: row - 1, col: col - 1 }
    
    // 선행 셀 (이 셀이 참조하는 셀들)
    const precedents = this.hf.getCellPrecedents(address)
    const precedentsList = precedents.map((addr: any) => 
      `${this.hf.getSheetName(addr.sheet)}!${this.cellAddressToA1(addr.row + 1, addr.col + 1)}`
    )
    
    // 종속 셀 (이 셀을 참조하는 셀들)
    const dependents = this.hf.getCellDependents(address)
    const dependentsList = dependents.map((addr: any) => 
      `${this.hf.getSheetName(addr.sheet)}!${this.cellAddressToA1(addr.row + 1, addr.col + 1)}`
    )
    
    return {
      precedents: precedentsList,
      dependents: dependentsList
    }
  }

  /**
   * 수식 최적화 제안
   */
  optimizeFormula(formula: string): {
    original: string
    optimized: string
    suggestion: string
  } | null {
    // VLOOKUP을 INDEX/MATCH로 변환
    if (formula.includes("VLOOKUP")) {
      const vlookupRegex = /VLOOKUP\s*\(\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/i
      const match = formula.match(vlookupRegex)
      
      if (match) {
        const [, lookupValue, tableArray, colIndex, rangeLookup] = match
        const optimized = `INDEX(${tableArray},MATCH(${lookupValue},INDEX(${tableArray},0,1),${rangeLookup}),${colIndex})`
        
        return {
          original: formula,
          optimized: optimized,
          suggestion: "VLOOKUP을 INDEX/MATCH로 변환하면 성능이 향상됩니다"
        }
      }
    }
    
    // 휘발성 함수 감지
    const volatileFunctions = ["NOW", "TODAY", "RAND", "RANDBETWEEN", "INDIRECT", "OFFSET"]
    for (const func of volatileFunctions) {
      if (formula.toUpperCase().includes(func)) {
        return {
          original: formula,
          optimized: formula,
          suggestion: `${func}는 휘발성 함수입니다. 재계산 시 성능에 영향을 줄 수 있습니다.`
        }
      }
    }
    
    return null
  }

  /**
   * 순환 참조 감지
   */
  detectCircularReferences(): Array<{
    cells: string[]
    description: string
  }> {
    const errors: Array<{ cells: string[]; description: string }> = []
    
    // 모든 시트 검사
    const sheetNames = this.hf.getSheetNames()
    
    for (const sheetName of sheetNames) {
      const sheetId = this.hf.getSheetId(sheetName)
      if (sheetId === null || sheetId === undefined) continue
      
      const sheetData = this.hf.getSheetValues(sheetId as number)
      
      for (let row = 0; row < sheetData.length; row++) {
        for (let col = 0; col < sheetData[row].length; col++) {
          const value = this.hf.getCellValue({ sheet: sheetId, row, col })
          
          if (value && typeof value === "object" && (value as any).error === "CYCLE") {
            const cellAddress = `${sheetName}!${this.cellAddressToA1(row + 1, col + 1)}`
            errors.push({
              cells: [cellAddress],
              description: "순환 참조가 감지되었습니다"
            })
          }
        }
      }
    }
    
    return errors
  }

  /**
   * 셀 주소를 A1 표기법으로 변환
   */
  private cellAddressToA1(row: number, col: number): string {
    let columnName = ""
    let columnNumber = col
    
    while (columnNumber > 0) {
      const modulo = (columnNumber - 1) % 26
      columnName = String.fromCharCode(65 + modulo) + columnName
      columnNumber = Math.floor((columnNumber - modulo) / 26)
    }
    
    return columnName + row
  }

  /**
   * 오류 메시지 번역
   */
  private translateError(error: string): string {
    const errorTranslations: Record<string, string> = {
      "VALUE": "잘못된 값 타입입니다",
      "NUM": "숫자 오류입니다",
      "DIV_BY_ZERO": "0으로 나눌 수 없습니다",
      "NAME": "이름을 찾을 수 없습니다",
      "N/A": "값을 사용할 수 없습니다",
      "CYCLE": "순환 참조입니다",
      "REF": "잘못된 참조입니다",
      "SPILL": "배열 수식 결과가 다른 셀과 충돌합니다",
      "CALC": "계산 오류입니다",
      "ERROR": "일반 오류입니다",
      "GETTING_DATA": "데이터를 가져오는 중입니다",
      "NULL": "Null 오류입니다"
    }
    
    return errorTranslations[error] || error
  }

  /**
   * HyperFormula 인스턴스 정리
   */
  destroy(): void {
    this.hf.destroy()
  }
}