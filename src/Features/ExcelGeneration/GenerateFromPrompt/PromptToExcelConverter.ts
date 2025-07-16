import { Result } from '@/Common/Result'
import { ExcelGenerationErrors } from '../Common/ExcelGenerationErrors'
import { ExcelStructure, SheetStructure, ColumnDefinition } from '../Common/ExcelBuilderService'
import { container } from '@/Infrastructure/DependencyInjection/Container'
import { createAIService } from '@/lib/services/ai.service'

export interface ConversionResult {
  structure: ExcelStructure
  metadata: {
    tokensUsed: number
    model: string
    processingTime: number
  }
}

export interface ConversionOptions {
  includeFormulas?: boolean
  includeFormatting?: boolean
  includeCharts?: boolean
  maxRows?: number
  maxColumns?: number
}

export class PromptToExcelConverter {
  private aiService: any
  private promptCache: any

  constructor() {
    this.aiService = createAIService()
    // 임시 캐시 구현 (나중에 실제 캐시 서비스로 교체)
    this.promptCache = {
      getOrCreate: async (key: string, type: string, factory: () => Promise<any>) => {
        try {
          const result = await factory()
          return Result.success(result)
        } catch (error) {
          return Result.failure({ code: 'CACHE_ERROR', message: 'Cache operation failed' })
        }
      }
    }
  }

  async convert(
    prompt: string,
    options: ConversionOptions = {}
  ): Promise<Result<ConversionResult>> {
    const startTime = Date.now()

    try {
      // 1. AI에게 Excel 구조 생성 요청
      const structurePrompt = this.buildStructurePrompt(prompt, options)
      
      // 2. 캐시 확인 또는 AI 호출
      const aiResponse = await this.promptCache.getOrCreate(
        structurePrompt,
        'excel-structure',
        async () => {
          const response = await this.aiService.generateJSON(structurePrompt)
          return {
            response: response,
            confidence: 0.9,
            tokensUsed: 500,
            model: 'gpt-4',
          }
        }
      )

      if (!aiResponse.isSuccess) {
        return Result.failure(ExcelGenerationErrors.AIResponseError)
      }

      // 3. AI 응답을 Excel 구조로 변환
      const structure = this.parseAIResponse(aiResponse.value.response, options)
      
      // 4. 구조 검증
      const validationResult = this.validateStructure(structure, options)
      if (!validationResult.isSuccess) {
        return Result.failure(validationResult.error)
      }

      return Result.success({
        structure,
        metadata: {
          tokensUsed: aiResponse.value.tokensUsed,
          model: aiResponse.value.model,
          processingTime: Date.now() - startTime,
        },
      })
    } catch (error) {
      console.error('프롬프트 변환 오류:', error)
      return Result.failure(ExcelGenerationErrors.GenerationFailed)
    }
  }

  private buildStructurePrompt(prompt: string, options: ConversionOptions): string {
    const constraints = []
    
    if (options.maxRows) {
      constraints.push(`최대 ${options.maxRows}행`)
    }
    if (options.maxColumns) {
      constraints.push(`최대 ${options.maxColumns}열`)
    }
    if (!options.includeFormulas) {
      constraints.push('수식 제외')
    }
    if (!options.includeFormatting) {
      constraints.push('서식 제외')
    }

    return `
다음 요구사항에 맞는 Excel 파일 구조를 JSON 형식으로 생성해주세요:

요구사항: ${prompt}

제약사항: ${constraints.join(', ')}

응답 형식:
{
  "sheets": [{
    "name": "시트명",
    "columns": [
      {
        "header": "열 이름",
        "key": "column_key",
        "type": "text|number|date|currency|percentage|formula",
        "width": 15
      }
    ],
    "rows": [
      { "column_key": "값" }
    ],
    "formulas": [
      { "cell": "A1", "formula": "=SUM(B1:B10)" }
    ],
    "formatting": [
      { "range": "A1:A10", "style": { "font": { "bold": true } } }
    ]
  }],
  "metadata": {
    "title": "파일 제목",
    "description": "파일 설명"
  }
}

실제 비즈니스에서 사용할 수 있는 유용한 데이터를 포함해주세요.
`
  }

