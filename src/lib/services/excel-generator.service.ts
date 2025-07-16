import ExcelJS from 'exceljs'
import { createAIService, AIService } from './ai.service'
import { z } from 'zod'

const templateSchema = z.object({
  name: z.string(),
  description: z.string(),
  sheets: z.array(z.object({
    name: z.string(),
    headers: z.array(z.string()),
    dataTypes: z.array(z.enum(['string', 'number', 'date', 'boolean', 'formula'])),
    sampleRows: z.number().min(0).default(10),
    formulas: z.array(z.object({
      column: z.number(),
      formula: z.string()
    })).optional()
  }))
})

type ExcelTemplate = z.infer<typeof templateSchema>

interface GenerationOptions {
  template?: string
  customPrompt?: string
  includeCharts?: boolean
  includeFormulas?: boolean
  includePivotTables?: boolean
  includeConditionalFormatting?: boolean
  language?: 'ko' | 'en'
}

interface GeneratedExcel {
  workbook: ExcelJS.Workbook
  metadata: {
    fileName: string
    sheets: number
    totalCells: number
    formulas: number
    charts: number
    generatedAt: Date
  }
}

export class ExcelGeneratorService {
  private aiService: AIService | null = null
  private templates: Map<string, ExcelTemplate>

  constructor() {
    // AI Service is initialized lazily when needed
    this.templates = new Map()
    this.initializeTemplates()
  }

  /**
   * Lazy initialization of AI Service
   */
  private getAIService(): AIService {
    if (!this.aiService) {
      this.aiService = createAIService()
    }
    return this.aiService
  }

  /**
   * 기본 템플릿 초기화
   */
  private initializeTemplates() {
    // 매출 보고서 템플릿
    this.templates.set('sales-report', {
      name: '매출 보고서',
      description: '월별 매출 데이터와 분석 차트',
      sheets: [{
        name: '매출데이터',
        headers: ['날짜', '제품명', '수량', '단가', '합계', '판매자'],
        dataTypes: ['date', 'string', 'number', 'number', 'formula', 'string'],
        sampleRows: 100,
        formulas: [{
          column: 4,
          formula: '=C{row}*D{row}'
        }]
      }, {
        name: '요약',
        headers: ['월', '총매출', '평균매출', '최고매출', '최저매출'],
        dataTypes: ['string', 'formula', 'formula', 'formula', 'formula'],
        sampleRows: 12
      }]
    })

    // 재고 관리 템플릿
    this.templates.set('inventory', {
      name: '재고 관리',
      description: '제품 재고 현황 및 발주 관리',
      sheets: [{
        name: '재고현황',
        headers: ['제품코드', '제품명', '현재재고', '최소재고', '최대재고', '단가', '총가치'],
        dataTypes: ['string', 'string', 'number', 'number', 'number', 'number', 'formula'],
        sampleRows: 50,
        formulas: [{
          column: 6,
          formula: '=C{row}*F{row}'
        }]
      }]
    })

    // 프로젝트 관리 템플릿
    this.templates.set('project-management', {
      name: '프로젝트 관리',
      description: 'Gantt 차트와 진행 상황 추적',
      sheets: [{
        name: '태스크',
        headers: ['태스크명', '담당자', '시작일', '종료일', '진행률(%)', '상태', '비고'],
        dataTypes: ['string', 'string', 'date', 'date', 'number', 'string', 'string'],
        sampleRows: 30
      }]
    })

    // 예산 관리 템플릿
    this.templates.set('budget', {
      name: '예산 관리',
      description: '월별 예산 계획 및 실적 비교',
      sheets: [{
        name: '예산',
        headers: ['항목', '1월', '2월', '3월', '4월', '5월', '6월', '합계'],
        dataTypes: ['string', 'number', 'number', 'number', 'number', 'number', 'number', 'formula'],
        sampleRows: 20,
        formulas: [{
          column: 7,
          formula: '=SUM(B{row}:G{row})'
        }]
      }]
    })
  }

