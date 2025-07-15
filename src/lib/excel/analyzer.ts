import ExcelJS from "exceljs"
import { ExcelError, ErrorType, AnalysisResult } from "@/types/excel"
import { Readable } from "stream"

export class ExcelAnalyzer {
  private workbook: ExcelJS.Workbook | null = null
  private errors: ExcelError[] = []

  async analyzeFile(filePath: string): Promise<AnalysisResult> {
    try {
      // Read the Excel file using ExcelJS
      this.workbook = new ExcelJS.Workbook()
      await this.workbook.xlsx.readFile(filePath)
      
      // Reset errors
      this.errors = []

      // Analyze each worksheet
      this.workbook.eachSheet((worksheet) => {
        this.analyzeWorksheet(worksheet)
      })

      return {
        success: true,
        totalErrors: this.errors.length,
        errors: this.errors,
        summary: this.generateSummary(),
      }
    } catch (error) {
      console.error("Excel analysis error:", error)
      return {
        success: false,
        totalErrors: 0,
        errors: [],
        summary: "파일 분석 중 오류가 발생했습니다.",
      }
    }
  }

  async analyzeBuffer(buffer: Buffer): Promise<AnalysisResult> {
    try {
      this.workbook = new ExcelJS.Workbook()
      await this.workbook.xlsx.load(buffer as any)
      
      this.errors = []

      this.workbook.eachSheet((worksheet) => {
        this.analyzeWorksheet(worksheet)
      })

      return {
        success: true,
        totalErrors: this.errors.length,
        errors: this.errors,
        summary: this.generateSummary(),
      }
    } catch (error) {
      console.error("Excel analysis error:", error)
      return {
        success: false,
        totalErrors: 0,
        errors: [],
        summary: "파일 분석 중 오류가 발생했습니다.",
      }
    }
  }