  private parseAIResponse(response: any, options: ConversionOptions): ExcelStructure {
    // AI 응답이 문자열인 경우 JSON 파싱
    if (typeof response === 'string') {
      try {
        response = JSON.parse(response)
      } catch (error) {
        console.error('AI 응답 파싱 실패:', error)
        // 기본 구조 반환
        return this.createDefaultStructure()
      }
    }

    // 구조 정규화
    const structure: ExcelStructure = {
      sheets: [],
      metadata: response.metadata || {},
    }

    // 시트 처리
    if (Array.isArray(response.sheets)) {
      structure.sheets = response.sheets.map((sheet: any) => 
        this.normalizeSheet(sheet, options)
      )
    } else {
      // 단일 시트 구조인 경우
      structure.sheets = [this.normalizeSheet(response, options)]
    }

    return structure
  }

  private normalizeSheet(sheetData: any, options: ConversionOptions): SheetStructure {
    const sheet: SheetStructure = {
      name: sheetData.name || 'Sheet1',
      columns: [],
      rows: [],
    }

    // 컬럼 정규화
    if (Array.isArray(sheetData.columns)) {
      sheet.columns = sheetData.columns.map((col: any, index: number) => 
        this.normalizeColumn(col, index)
      )
    }

    // 행 데이터 정규화
    if (Array.isArray(sheetData.rows)) {
      const maxRows = options.maxRows || 1000
      sheet.rows = sheetData.rows.slice(0, maxRows)
    } else if (sheetData.data) {
      // 다른 형식의 데이터 처리
      sheet.rows = this.convertDataToRows(sheetData.data, sheet.columns)
    }

    // 수식 추가
    if (options.includeFormulas && Array.isArray(sheetData.formulas)) {
      sheet.formulas = sheetData.formulas
    }

    // 서식 추가
    if (options.includeFormatting && Array.isArray(sheetData.formatting)) {
      sheet.formatting = sheetData.formatting
    }

    return sheet
  }

  private normalizeColumn(col: any, index: number): ColumnDefinition {
    if (typeof col === 'string') {
      return {
        header: col,
        key: `col${index}`,
        width: 15,
      }
    }

    return {
      header: col.header || col.name || `Column ${index + 1}`,
      key: col.key || `col${index}`,
      width: col.width || 15,
      type: col.type || 'text',
      format: col.format,
    }
  }

  private convertDataToRows(data: any, columns: ColumnDefinition[]): any[] {
    if (!Array.isArray(data)) {
      return []
    }

    return data.map(item => {
      if (Array.isArray(item)) {
        // 배열 데이터를 객체로 변환
        const row: any = {}
        columns.forEach((col, index) => {
          row[col.key] = item[index]
        })
        return row
      }
      return item
    })
  }

  private validateStructure(
    structure: ExcelStructure,
    options: ConversionOptions
  ): Result<void> {
    // 기본 검증
    if (!structure.sheets || structure.sheets.length === 0) {
      return Result.failure(ExcelGenerationErrors.InvalidStructure)
    }

    // 각 시트 검증
    for (const sheet of structure.sheets) {
      if (!sheet.columns || sheet.columns.length === 0) {
        return Result.failure(ExcelGenerationErrors.InvalidStructure)
      }

      // 컬럼 수 제한 확인
      if (options.maxColumns && sheet.columns.length > options.maxColumns) {
        return Result.failure(ExcelGenerationErrors.ComplexityExceeded)
      }

      // 행 수 제한 확인
      if (options.maxRows && sheet.rows.length > options.maxRows) {
        return Result.failure(ExcelGenerationErrors.ComplexityExceeded)
      }
    }

    return Result.success(undefined)
  }

  private createDefaultStructure(): ExcelStructure {
    return {
      sheets: [{
        name: 'Sheet1',
        columns: [
          { header: 'Column A', key: 'colA', width: 15 },
          { header: 'Column B', key: 'colB', width: 15 },
          { header: 'Column C', key: 'colC', width: 15 },
        ],
        rows: [
          { colA: 'Sample', colB: 'Data', colC: '1' },
          { colA: 'Sample', colB: 'Data', colC: '2' },
        ],
      }],
      metadata: {
        title: 'Generated Excel File',
        description: 'AI Generated Excel Structure',
      },
    }
  }
}