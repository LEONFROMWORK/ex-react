import { ExcelStructure } from './ExcelBuilderService'

export interface ExcelTemplate {
  id: string
  name: string
  description: string
  category: string
  thumbnail?: string
  tags: string[]
  structure: ExcelStructure
  sampleData?: boolean
  createdAt: Date
  popularity: number
}

export const TEMPLATE_CATEGORIES = {
  FINANCE: '재무/회계',
  SALES: '영업/판매',
  HR: '인사관리',
  PROJECT: '프로젝트관리',
  INVENTORY: '재고관리',
  MARKETING: '마케팅',
  EDUCATION: '교육',
  PERSONAL: '개인',
} as const

export type TemplateCategory = typeof TEMPLATE_CATEGORIES[keyof typeof TEMPLATE_CATEGORIES]

// 기본 템플릿 정의
export const DEFAULT_TEMPLATES: ExcelTemplate[] = [
  {
    id: 'financial-report',
    name: '월간 재무 보고서',
    description: '매출, 비용, 이익을 추적하는 월간 재무 보고서 템플릿',
    category: TEMPLATE_CATEGORIES.FINANCE,
    tags: ['재무', '보고서', '월간', '손익계산서'],
    popularity: 95,
    createdAt: new Date('2024-01-01'),
    structure: {
      sheets: [{
        name: '월간 손익계산서',
        columns: [
          { header: '항목', key: 'item', width: 25 },
          { header: '1월', key: 'jan', width: 15, type: 'currency' },
          { header: '2월', key: 'feb', width: 15, type: 'currency' },
          { header: '3월', key: 'mar', width: 15, type: 'currency' },
          { header: '1분기 합계', key: 'q1_total', width: 18, type: 'currency' },
          { header: '비율', key: 'ratio', width: 12, type: 'percentage' },
        ],
        rows: [
          { item: '매출액', jan: 10000000, feb: 12000000, mar: 15000000, q1_total: 0, ratio: 0 },
          { item: '매출원가', jan: 6000000, feb: 7200000, mar: 9000000, q1_total: 0, ratio: 0 },
          { item: '매출총이익', jan: 0, feb: 0, mar: 0, q1_total: 0, ratio: 0 },
          { item: '판매관리비', jan: 2000000, feb: 2200000, mar: 2500000, q1_total: 0, ratio: 0 },
          { item: '영업이익', jan: 0, feb: 0, mar: 0, q1_total: 0, ratio: 0 },
        ],
        formulas: [
          // 매출총이익 계산
          { cell: 'B4', formula: '=B2-B3' },
          { cell: 'C4', formula: '=C2-C3' },
          { cell: 'D4', formula: '=D2-D3' },
          // 영업이익 계산
          { cell: 'B6', formula: '=B4-B5' },
          { cell: 'C6', formula: '=C4-C5' },
          { cell: 'D6', formula: '=D4-D5' },
          // 1분기 합계
          { cell: 'E2', formula: '=SUM(B2:D2)' },
          { cell: 'E3', formula: '=SUM(B3:D3)' },
          { cell: 'E4', formula: '=SUM(B4:D4)' },
          { cell: 'E5', formula: '=SUM(B5:D5)' },
          { cell: 'E6', formula: '=SUM(B6:D6)' },
          // 비율 계산
          { cell: 'F3', formula: '=E3/E2' },
          { cell: 'F4', formula: '=E4/E2' },
          { cell: 'F5', formula: '=E5/E2' },
          { cell: 'F6', formula: '=E6/E2' },
        ],
        formatting: [
          { range: 'A1:F1', style: { font: { bold: true }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } } } },
          { range: 'B2:F6', style: { numFmt: '#,##0' } },
          { range: 'F2:F6', style: { numFmt: '0.0%' } },
          { range: 'A4:F4', style: { font: { bold: true } } },
          { range: 'A6:F6', style: { font: { bold: true }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E6E6' } } } },
        ],
      }],
      metadata: {
        title: '월간 재무 보고서',
        description: '회사의 월별 재무 성과를 추적하고 분석하는 템플릿',
      },
    },
  },
  {
    id: 'sales-tracker',
    name: '영업 실적 추적기',
    description: '일별/월별 영업 실적을 추적하고 목표 대비 달성률을 관리하는 템플릿',
    category: TEMPLATE_CATEGORIES.SALES,
    tags: ['영업', '실적', '목표', '추적'],
    popularity: 88,
    createdAt: new Date('2024-01-01'),
    structure: {
      sheets: [{
        name: '영업 실적',
        columns: [
          { header: '날짜', key: 'date', width: 15, type: 'date' },
          { header: '영업사원', key: 'salesperson', width: 20 },
          { header: '고객명', key: 'customer', width: 25 },
          { header: '제품', key: 'product', width: 20 },
          { header: '수량', key: 'quantity', width: 12, type: 'number' },
          { header: '단가', key: 'price', width: 15, type: 'currency' },
          { header: '매출액', key: 'revenue', width: 18, type: 'currency' },
          { header: '목표', key: 'target', width: 18, type: 'currency' },
          { header: '달성률', key: 'achievement', width: 12, type: 'percentage' },
        ],
        rows: [],
        formulas: [
          { cell: 'G2', formula: '=E2*F2' },
        ],
        formatting: [
          { range: 'A1:I1', style: { font: { bold: true }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } } } },
        ],
        validations: [
          {
            range: 'B2:B1000',
            type: 'list',
            formulae: ['"김영업,이영업,박영업,최영업"'],
            showErrorMessage: true,
            errorTitle: '잘못된 입력',
            error: '목록에서 영업사원을 선택하세요',
          },
        ],
      }],
      metadata: {
        title: '영업 실적 추적기',
        description: '일별 영업 실적을 기록하고 목표 대비 달성률을 추적하는 템플릿',
      },
    },
  },
  {
    id: 'project-gantt',
    name: '프로젝트 간트 차트',
    description: '프로젝트 일정을 시각적으로 관리하는 간트 차트 템플릿',
    category: TEMPLATE_CATEGORIES.PROJECT,
    tags: ['프로젝트', '일정', '간트차트', '관리'],
    popularity: 82,
    createdAt: new Date('2024-01-01'),
    structure: {
      sheets: [{
        name: '프로젝트 일정',
        columns: [
          { header: '작업명', key: 'task', width: 30 },
          { header: '담당자', key: 'assignee', width: 20 },
          { header: '시작일', key: 'start_date', width: 15, type: 'date' },
          { header: '종료일', key: 'end_date', width: 15, type: 'date' },
          { header: '기간(일)', key: 'duration', width: 12, type: 'number' },
          { header: '진행률', key: 'progress', width: 12, type: 'percentage' },
          { header: '상태', key: 'status', width: 15 },
        ],
        rows: [
          { task: '요구사항 분석', assignee: '김PM', start_date: '2024-01-01', end_date: '2024-01-15', duration: 0, progress: 1.0, status: '완료' },
          { task: '설계', assignee: '이개발', start_date: '2024-01-16', end_date: '2024-01-31', duration: 0, progress: 0.8, status: '진행중' },
          { task: '개발', assignee: '박개발', start_date: '2024-02-01', end_date: '2024-03-15', duration: 0, progress: 0.3, status: '진행중' },
          { task: '테스트', assignee: 'QA팀', start_date: '2024-03-16', end_date: '2024-03-31', duration: 0, progress: 0, status: '예정' },
        ],
        formulas: [
          { cell: 'E2', formula: '=DAYS(D2,C2)+1' },
          { cell: 'E3', formula: '=DAYS(D3,C3)+1' },
          { cell: 'E4', formula: '=DAYS(D4,C4)+1' },
          { cell: 'E5', formula: '=DAYS(D5,C5)+1' },
        ],
        formatting: [
          { range: 'A1:G1', style: { font: { bold: true }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5B9BD5' } } } },
          { range: 'F2:F5', style: { numFmt: '0%' } },
        ],
        validations: [
          {
            range: 'G2:G100',
            type: 'list',
            formulae: ['"예정,진행중,완료,지연,취소"'],
            showErrorMessage: true,
            errorTitle: '잘못된 상태',
            error: '올바른 상태를 선택하세요',
          },
        ],
      }],
      metadata: {
        title: '프로젝트 간트 차트',
        description: '프로젝트 작업과 일정을 시각적으로 관리하는 템플릿',
      },
    },
  },
  {
    id: 'inventory-management',
    name: '재고 관리 대장',
    description: '제품 재고를 추적하고 재주문 시점을 관리하는 템플릿',
    category: TEMPLATE_CATEGORIES.INVENTORY,
    tags: ['재고', '물류', '관리', '창고'],
    popularity: 76,
    createdAt: new Date('2024-01-01'),
    structure: {
      sheets: [{
        name: '재고 현황',
        columns: [
          { header: '제품코드', key: 'sku', width: 15 },
          { header: '제품명', key: 'product_name', width: 30 },
          { header: '카테고리', key: 'category', width: 20 },
          { header: '현재고', key: 'current_stock', width: 12, type: 'number' },
          { header: '최소재고', key: 'min_stock', width: 12, type: 'number' },
          { header: '최대재고', key: 'max_stock', width: 12, type: 'number' },
          { header: '단가', key: 'unit_price', width: 15, type: 'currency' },
          { header: '재고금액', key: 'stock_value', width: 18, type: 'currency' },
          { header: '재주문필요', key: 'reorder_needed', width: 15 },
        ],
        rows: [],
        formulas: [
          { cell: 'H2', formula: '=D2*G2' },
          { cell: 'I2', formula: '=IF(D2<=E2,"예","아니오")' },
        ],
        formatting: [
          { range: 'A1:I1', style: { font: { bold: true }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4B084' } } } },
        ],
      }],
      metadata: {
        title: '재고 관리 대장',
        description: '제품 재고 수준을 추적하고 재주문 시점을 관리하는 템플릿',
      },
    },
  },
  {
    id: 'employee-timesheet',
    name: '근태 관리표',
    description: '직원의 출퇴근 시간과 근무 시간을 관리하는 템플릿',
    category: TEMPLATE_CATEGORIES.HR,
    tags: ['인사', '근태', '출퇴근', '급여'],
    popularity: 71,
    createdAt: new Date('2024-01-01'),
    structure: {
      sheets: [{
        name: '근태 기록',
        columns: [
          { header: '날짜', key: 'date', width: 15, type: 'date' },
          { header: '사원명', key: 'employee', width: 20 },
          { header: '출근시간', key: 'check_in', width: 15 },
          { header: '퇴근시간', key: 'check_out', width: 15 },
          { header: '휴게시간', key: 'break_time', width: 12, type: 'number' },
          { header: '근무시간', key: 'work_hours', width: 12, type: 'number' },
          { header: '초과근무', key: 'overtime', width: 12, type: 'number' },
          { header: '비고', key: 'notes', width: 25 },
        ],
        rows: [],
        formulas: [
          { cell: 'F2', formula: '=(D2-C2)*24-E2' },
          { cell: 'G2', formula: '=MAX(0,F2-8)' },
        ],
        formatting: [
          { range: 'A1:H1', style: { font: { bold: true }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } } } },
        ],
      }],
      metadata: {
        title: '근태 관리표',
        description: '직원의 출퇴근 시간과 근무 시간을 기록하고 관리하는 템플릿',
      },
    },
  },
]

export class TemplateService {
  private templates: Map<string, ExcelTemplate>

  constructor() {
    this.templates = new Map()
    DEFAULT_TEMPLATES.forEach(template => {
      this.templates.set(template.id, template)
    })
  }

  getAll(): ExcelTemplate[] {
    return Array.from(this.templates.values())
  }

  getByCategory(category: TemplateCategory): ExcelTemplate[] {
    return this.getAll().filter(t => t.category === category)
  }

  getById(id: string): ExcelTemplate | undefined {
    return this.templates.get(id)
  }

  getPopular(limit: number = 5): ExcelTemplate[] {
    return this.getAll()
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, limit)
  }

  searchByTags(tags: string[]): ExcelTemplate[] {
    return this.getAll().filter(template =>
      tags.some(tag => template.tags.includes(tag))
    )
  }

  searchByName(query: string): ExcelTemplate[] {
    const lowercaseQuery = query.toLowerCase()
    return this.getAll().filter(template =>
      template.name.toLowerCase().includes(lowercaseQuery) ||
      template.description.toLowerCase().includes(lowercaseQuery)
    )
  }
}