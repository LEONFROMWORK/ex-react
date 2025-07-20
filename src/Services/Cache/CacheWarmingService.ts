import { Result } from '@/Common/Result'
import { getExcelAnalysisCacheService } from './ExcelAnalysisCacheService'
import { container } from '@/Infrastructure/DependencyInjection/Container'

interface WarmingTask {
  id: string
  type: 'excel-generation' | 'vba-extraction' | 'vba-analysis' | 'template-generation'
  data: any
  priority: number
  createdAt: Date
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error?: string
}

interface WarmingStats {
  totalTasks: number
  completedTasks: number
  failedTasks: number
  averageProcessingTime: number
  lastWarmingAt?: Date
}

export class CacheWarmingService {
  private cacheService = getExcelAnalysisCacheService()
  private isRunning = false
  private warmingQueue: WarmingTask[] = []
  private stats: WarmingStats = {
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    averageProcessingTime: 0,
  }

  // 자주 사용되는 프롬프트 목록
  private commonPrompts = [
    '월간 매출 보고서 템플릿을 만들어줘',
    '프로젝트 일정 관리 Excel을 생성해줘',
    '재무 분석 대시보드를 만들어줘',
    '재고 관리 시스템 템플릿을 생성해줘',
    '직원 출근부 Excel을 만들어줘',
    'KPI 추적 대시보드를 생성해줘',
    '예산 계획 템플릿을 만들어줘',
    '고객 관리 CRM Excel을 생성해줘',
  ]

  // 자주 사용되는 템플릿 ID
  private commonTemplates = [
    'financial-report',
    'project-timeline',
    'inventory-tracker',
    'employee-timesheet',
    'budget-planner',
    'sales-dashboard',
    'kpi-tracker',
    'customer-database',
  ]

  // 캐시 워밍 시작
  async startWarming(): Promise<Result<void>> {
    if (this.isRunning) {
      return Result.failure({
        code: 'CACHE_WARMING.ALREADY_RUNNING',
        message: '캐시 워밍이 이미 실행 중입니다',
      })
    }

    this.isRunning = true
    console.log('캐시 워밍 시작')

    try {
      // 워밍 작업 큐 생성
      this.createWarmingTasks()

      // 작업 실행
      await this.processWarmingQueue()

      this.stats.lastWarmingAt = new Date()
      console.log('캐시 워밍 완료:', this.stats)

      return Result.success(undefined)
    } catch (error) {
      console.error('캐시 워밍 오류:', error)
      return Result.failure({
        code: 'CACHE_WARMING.FAILED',
        message: '캐시 워밍 중 오류가 발생했습니다',
      })
    } finally {
      this.isRunning = false
    }
  }

  // 워밍 작업 생성
  private createWarmingTasks(): void {
    // Excel 생성 프롬프트 워밍
    this.commonPrompts.forEach((prompt, index) => {
      this.warmingQueue.push({
        id: `excel-gen-${index}`,
        type: 'excel-generation',
        data: { prompt },
        priority: 1,
        createdAt: new Date(),
        status: 'pending',
      })
    })

    // 템플릿 생성 워밍
    this.commonTemplates.forEach((templateId, index) => {
      this.warmingQueue.push({
        id: `template-gen-${index}`,
        type: 'template-generation',
        data: { templateId, sampleData: this.getSampleDataForTemplate(templateId) },
        priority: 2,
        createdAt: new Date(),
        status: 'pending',
      })
    })

    // 우선순위별 정렬
    this.warmingQueue.sort((a, b) => a.priority - b.priority)
    this.stats.totalTasks = this.warmingQueue.length
  }

  // 워밍 큐 처리
  private async processWarmingQueue(): Promise<void> {
    const batchSize = 3 // 동시 처리 개수
    const processingTimes: number[] = []

    while (this.warmingQueue.length > 0) {
      const batch = this.warmingQueue
        .filter(task => task.status === 'pending')
        .slice(0, batchSize)

      if (batch.length === 0) break

      const startTime = Date.now()
      
      await Promise.all(
        batch.map(async (task) => {
          try {
            task.status = 'processing'
            await this.processWarmingTask(task)
            task.status = 'completed'
            this.stats.completedTasks++
          } catch (error) {
            console.error(`워밍 작업 실패 (${task.id}):`, error)
            task.status = 'failed'
            task.error = error instanceof Error ? error.message : '알 수 없는 오류'
            this.stats.failedTasks++
          }
        })
      )

      const endTime = Date.now()
      processingTimes.push(endTime - startTime)

      // 완료된 작업 제거
      this.warmingQueue = this.warmingQueue.filter(
        task => task.status === 'pending' || task.status === 'processing'
      )
    }

    // 평균 처리 시간 계산
    if (processingTimes.length > 0) {
      this.stats.averageProcessingTime = 
        processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
    }
  }

  // 개별 워밍 작업 처리
  private async processWarmingTask(task: WarmingTask): Promise<void> {
    switch (task.type) {
      case 'excel-generation':
        await this.warmExcelGeneration(task.data.prompt)
        break
      
      case 'template-generation':
        await this.warmTemplateGeneration(task.data.templateId, task.data.sampleData)
        break
      
      case 'vba-extraction':
        // VBA 추출은 파일이 필요하므로 스킵
        break
      
      case 'vba-analysis':
        // VBA 분석은 실제 모듈이 필요하므로 스킵
        break
    }
  }

