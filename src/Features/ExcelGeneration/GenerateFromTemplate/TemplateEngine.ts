import { Result } from '@/Common/Result'
import { ExcelGenerationErrors } from '../Common/ExcelGenerationErrors'
import { ExcelStructure, SheetStructure, RowData } from '../Common/ExcelBuilderService'
import { ExcelTemplate } from '../Common/ExcelTemplates'

export interface TemplateProcessingOptions {
  fillSampleData?: boolean
  applyFormatting?: boolean
  includeFormulas?: boolean
  customization?: {
    companyName?: string
    logoUrl?: string
    primaryColor?: string
  }
}

export class TemplateEngine {
  async process(
    template: ExcelTemplate,
    data: Record<string, any>,
    options?: TemplateProcessingOptions
  ): Promise<Result<ExcelStructure>> {
    try {
      // 템플릿 구조 복사 (deep clone)
      const structure = this.deepClone(template.structure)

      // 메타데이터 처리
      structure.metadata = this.processMetadata(
        structure.metadata || {},
        options?.customization
      )

      // 각 시트 처리
      for (let i = 0; i < structure.sheets.length; i++) {
        structure.sheets[i] = await this.processSheet(
          structure.sheets[i],
          data,
          options
        )
      }

      return Result.success(structure)
    } catch (error) {
      console.error('템플릿 처리 오류:', error)
      return Result.failure(ExcelGenerationErrors.TemplateProcessingError)
    }
  }

  private processMetadata(
    metadata: any,
    customization?: TemplateProcessingOptions['customization']
  ): any {
    const processed = { ...metadata }

    if (customization?.companyName) {
      processed.company = customization.companyName
      if (processed.title) {
        processed.title = `${customization.companyName} - ${processed.title}`
      }
    }

    processed.createdBy = 'ExcelApp Template Engine'
    processed.createdAt = new Date().toISOString()

    return processed
  }

  private async processSheet(
    sheet: SheetStructure,
    data: Record<string, any>,
    options?: TemplateProcessingOptions
  ): Promise<SheetStructure> {
    // 시트 이름에 변수 치환
    sheet.name = this.replaceVariables(sheet.name, data)

    // 데이터 처리
    if (data[sheet.name] && Array.isArray(data[sheet.name])) {
      // 시트별 데이터가 제공된 경우
      sheet.rows = this.processRowData(data[sheet.name], sheet.columns)
    } else if (options?.fillSampleData && sheet.rows.length === 0) {
      // 샘플 데이터 생성
      sheet.rows = this.generateSampleData(sheet.columns, 10)
    } else if (sheet.rows.length > 0) {
      // 기존 행 데이터의 변수 치환
      sheet.rows = sheet.rows.map(row => 
        this.processRowVariables(row, data)
      )
    }

    // 수식 처리
    if (options?.includeFormulas !== false && sheet.formulas) {
      sheet.formulas = this.processFormulas(sheet.formulas, sheet.rows.length)
    } else {
      delete sheet.formulas
    }

    // 서식 처리
    if (options?.applyFormatting === false) {
      delete sheet.formatting
    } else if (sheet.formatting && options?.customization?.primaryColor) {
      sheet.formatting = this.customizeFormatting(
        sheet.formatting,
        options.customization.primaryColor
      )
    }

    // 유효성 검사 처리
    if (sheet.validations) {
      sheet.validations = this.processValidations(sheet.validations, data)
    }

    return sheet
  }

