import { prisma } from "@/lib/prisma"
import { FineTuningData } from "@prisma/client"

export interface ExportOptions {
  minQualityScore?: number
  minRating?: number
  startDate?: Date
  endDate?: Date
  taskTypes?: string[]
  includeEdited?: boolean
  limit?: number
}

export interface OpenAIFineTuningFormat {
  messages: Array<{
    role: "system" | "user" | "assistant"
    content: string
    function_call?: {
      name: string
      arguments: string
    }
  }>
}

export interface AlpacaFormat {
  instruction: string
  input: string
  output: string
}

export interface VicunaFormat {
  conversations: Array<{
    from: "human" | "gpt"
    value: string
  }>
}

export type ExportFormat = 'openai' | 'alpaca' | 'llama2' | 'vicuna' | 'csv'

export class FineTuningExporter {
  /**
   * OpenAI 파인튜닝 형식으로 데이터를 내보냅니다
   */
  async exportToOpenAIFormat(options: ExportOptions = {}): Promise<string> {
    const {
      minQualityScore = 0.7,
      minRating = 4,
      startDate,
      endDate,
      taskTypes,
      includeEdited = true,
      limit = 10000
    } = options

    // 고품질 데이터 조회
    const data = await this.getQualityData({
      minQualityScore,
      minRating,
      startDate,
      endDate,
      taskTypes,
      limit
    })

    // OpenAI 형식으로 변환
    const formattedData = data.map(item => this.formatForOpenAI(item, includeEdited))
    
    // JSONL 형식으로 변환 (각 줄이 하나의 JSON 객체)
    return formattedData.map(item => JSON.stringify(item)).join('\n')
  }

  /**
   * Alpaca 형식으로 데이터를 내보냅니다 (LLAMA 파인튜닝용)
   */
  async exportToAlpacaFormat(options: ExportOptions = {}): Promise<string> {
    const data = await this.getQualityData(options)
    
    const alpacaData = data.map(item => {
      const alpacaItem: AlpacaFormat = {
        instruction: item.userQuery,
        input: item.excelContext ? JSON.stringify(item.excelContext) : "",
        output: options.includeEdited && item.editedResponse ? item.editedResponse : item.aiResponse
      }
      return alpacaItem
    })
    
    return alpacaData.map(item => JSON.stringify(item)).join('\n')
  }

  /**
   * LLAMA2-Chat 형식으로 데이터를 내보냅니다
   */
  async exportToLlama2Format(options: ExportOptions = {}): Promise<string> {
    const data = await this.getQualityData(options)
    
    const llama2Data = data.map(item => {
      const systemPrompt = item.systemPrompt || 
        "당신은 Excel 전문가 AI 어시스턴트입니다. 사용자의 Excel 관련 질문에 정확하고 도움이 되는 답변을 제공하세요."
      
      const response = options.includeEdited && item.editedResponse ? item.editedResponse : item.aiResponse
      
      // LLAMA2 특수 토큰 형식
      return `<s>[INST] <<SYS>>\n${systemPrompt}\n<</SYS>>\n\n${item.userQuery} [/INST] ${response} </s>`
    })
    
    return llama2Data.join('\n')
  }

  /**
   * Vicuna/ShareGPT 형식으로 데이터를 내보냅니다
   */
  async exportToVicunaFormat(options: ExportOptions = {}): Promise<string> {
    const data = await this.getQualityData(options)
    
    const vicunaData = data.map(item => {
      const vicunaItem: VicunaFormat = {
        conversations: [
          {
            from: "human",
            value: item.userQuery
          },
          {
            from: "gpt",
            value: options.includeEdited && item.editedResponse ? item.editedResponse : item.aiResponse
          }
        ]
      }
      
      // 시스템 프롬프트가 있으면 첫 번째로 추가
      if (item.systemPrompt) {
        vicunaItem.conversations.unshift({
          from: "gpt",
          value: `System: ${item.systemPrompt}`
        })
      }
      
      return vicunaItem
    })
    
    return vicunaData.map(item => JSON.stringify(item)).join('\n')
  }