  // Excel 생성 워밍
  private async warmExcelGeneration(prompt: string): Promise<void> {
    try {
      // 캐시에 이미 있는지 확인
      const cached = await this.cacheService.getExcelGeneration(prompt)
      if (cached.isSuccess && cached.value) {
        console.log(`캐시 히트 (Excel 생성): "${prompt.substring(0, 30)}..."`)
        return
      }

      // 실제 생성 로직 호출 (Handler 사용)
      const { GenerateFromPromptHandler } = await import(
        '@/Features/ExcelGeneration/GenerateFromPrompt/GenerateFromPrompt'
      )
      
      const handler = new GenerateFromPromptHandler()
      const result = await handler.handle({
        prompt,
        userId: 'system-warming',
        options: {
          includeFormulas: true,
          includeFormatting: true,
          includeCharts: false,
          maxRows: 100,
          maxColumns: 20,
        },
      })

      if (result.isSuccess) {
        console.log(`캐시 워밍 성공 (Excel 생성): "${prompt.substring(0, 30)}..."`)
      }
    } catch (error) {
      console.error('Excel 생성 워밍 오류:', error)
      throw error
    }
  }

  // 템플릿 생성 워밍
  private async warmTemplateGeneration(templateId: string, data: any): Promise<void> {
    try {
      // 캐시에 이미 있는지 확인
      const cached = await this.cacheService.getTemplateGeneration(templateId, data)
      if (cached.isSuccess && cached.value) {
        console.log(`캐시 히트 (템플릿 생성): ${templateId}`)
        return
      }

      // 실제 생성 로직 호출 (Handler 사용)
      const { GenerateFromTemplateHandler } = await import(
        '@/Features/ExcelGeneration/GenerateFromTemplate/GenerateFromTemplate'
      )
      
      const handler = new GenerateFromTemplateHandler()
      const result = await handler.handle({
        templateId,
        data,
        userId: 'system-warming',
        options: {
          includeFormulas: true,
          applyFormatting: true,
        },
      })

      if (result.isSuccess) {
        console.log(`캐시 워밍 성공 (템플릿 생성): ${templateId}`)
      }
    } catch (error) {
      console.error('템플릿 생성 워밍 오류:', error)
      throw error
    }
  }

  // 템플릿별 샘플 데이터 생성
  private getSampleDataForTemplate(templateId: string): any {
    const sampleData: Record<string, any> = {
      'financial-report': {
        year: new Date().getFullYear(),
        months: ['1월', '2월', '3월'],
        revenue: [1000000, 1200000, 1100000],
        expenses: [800000, 900000, 850000],
      },
      'project-timeline': {
        projectName: '샘플 프로젝트',
        tasks: [
          { name: '기획', startDate: '2024-01-01', endDate: '2024-01-15' },
          { name: '개발', startDate: '2024-01-16', endDate: '2024-02-28' },
        ],
      },
      'inventory-tracker': {
        items: [
          { name: '상품 A', quantity: 100, price: 10000 },
          { name: '상품 B', quantity: 50, price: 20000 },
        ],
      },
      'employee-timesheet': {
        employeeName: '홍길동',
        department: '개발팀',
        dates: ['2024-01-01', '2024-01-02'],
        hours: [8, 8],
      },
      'budget-planner': {
        categories: ['인건비', '운영비', '마케팅'],
        planned: [5000000, 2000000, 1000000],
        actual: [4800000, 2100000, 900000],
      },
      'sales-dashboard': {
        products: ['제품 A', '제품 B'],
        salesData: [
          { month: '1월', productA: 100, productB: 80 },
          { month: '2월', productA: 120, productB: 90 },
        ],
      },
      'kpi-tracker': {
        metrics: [
          { name: '매출', target: 10000000, actual: 9500000 },
          { name: '고객만족도', target: 90, actual: 88 },
        ],
      },
      'customer-database': {
        customers: [
          { name: '회사 A', contact: '010-1234-5678', email: 'a@company.com' },
          { name: '회사 B', contact: '010-9876-5432', email: 'b@company.com' },
        ],
      },
    }

    return sampleData[templateId] || {}
  }

  // 워밍 상태 조회
  getWarmingStatus(): {
    isRunning: boolean
    stats: WarmingStats
    pendingTasks: number
  } {
    return {
      isRunning: this.isRunning,
      stats: { ...this.stats },
      pendingTasks: this.warmingQueue.filter(t => t.status === 'pending').length,
    }
  }

  // 통계 초기화
  resetStats(): void {
    this.stats = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      averageProcessingTime: 0,
    }
  }
}

// Singleton 인스턴스
let warmingInstance: CacheWarmingService | null = null

export function getCacheWarmingService(): CacheWarmingService {
  if (!warmingInstance) {
    warmingInstance = new CacheWarmingService()
  }
  return warmingInstance
}