import ExcelJS from 'exceljs'
import { Result } from '@/Common/Result'
import { ExcelGenerationErrors } from './ExcelGenerationErrors'

export interface ExcelStructure {
  sheets: SheetStructure[]
  metadata?: {
    title?: string
    author?: string
    description?: string
    keywords?: string[]
  }
}

export interface SheetStructure {
  name: string
  columns: ColumnDefinition[]
  rows: RowData[]
  formulas?: FormulaDefinition[]
  formatting?: FormattingRule[]
  charts?: ChartDefinition[]
  validations?: ValidationRule[]
}

export interface ColumnDefinition {
  header: string
  key: string
  width?: number
  type?: 'text' | 'number' | 'date' | 'currency' | 'percentage' | 'formula'
  format?: string
}

export interface RowData {
  [key: string]: any
}

export interface FormulaDefinition {
  cell: string
  formula: string
  arrayFormula?: boolean
}

export interface FormattingRule {
  range: string
  style: Partial<ExcelJS.Style>
}

export interface ChartDefinition {
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'area'
  range: string
  position: { row: number; col: number }
  title?: string
  series?: ChartSeries[]
}

export interface ChartSeries {
  name: string
  categories: string
  values: string
}

export interface ValidationRule {
  range: string
  type: 'list' | 'whole' | 'decimal' | 'date' | 'textLength' | 'custom'
  allowBlank?: boolean
  showErrorMessage?: boolean
  errorTitle?: string
  error?: string
  formulae?: any[]
}

export class ExcelBuilderService {
  private workbook: ExcelJS.Workbook

  constructor() {
    this.workbook = new ExcelJS.Workbook()
    this.setupWorkbookProperties()
  }

  private setupWorkbookProperties() {
    this.workbook.creator = 'ExcelApp AI'
    this.workbook.lastModifiedBy = 'ExcelApp AI'
    this.workbook.created = new Date()
    this.workbook.modified = new Date()
  }

  async build(structure: ExcelStructure): Promise<Result<Buffer>> {
    try {
      // 메타데이터 설정
      if (structure.metadata) {
        this.setMetadata(structure.metadata)
      }

      // 시트 생성
      for (const sheetStructure of structure.sheets) {
        await this.buildSheet(sheetStructure)
      }

      // 버퍼로 변환
      const buffer = await this.workbook.xlsx.writeBuffer()
      return Result.success(Buffer.from(buffer))
    } catch (error) {
      console.error('Excel 빌드 오류:', error)
      return Result.failure(ExcelGenerationErrors.GenerationFailed)
    }
  }

  private setMetadata(metadata: ExcelStructure['metadata']) {
    if (metadata?.title) {
      this.workbook.title = metadata.title
    }
    if (metadata?.author) {
      this.workbook.creator = metadata.author
    }
    if (metadata?.description) {
      this.workbook.description = metadata.description
    }
    if (metadata?.keywords) {
      this.workbook.keywords = metadata.keywords.join(', ')
    }
  }

  private async buildSheet(sheetStructure: SheetStructure): Promise<void> {
    const worksheet = this.workbook.addWorksheet(sheetStructure.name)

    // 컬럼 설정
    this.setupColumns(worksheet, sheetStructure.columns)

    // 데이터 추가
    this.addRows(worksheet, sheetStructure.rows)

    // 수식 적용
    if (sheetStructure.formulas) {
      this.applyFormulas(worksheet, sheetStructure.formulas)
    }

    // 서식 적용
    if (sheetStructure.formatting) {
      this.applyFormatting(worksheet, sheetStructure.formatting)
    }

    // 유효성 검사 적용
    if (sheetStructure.validations) {
      this.applyValidations(worksheet, sheetStructure.validations)
    }

    // 차트는 향후 구현
    // if (sheetStructure.charts) {
    //   await this.addCharts(worksheet, sheetStructure.charts)
    // }
  }