  private replaceVariables(text: string, data: Record<string, any>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || match
    })
  }

  private processRowData(
    inputData: any[],
    columns: any[]
  ): RowData[] {
    return inputData.map(item => {
      const row: RowData = {}
      
      columns.forEach(col => {
        if (item[col.key] !== undefined) {
          row[col.key] = item[col.key]
        } else if (item[col.header] !== undefined) {
          row[col.key] = item[col.header]
        } else {
          row[col.key] = ''
        }
      })

      return row
    })
  }

  private processRowVariables(
    row: RowData,
    data: Record<string, any>
  ): RowData {
    const processed: RowData = {}
    
    Object.entries(row).forEach(([key, value]) => {
      if (typeof value === 'string') {
        processed[key] = this.replaceVariables(value, data)
      } else {
        processed[key] = value
      }
    })

    return processed
  }

  private generateSampleData(columns: any[], rowCount: number): RowData[] {
    const rows: RowData[] = []
    
    for (let i = 0; i < rowCount; i++) {
      const row: RowData = {}
      
      columns.forEach(col => {
        row[col.key] = this.generateSampleValue(col.type || 'text', i)
      })
      
      rows.push(row)
    }

    return rows
  }

  private generateSampleValue(type: string, index: number): any {
    switch (type) {
      case 'number':
        return Math.floor(Math.random() * 1000) + index
      case 'currency':
        return (Math.random() * 10000 + 1000).toFixed(2)
      case 'percentage':
        return Math.random()
      case 'date':
        const date = new Date()
        date.setDate(date.getDate() + index)
        return date.toISOString().split('T')[0]
      case 'text':
      default:
        return `Sample ${index + 1}`
    }
  }

  private processFormulas(
    formulas: any[],
    rowCount: number
  ): any[] {
    return formulas.map(formula => {
      if (formula.cell && formula.cell.includes('{{ROW}}')) {
        // 동적 수식 생성 (각 행에 대해)
        const expandedFormulas = []
        for (let row = 2; row <= rowCount + 1; row++) {
          expandedFormulas.push({
            ...formula,
            cell: formula.cell.replace('{{ROW}}', row.toString()),
            formula: formula.formula.replace(/{{ROW}}/g, row.toString()),
          })
        }
        return expandedFormulas
      }
      return formula
    }).flat()
  }

  private customizeFormatting(
    formatting: any[],
    primaryColor: string
  ): any[] {
    // 색상 코드 변환 (예: #FF0000 -> FFFF0000)
    const argbColor = 'FF' + primaryColor.replace('#', '').toUpperCase()

    return formatting.map(format => {
      if (format.style?.fill?.fgColor?.argb) {
        // 헤더 색상 커스터마이징
        return {
          ...format,
          style: {
            ...format.style,
            fill: {
              ...format.style.fill,
              fgColor: { argb: argbColor }
            }
          }
        }
      }
      return format
    })
  }

  private processValidations(
    validations: any[],
    data: Record<string, any>
  ): any[] {
    return validations.map(validation => {
      if (validation.formulae && Array.isArray(validation.formulae)) {
        // 유효성 검사 목록에 변수 치환
        validation.formulae = validation.formulae.map((formula: string) =>
          this.replaceVariables(formula, data)
        )
      }
      return validation
    })
  }

  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj))
  }

  // 템플릿 병합 기능 (고급)
  async mergeTemplates(
    baseTemplate: ExcelTemplate,
    additionalTemplates: ExcelTemplate[],
    mergeOptions: {
      sheetNaming?: 'prefix' | 'suffix' | 'replace'
      conflictResolution?: 'skip' | 'override' | 'rename'
    } = {}
  ): Promise<Result<ExcelStructure>> {
    try {
      const mergedStructure: ExcelStructure = this.deepClone(baseTemplate.structure)

      for (const template of additionalTemplates) {
        const sheets = this.deepClone(template.structure.sheets)
        
        sheets.forEach(sheet => {
          const existingIndex = mergedStructure.sheets.findIndex(
            s => s.name === sheet.name
          )

          if (existingIndex >= 0) {
            // 이름 충돌 처리
            switch (mergeOptions.conflictResolution) {
              case 'skip':
                return
              case 'override':
                mergedStructure.sheets[existingIndex] = sheet
                break
              case 'rename':
              default:
                sheet.name = `${sheet.name}_${Date.now()}`
                mergedStructure.sheets.push(sheet)
            }
          } else {
            mergedStructure.sheets.push(sheet)
          }
        })
      }

      return Result.success(mergedStructure)
    } catch (error) {
      console.error('템플릿 병합 오류:', error)
      return Result.failure(ExcelGenerationErrors.TemplateProcessingError)
    }
  }
}