  private analyzeWorksheet(worksheet: ExcelJS.Worksheet) {
    const sheetName = worksheet.name

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const cellAddress = cell.address

        // Check for formula errors
        this.checkFormulaErrors(cell, cellAddress, sheetName)
        
        // Check for data type errors
        this.checkDataTypeErrors(cell, cellAddress, sheetName)
        
        // Check for format errors
        this.checkFormatErrors(cell, cellAddress, sheetName)
      })
    })

    // Check for additional sheet-level issues
    this.checkDuplicateValues(worksheet, sheetName)
    this.checkMissingValues(worksheet, sheetName)
  }

  private checkFormulaErrors(cell: ExcelJS.Cell, address: string, sheet: string) {
    if (cell.type === ExcelJS.ValueType.Formula || cell.type === ExcelJS.ValueType.SharedString) {
      const errorPatterns = ["#REF!", "#VALUE!", "#DIV/0!", "#NAME?", "#NULL!", "#NUM!", "#N/A"]
      
      const cellValue = cell.value
      if (cellValue && typeof cellValue === "object" && "error" in cellValue) {
        const error = cellValue.error
        this.errors.push({
          type: ErrorType.FORMULA_ERROR,
          location: `${sheet}!${address}`,
          description: `수식 오류: ${error}`,
          value: error,
          suggestion: this.getSuggestionForFormulaError(error.toString()),
          severity: "high",
        })
      } else if (typeof cellValue === "string") {
        for (const pattern of errorPatterns) {
          if (cellValue.includes(pattern)) {
            this.errors.push({
              type: ErrorType.FORMULA_ERROR,
              location: `${sheet}!${address}`,
              description: `수식 오류: ${pattern}`,
              value: cellValue,
              suggestion: this.getSuggestionForFormulaError(pattern),
              severity: "high",
            })
          }
        }
      }
    }
  }

  private checkDataTypeErrors(cell: ExcelJS.Cell, address: string, sheet: string) {
    // Check for text that looks like numbers
    if (cell.type === ExcelJS.ValueType.String) {
      const stringValue = cell.value as string
      if (!isNaN(Number(stringValue)) && stringValue.trim() !== "") {
        this.errors.push({
          type: ErrorType.DATA_ERROR,
          location: `${sheet}!${address}`,
          description: "텍스트로 저장된 숫자",
          value: stringValue,
          suggestion: "숫자 형식으로 변환하세요",
          severity: "medium",
        })
      }
    }

    // Check for inconsistent data types in columns
    const col = cell.col
    const worksheet = cell.worksheet
    const columnValues: ExcelJS.CellValue[] = []
    
    worksheet.getColumn(col).eachCell({ includeEmpty: false }, (colCell) => {
      if (colCell.value !== null && colCell.value !== undefined) {
        columnValues.push(colCell.value)
      }
    })

    if (columnValues.length > 5) { // Only check if column has sufficient data
      const types = new Set(columnValues.map(v => typeof v))
      if (types.size > 1 && !types.has("object")) { // Mixed types excluding dates
        this.errors.push({
          type: ErrorType.DATA_ERROR,
          location: `${sheet}!${address}`,
          description: "열의 데이터 타입이 일치하지 않습니다",
          value: cell.value,
          suggestion: "동일한 데이터 타입을 사용하세요",
          severity: "low",
        })
      }
    }
  }

  private checkFormatErrors(cell: ExcelJS.Cell, address: string, sheet: string) {
    // Check date formats
    if (cell.type === ExcelJS.ValueType.Date) {
      const dateValue = cell.value as Date
      if (isNaN(dateValue.getTime())) {
        this.errors.push({
          type: ErrorType.FORMAT_ERROR,
          location: `${sheet}!${address}`,
          description: "잘못된 날짜 형식",
          value: cell.text || cell.value,
          suggestion: "올바른 날짜 형식을 사용하세요",
          severity: "medium",
        })
      }
    }

    // Check number formats
    if (cell.numFmt && cell.type === ExcelJS.ValueType.Number) {
      const numberValue = cell.value as number
      if (isNaN(numberValue)) {
        this.errors.push({
          type: ErrorType.FORMAT_ERROR,
          location: `${sheet}!${address}`,
          description: "잘못된 숫자 형식",
          value: cell.value,
          suggestion: "올바른 숫자 형식을 사용하세요",
          severity: "medium",
        })
      }
    }
  }

  private checkDuplicateValues(worksheet: ExcelJS.Worksheet, sheetName: string) {
    const valueMap = new Map<string, string[]>()

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        const cellValue = cell.value
        if (cellValue !== null && cellValue !== undefined && cellValue !== "") {
          const value = String(cellValue)
          const address = `${sheetName}!${cell.address}`
          
          if (!valueMap.has(value)) {
            valueMap.set(value, [])
          }
          valueMap.get(value)!.push(address)
        }
      })
    })

    // Find duplicates
    valueMap.forEach((locations, value) => {
      if (locations.length > 1 && value.length > 3) { // Only flag meaningful duplicates
        this.errors.push({
          type: ErrorType.DATA_ERROR,
          location: locations.join(", "),
          description: "중복된 값 발견",
          value,
          suggestion: "중복 값을 확인하고 필요시 제거하세요",
          severity: "low",
        })
      }
    })
  }

  private checkMissingValues(worksheet: ExcelJS.Worksheet, sheetName: string) {
    let headerRow: ExcelJS.Row | null = null
    let headerColumns: number[] = []

    // Find header row (assuming it's the first row with data)
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (!headerRow && rowNumber === 1) {
        headerRow = row
        row.eachCell({ includeEmpty: false }, (cell) => {
          headerColumns.push(Number(cell.col))
        })
        return false // Stop after first row
      }
    })

    if (!headerRow || headerColumns.length === 0) return

    // Check for empty cells in data rows
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return // Skip header row

      const emptyCells: string[] = []
      let hasData = false

      headerColumns.forEach(col => {
        const cell = row.getCell(col)
        if (cell.value !== null && cell.value !== undefined && cell.value !== "") {
          hasData = true
        } else {
          const columnLetter = worksheet.getColumn(col).letter || String.fromCharCode(64 + Number(col))
          emptyCells.push(columnLetter + rowNumber)
        }
      })

      if (hasData && emptyCells.length > 0 && emptyCells.length < headerColumns.length) {
        this.errors.push({
          type: ErrorType.DATA_ERROR,
          location: `${sheetName}!${emptyCells[0]}`,
          description: "누락된 데이터",
          value: "",
          suggestion: "빈 셀에 적절한 값을 입력하세요",
          severity: "medium",
        })
      }
    })
  }

  private getSuggestionForFormulaError(error: string): string {
    const suggestions: Record<string, string> = {
      "#REF!": "참조가 유효하지 않습니다. 삭제된 셀을 참조하고 있는지 확인하세요.",
      "#VALUE!": "수식에 잘못된 데이터 타입이 사용되었습니다. 숫자가 필요한 곳에 텍스트가 있는지 확인하세요.",
      "#DIV/0!": "0으로 나누기 오류입니다. IF 함수를 사용하여 0으로 나누는 것을 방지하세요.",
      "#NAME?": "함수 이름이나 범위 이름이 잘못되었습니다. 철자를 확인하세요.",
      "#NULL!": "잘못된 범위 교집합입니다. 범위 참조를 확인하세요.",
      "#NUM!": "숫자가 너무 크거나 작습니다. 계산을 확인하세요.",
      "#N/A": "값을 사용할 수 없습니다. VLOOKUP이나 MATCH 함수의 조회 값을 확인하세요.",
    }
    return suggestions[error] || "수식을 검토하고 수정하세요."
  }

  private generateSummary(): string {
    const errorCounts = this.errors.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1
      return acc
    }, {} as Record<ErrorType, number>)

    const summary = Object.entries(errorCounts)
      .map(([type, count]) => `${type}: ${count}개`)
      .join(", ")

    return summary || "오류가 발견되지 않았습니다."
  }

  async fixErrors(errors: ExcelError[]): Promise<ExcelJS.Workbook> {
    if (!this.workbook) {
      throw new Error("워크북이 로드되지 않았습니다.")
    }

    // Create a new workbook with fixes
    const newWorkbook = new ExcelJS.Workbook()
    
    // Copy all worksheets with fixes
    for (const worksheet of this.workbook.worksheets) {
      const newWorksheet = newWorkbook.addWorksheet(worksheet.name, {
        properties: worksheet.properties,
        views: worksheet.views,
      })

      // Copy all data
      worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
        const newRow = newWorksheet.getRow(rowNumber)
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const newCell = newRow.getCell(colNumber)
          
          // Copy cell properties
          newCell.value = cell.value
          newCell.style = cell.style
          newCell.numFmt = cell.numFmt

          // Apply fixes if this cell has an error
          const cellError = errors.find(e => 
            e.location === `${worksheet.name}!${cell.address}` && e.corrected
          )
          
          if (cellError) {
            this.applyFix(newCell, cellError)
          }
        })
        newRow.commit()
      })

      // Copy column properties
      worksheet.columns.forEach((col, index) => {
        if (col.width) {
          newWorksheet.getColumn(index + 1).width = col.width
        }
      })
    }

    return newWorkbook
  }

  private applyFix(cell: ExcelJS.Cell, error: ExcelError) {
    switch (error.type) {
      case ErrorType.FORMULA_ERROR:
        if (error.description.includes("#DIV/0!")) {
          // Wrap in IFERROR
          const formula = cell.formula || cell.value
          if (typeof formula === "string") {
            cell.value = { formula: `IFERROR(${formula}, 0)` }
          }
        }
        break
        
      case ErrorType.DATA_ERROR:
        if (error.description.includes("텍스트로 저장된 숫자")) {
          // Convert to number
          const numValue = Number(cell.value)
          if (!isNaN(numValue)) {
            cell.value = numValue
          }
        }
        break
        
      case ErrorType.FORMAT_ERROR:
        // Apply standard date format
        if (error.description.includes("날짜")) {
          cell.numFmt = "yyyy-mm-dd"
        }
        break
    }
  }

  async saveWorkbook(workbook: ExcelJS.Workbook, outputPath: string): Promise<void> {
    await workbook.xlsx.writeFile(outputPath)
  }

  async getWorkbookBuffer(workbook: ExcelJS.Workbook): Promise<Buffer> {
    return Buffer.from(await workbook.xlsx.writeBuffer())
  }
}