  /**
   * 통합 내보내기 메서드
   */
  async exportData(format: ExportFormat, options: ExportOptions = {}): Promise<{
    data: string
    filename: string
    contentType: string
  }> {
    const date = new Date().toISOString().split('T')[0]
    let data: string
    let filename: string
    let contentType: string
    
    switch (format) {
      case 'openai':
        data = await this.exportToOpenAIFormat(options)
        filename = `fine-tuning-openai-${date}.jsonl`
        contentType = "application/jsonl"
        break
        
      case 'alpaca':
        data = await this.exportToAlpacaFormat(options)
        filename = `fine-tuning-alpaca-${date}.jsonl`
        contentType = "application/jsonl"
        break
        
      case 'llama2':
        data = await this.exportToLlama2Format(options)
        filename = `fine-tuning-llama2-${date}.txt`
        contentType = "text/plain"
        break
        
      case 'vicuna':
        data = await this.exportToVicunaFormat(options)
        filename = `fine-tuning-vicuna-${date}.jsonl`
        contentType = "application/jsonl"
        break
        
      case 'csv':
        data = await this.exportToCSV(options)
        filename = `fine-tuning-analysis-${date}.csv`
        contentType = "text/csv"
        break
        
      default:
        throw new Error(`Unsupported format: ${format}`)
    }
    
    return { data, filename, contentType }
  }

  /**
   * 특정 작업 유형별로 데이터를 내보냅니다
   */
  async exportByTaskType(taskType: string, format: ExportFormat = 'openai', options: ExportOptions = {}): Promise<string> {
    const exportOptions = {
      ...options,
      taskTypes: [taskType]
    }
    
    const result = await this.exportData(format, exportOptions)
    return result.data
  }

  /**
   * 데이터 통계를 생성합니다
   */
  async generateExportStats(options: ExportOptions = {}) {
    const data = await this.getQualityData(options)
    
    const stats = {
      totalRecords: data.length,
      averageQualityScore: 0,
      averageRating: 0,
      taskTypeDistribution: {} as Record<string, number>,
      editedCount: 0,
      averageTokenCount: 0,
      dateRange: {
        start: null as Date | null,
        end: null as Date | null
      }
    }

    if (data.length === 0) return stats

    // 통계 계산
    let totalQualityScore = 0
    let totalRating = 0
    let ratingCount = 0
    let totalTokens = 0

    data.forEach(item => {
      totalQualityScore += item.qualityScore || 0
      if (item.userRating) {
        totalRating += item.userRating
        ratingCount++
      }
      totalTokens += item.tokenCount

      // Task type distribution
      const taskType = item.taskType || 'GENERAL'
      stats.taskTypeDistribution[taskType] = (stats.taskTypeDistribution[taskType] || 0) + 1

      // Edited count
      if (item.wasEdited) stats.editedCount++

      // Date range
      if (!stats.dateRange.start || item.createdAt < stats.dateRange.start) {
        stats.dateRange.start = item.createdAt
      }
      if (!stats.dateRange.end || item.createdAt > stats.dateRange.end) {
        stats.dateRange.end = item.createdAt
      }
    })

    stats.averageQualityScore = totalQualityScore / data.length
    stats.averageRating = ratingCount > 0 ? totalRating / ratingCount : 0
    stats.averageTokenCount = totalTokens / data.length

    return stats
  }