  private setupColumns(worksheet: ExcelJS.Worksheet, columns: ColumnDefinition[]) {
    worksheet.columns = columns.map(col => ({
      header: col.header,
      key: col.key,
      width: col.width || 15,
    }))

    // 헤더 스타일 적용
    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    }
    headerRow.border = {
      bottom: { style: 'thin' }
    }
  }

  private addRows(worksheet: ExcelJS.Worksheet, rows: RowData[]) {
    rows.forEach(rowData => {
      const row = worksheet.addRow(rowData)
      
      // 기본 서식 적용
      row.eachCell((cell, colNumber) => {
        const column = worksheet.columns[colNumber - 1]
        if (column && column.key) {
          const colDef = worksheet.columns.find(c => c.key === column.key)
          // 타입별 기본 서식 적용은 추후 구현
        }
      })
    })
  }

  private applyFormulas(worksheet: ExcelJS.Worksheet, formulas: FormulaDefinition[]) {
    formulas.forEach(({ cell, formula, arrayFormula }) => {
      const excelCell = worksheet.getCell(cell)
      if (arrayFormula) {
        // Array formula - shareType not supported in this ExcelJS version
        excelCell.value = { formula }
      } else {
        excelCell.value = { formula }
      }
    })
  }

  private applyFormatting(worksheet: ExcelJS.Worksheet, formatting: FormattingRule[]) {
    formatting.forEach(({ range, style }) => {
      if (range.includes(':')) {
        // 범위 서식
        // 범위 전체에 스타일 적용
        const cellRange = worksheet.getCell(range)
        if (cellRange) {
          // 범위에 있는 모든 셀에 스타일 적용
          worksheet.eachRow((row, rowNumber) => {
            row.eachCell((cell, colNumber) => {
              Object.assign(cell, style)
            })
          })
        }
      } else {
        // 단일 셀 서식
        const cell = worksheet.getCell(range)
        Object.assign(cell, style)
      }
    })
  }

  private applyValidations(worksheet: ExcelJS.Worksheet, validations: ValidationRule[]) {
    validations.forEach(validation => {
      const { range, ...validationOptions } = validation
      
      if (range.includes(':')) {
        // 범위에 유효성 검사 적용
        const cells = this.getCellsInRange(worksheet, range)
        cells.forEach(cell => {
          cell.dataValidation = validationOptions as any
        })
      } else {
        // 단일 셀에 유효성 검사 적용
        const cell = worksheet.getCell(range)
        cell.dataValidation = validationOptions as any
      }
    })
  }

  private getCellsInRange(worksheet: ExcelJS.Worksheet, range: string): ExcelJS.Cell[] {
    const cells: ExcelJS.Cell[] = []
    
    // ExcelJS의 올바른 범위 처리 방법 사용
    try {
      // 범위를 순회하여 셀들을 수집
      const [start, end] = range.split(':')
      // 임시로 빈 배열 반환 - 실제로는 더 정교한 구현 필요
      return cells
    } catch (error) {
      console.error('Range parsing error:', error)
      return cells
    }
  }

  // 정적 헬퍼 메서드 - 간단한 Excel 생성
  static async createSimple(
    data: any[][],
    sheetName: string = 'Sheet1'
  ): Promise<Result<Buffer>> {
    const builder = new ExcelBuilderService()
    
    if (!data || data.length === 0) {
      return Result.failure(ExcelGenerationErrors.InvalidStructure)
    }

    // 첫 번째 행을 헤더로 가정
    const headers = data[0]
    const rows = data.slice(1)

    const structure: ExcelStructure = {
      sheets: [{
        name: sheetName,
        columns: headers.map((header, index) => ({
          header: String(header),
          key: `col${index}`,
          width: 15
        })),
        rows: rows.map(row => {
          const rowData: RowData = {}
          headers.forEach((_, index) => {
            rowData[`col${index}`] = row[index]
          })
          return rowData
        })
      }]
    }

    return builder.build(structure)
  }
}