  /**
   * AI를 통한 Excel 파일 생성
   */
  async generateExcel(options: GenerationOptions): Promise<GeneratedExcel> {
    const workbook = new ExcelJS.Workbook()
    
    // 템플릿 사용 또는 AI 생성
    if (options.template && this.templates.has(options.template)) {
      await this.generateFromTemplate(workbook, options.template, options)
    } else if (options.customPrompt) {
      await this.generateFromAI(workbook, options.customPrompt, options)
    } else {
      throw new Error('템플릿 또는 사용자 정의 프롬프트가 필요합니다')
    }

    // 메타데이터 수집
    const metadata = this.collectMetadata(workbook)
    
    return {
      workbook,
      metadata
    }
  }

  /**
   * 템플릿 기반 생성
   */
  private async generateFromTemplate(
    workbook: ExcelJS.Workbook,
    templateName: string,
    options: GenerationOptions
  ) {
    const template = this.templates.get(templateName)!
    
    for (const sheetConfig of template.sheets) {
      const worksheet = workbook.addWorksheet(sheetConfig.name)
      
      // 헤더 설정
      worksheet.addRow(sheetConfig.headers)
      const headerRow = worksheet.getRow(1)
      headerRow.font = { bold: true }
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      }
      
      // 샘플 데이터 생성
      for (let i = 0; i < sheetConfig.sampleRows; i++) {
        const rowData = await this.generateRowData(
          sheetConfig.headers,
          sheetConfig.dataTypes,
          i + 2
        )
        
        const row = worksheet.addRow(rowData)
        
        // 수식 적용
        if (sheetConfig.formulas) {
          for (const formulaConfig of sheetConfig.formulas) {
            const cell = row.getCell(formulaConfig.column + 1)
            cell.value = {
              formula: formulaConfig.formula.replace(/{row}/g, (i + 2).toString())
            }
          }
        }
      }
      
      // 컨럼 너비 자동 조정
      worksheet.columns.forEach(column => {
        column.width = 15
      })
      
      // 조건부 서식 추가
      if (options.includeConditionalFormatting) {
        this.addConditionalFormatting(worksheet, sheetConfig)
      }
      
      // 차트 추가
      if (options.includeCharts && sheetConfig.name === template.sheets[0].name) {
        this.addChart(worksheet, sheetConfig)
      }
    }
  }

  /**
   * AI를 통한 생성
   */
  private async generateFromAI(
    workbook: ExcelJS.Workbook,
    prompt: string,
    options: GenerationOptions
  ) {
    const aiPrompt = `
    다음 요구사항에 맞는 Excel 파일 구조를 생성해주세요:
    ${prompt}
    
    다음 JSON 형식으로 반환해주세요:
    {
      "sheets": [
        {
          "name": "시트명",
          "headers": ["컨럼1", "컨럼2", ...],
          "dataTypes": ["string", "number", "date", "formula", ...],
          "sampleData": [
            ["데이터1", 100, "2024-01-01", ...],
            ...
          ],
          "formulas": [
            {"column": 3, "formula": "=A{row}+B{row}"}
          ]
        }
      ]
    }
    `
    
    try {
      const aiService = this.getAIService()
      const result = await aiService.generateJSON(aiPrompt)
      const structure = result
      
      for (const sheetConfig of structure.sheets) {
        const worksheet = workbook.addWorksheet(sheetConfig.name)
        
        // 헤더 추가
        worksheet.addRow(sheetConfig.headers)
        this.formatHeader(worksheet)
        
        // 데이터 추가
        for (let i = 0; i < sheetConfig.sampleData.length; i++) {
          const row = worksheet.addRow(sheetConfig.sampleData[i])
          
          // 수식 적용
          if (sheetConfig.formulas) {
            for (const formulaConfig of sheetConfig.formulas) {
              const cell = row.getCell(formulaConfig.column + 1)
              cell.value = {
                formula: formulaConfig.formula.replace(/{row}/g, (i + 2).toString())
              }
            }
          }
        }
        
        // 컨럼 너비 자동 조정
        worksheet.columns.forEach(column => {
          column.width = 15
        })
      }
    } catch (error) {
      throw new Error(`AI 생성 실패: ${error}`)
    }
  }

  /**
   * 행 데이터 생성
   */
  private async generateRowData(
    headers: string[],
    dataTypes: string[],
    rowNumber: number
  ): Promise<any[]> {
    const data: any[] = []
    
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i]
      const dataType = dataTypes[i]
      
      switch (dataType) {
        case 'string':
          data.push(this.generateStringData(header, rowNumber))
          break
        case 'number':
          data.push(this.generateNumberData(header))
          break
        case 'date':
          data.push(this.generateDateData())
          break
        case 'boolean':
          data.push(Math.random() > 0.5)
          break
        case 'formula':
          data.push('') // 수식은 나중에 처리
          break
        default:
          data.push('')
      }
    }
    
    return data
  }

  /**
   * 문자열 데이터 생성
   */
  private generateStringData(header: string, index: number): string {
    const samples: Record<string, string[]> = {
      '제품명': ['노트북', '키보드', '마우스', '모니터', '헤드셋'],
      '고객명': ['김철수', '이영희', '박민수', '최지훈', '정수진'],
      '판매자': ['김대리', '이과장', '박주임', '최팀장', '정대리'],
      '상태': ['완료', '진행중', '대기', '취소', '보류'],
      '카테고리': ['전자제품', '가전제품', '생활용품', '식품', '의류']
    }
    
    for (const [key, values] of Object.entries(samples)) {
      if (header.includes(key)) {
        return values[index % values.length]
      }
    }
    
    return `${header}_${index}`
  }

  /**
   * 숫자 데이터 생성
   */
  private generateNumberData(header: string): number {
    if (header.includes('수량')) {
      return Math.floor(Math.random() * 100) + 1
    } else if (header.includes('가격') || header.includes('단가')) {
      return Math.floor(Math.random() * 100000) + 10000
    } else if (header.includes('매출') || header.includes('금액')) {
      return Math.floor(Math.random() * 10000000) + 100000
    } else if (header.includes('진행률') || header.includes('%')) {
      return Math.floor(Math.random() * 100)
    }
    
    return Math.floor(Math.random() * 1000)
  }

  /**
   * 날짜 데이터 생성
   */
  private generateDateData(): Date {
    const start = new Date('2024-01-01')
    const end = new Date('2024-12-31')
    const randomTime = start.getTime() + Math.random() * (end.getTime() - start.getTime())
    return new Date(randomTime)
  }

  /**
   * 헤더 서식 설정
   */
  private formatHeader(worksheet: ExcelJS.Worksheet) {
    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    }
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
    headerRow.height = 25
  }

  /**
   * 조건부 서식 추가
   */
  private addConditionalFormatting(
    worksheet: ExcelJS.Worksheet,
    sheetConfig: any
  ) {
    // 숫자 컨럼에 데이터 바 추가
    sheetConfig.headers.forEach((header: string, index: number) => {
      if (sheetConfig.dataTypes[index] === 'number') {
        const column = worksheet.getColumn(index + 1)
        
        worksheet.addConditionalFormatting({
          ref: `${column.letter}2:${column.letter}${sheetConfig.sampleRows + 1}`,
          rules: [
            {
              type: 'dataBar',
              priority: 1,
              rule: {
                color: 'FF638EC6',
                gradient: true
              }
            }
          ]
        })
      }
    })
  }

  /**
   * 차트 추가
   */
  private addChart(
    worksheet: ExcelJS.Worksheet,
    sheetConfig: any
  ) {
    // ExcelJS는 차트를 직접 지원하지 않음
    // 실제 구현에서는 다른 라이브러리 사용 필요
  }

  /**
   * 메타데이터 수집
   */
  private collectMetadata(workbook: ExcelJS.Workbook): any {
    let totalCells = 0
    let formulas = 0
    
    workbook.eachSheet(worksheet => {
      worksheet.eachRow(row => {
        row.eachCell(cell => {
          totalCells++
          if (cell.type === ExcelJS.ValueType.Formula) {
            formulas++
          }
        })
      })
    })
    
    return {
      fileName: `generated_${Date.now()}.xlsx`,
      sheets: workbook.worksheets.length,
      totalCells,
      formulas,
      charts: 0,
      generatedAt: new Date()
    }
  }

  /**
   * 템플릿 목록 반환
   */
  getTemplates() {
    return Array.from(this.templates.entries()).map(([key, template]) => ({
      key,
      name: template.name,
      description: template.description,
      sheets: template.sheets.length
    }))
  }
}