  /**
   * 데이터를 CSV 형식으로 내보냅니다 (분석용)
   */
  async exportToCSV(options: ExportOptions = {}): Promise<string> {
    const data = await this.getQualityData(options)
    
    const headers = [
      'ID',
      'User Query',
      'AI Response',
      'Task Type',
      'Quality Score',
      'User Rating',
      'Was Edited',
      'Token Count',
      'Response Time (ms)',
      'Model Used',
      'Created At'
    ]

    const rows = data.map(item => [
      item.id,
      this.escapeCSV(item.userQuery),
      this.escapeCSV(item.aiResponse),
      item.taskType || 'GENERAL',
      item.qualityScore?.toString() || '',
      item.userRating?.toString() || '',
      item.wasEdited ? 'Yes' : 'No',
      item.tokenCount.toString(),
      item.responseTime.toString(),
      item.modelUsed,
      item.createdAt.toISOString()
    ])

    return [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')
  }

  /**
   * 데이터셋을 검증합니다
   */
  async validateDataset(options: ExportOptions = {}): Promise<{
    isValid: boolean
    issues: string[]
    recommendations: string[]
  }> {
    const data = await this.getQualityData(options)
    const issues: string[] = []
    const recommendations: string[] = []

    // 최소 데이터 수 확인
    if (data.length < 100) {
      issues.push(`데이터가 너무 적습니다 (${data.length}개). 최소 100개 이상 권장`)
    }

    // 작업 유형 다양성 확인
    const taskTypes = new Set(data.map(d => d.taskType || 'GENERAL'))
    if (taskTypes.size < 3) {
      recommendations.push('더 다양한 작업 유형의 데이터를 수집하세요')
    }

    // 평균 품질 점수 확인
    const avgQuality = data.reduce((sum, d) => sum + (d.qualityScore || 0), 0) / data.length
    if (avgQuality < 0.8) {
      issues.push(`평균 품질 점수가 낮습니다 (${avgQuality.toFixed(2)}). 0.8 이상 권장`)
    }

    // 토큰 분포 확인
    const tokenCounts = data.map(d => d.tokenCount)
    const avgTokens = tokenCounts.reduce((a, b) => a + b, 0) / tokenCounts.length
    if (avgTokens > 2000) {
      recommendations.push('평균 토큰 수가 높습니다. 더 간결한 응답을 수집하세요')
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations
    }
  }

  /**
   * 품질 데이터를 조회합니다
   */
  private async getQualityData(options: {
    minQualityScore?: number
    minRating?: number
    startDate?: Date
    endDate?: Date
    taskTypes?: string[]
    limit?: number
  }): Promise<FineTuningData[]> {
    const where: any = {
      errorOccurred: false
    }

    if (options.minQualityScore) {
      where.qualityScore = { gte: options.minQualityScore }
    }

    if (options.minRating) {
      where.userRating = { gte: options.minRating }
    }

    if (options.startDate || options.endDate) {
      where.createdAt = {}
      if (options.startDate) where.createdAt.gte = options.startDate
      if (options.endDate) where.createdAt.lte = options.endDate
    }

    if (options.taskTypes && options.taskTypes.length > 0) {
      where.taskType = { in: options.taskTypes }
    }

    return await prisma.fineTuningData.findMany({
      where,
      orderBy: [
        { qualityScore: 'desc' },
        { userRating: 'desc' }
      ],
      take: options.limit
    })
  }

  /**
   * 개별 데이터를 OpenAI 형식으로 변환합니다
   */
  private formatForOpenAI(data: FineTuningData, useEditedResponse: boolean): OpenAIFineTuningFormat {
    const messages: OpenAIFineTuningFormat['messages'] = []

    // System prompt
    if (data.systemPrompt) {
      messages.push({
        role: "system",
        content: data.systemPrompt
      })
    } else {
      // 기본 시스템 프롬프트
      messages.push({
        role: "system",
        content: "당신은 Excel 전문가 AI 어시스턴트입니다. 사용자의 Excel 관련 질문에 정확하고 도움이 되는 답변을 제공하세요."
      })
    }

    // User message
    messages.push({
      role: "user",
      content: data.userQuery
    })

    // Assistant response
    const assistantMessage: any = {
      role: "assistant",
      content: useEditedResponse && data.editedResponse ? data.editedResponse : data.aiResponse
    }

    // Function calls if any
    if (data.functionCalls && Array.isArray(data.functionCalls) && data.functionCalls.length > 0) {
      const firstCall = data.functionCalls[0]
      if (firstCall.name && firstCall.arguments) {
        assistantMessage.function_call = {
          name: firstCall.name,
          arguments: typeof firstCall.arguments === 'string' 
            ? firstCall.arguments 
            : JSON.stringify(firstCall.arguments)
        }
      }
    }

    messages.push(assistantMessage)

    return { messages }
  }

  /**
   * CSV 값을 이스케이프합니다
   */
  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }
}