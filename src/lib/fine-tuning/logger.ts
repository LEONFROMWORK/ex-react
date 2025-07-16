import { prisma } from "@/lib/prisma"
import { FineTuningData } from "@prisma/client"

export interface FineTuningLogData {
  userId: string
  sessionId?: string
  userQuery: string
  systemPrompt?: string
  aiResponse: string
  functionCalls?: any[]
  responseTime: number
  tokenCount: number
  modelUsed?: string
  excelContext?: any
  taskType?: string
}

export class FineTuningLogger {
  /**
   * AI 상호작용을 로깅합니다
   */
  async logInteraction(data: FineTuningLogData): Promise<FineTuningData> {
    try {
      // 품질 점수 자동 계산
      const qualityScore = this.calculateQualityScore(data)
      
      // 데이터 저장
      const logEntry = await prisma.fineTuningData.create({
        data: {
          userId: data.userId,
          sessionId: data.sessionId,
          userQuery: data.userQuery,
          systemPrompt: data.systemPrompt,
          aiResponse: data.aiResponse,
          functionCalls: data.functionCalls || undefined,
          responseTime: data.responseTime,
          tokenCount: data.tokenCount,
          modelUsed: data.modelUsed || process.env.DEFAULT_AI_MODEL || 'gpt-4',
          excelContext: data.excelContext || undefined,
          taskType: data.taskType,
          qualityScore,
          errorOccurred: false
        }
      })
      
      return logEntry
    } catch (error) {
      console.error('Failed to log fine-tuning data:', error)
      throw error
    }
  }

  /**
   * 사용자 피드백을 업데이트합니다
   */
  async updateFeedback(
    id: string,
    feedback: {
      userRating?: number
      isHelpful?: boolean
      editedResponse?: string
      wasEdited?: boolean
    }
  ): Promise<void> {
    await prisma.fineTuningData.update({
      where: { id },
      data: {
        ...feedback,
        // 피드백이 있으면 품질 점수 재계산
        qualityScore: feedback.userRating ? 
          await this.recalculateQualityScore(id, feedback.userRating) : 
          undefined
      }
    })
  }

  /**
   * ChatMessage에 피드백을 추가합니다
   */
  async updateChatMessageFeedback(
    messageId: string,
    feedback: {
      userRating?: number
      wasHelpful?: boolean
      feedbackText?: string
      correctedResponse?: string
    }
  ): Promise<void> {
    await prisma.chatMessage.update({
      where: { id: messageId },
      data: feedback
    })
  }

  /**
   * 품질 점수를 계산합니다
   */
  private calculateQualityScore(data: FineTuningLogData): number {
    let score = 0
    
    // 1. 쿼리 품질 (0.2)
    if (data.userQuery.length >= 20 && data.userQuery.length <= 500) {
      score += 0.2
    } else if (data.userQuery.length > 10) {
      score += 0.1
    }
    
    // 2. 응답 품질 (0.2)
    if (data.aiResponse.length >= 50 && data.aiResponse.length <= 2000) {
      score += 0.2
    } else if (data.aiResponse.length > 20) {
      score += 0.1
    }
    
    // 3. Function Call 사용 (0.3) - 구조화된 응답
    if (data.functionCalls && data.functionCalls.length > 0) {
      score += 0.3
    }
    
    // 4. 응답 시간 (0.1)
    if (data.responseTime < 3000) {
      score += 0.1
    } else if (data.responseTime < 5000) {
      score += 0.05
    }
    
    // 5. 토큰 효율성 (0.1)
    if (data.tokenCount < 1000) {
      score += 0.1
    } else if (data.tokenCount < 2000) {
      score += 0.05
    }
    
    // 6. Excel 컨텍스트 존재 (0.1)
    if (data.excelContext) {
      score += 0.1
    }
    
    return Math.min(score, 1.0) // 최대 1.0
  }

  /**
   * 사용자 피드백 기반으로 품질 점수를 재계산합니다
   */
  private async recalculateQualityScore(
    id: string,
    userRating: number
  ): Promise<number> {
    const data = await prisma.fineTuningData.findUnique({
      where: { id }
    })
    
    if (!data) return 0
    
    // 기존 점수와 사용자 평점을 가중 평균
    const baseScore = data.qualityScore || 0
    const ratingScore = userRating / 5
    
    // 사용자 평점을 40% 반영
    return baseScore * 0.6 + ratingScore * 0.4
  }

  /**
   * 고품질 데이터를 조회합니다
   */
  async getHighQualityData(options: {
    minScore?: number
    minRating?: number
    limit?: number
    taskType?: string
  } = {}) {
    const { 
      minScore = 0.7, 
      minRating = 4, 
      limit = 1000,
      taskType 
    } = options
    
    return await prisma.fineTuningData.findMany({
      where: {
        qualityScore: { gte: minScore },
        userRating: { gte: minRating },
        taskType: taskType || undefined,
        errorOccurred: false
      },
      orderBy: {
        qualityScore: 'desc'
      },
      take: limit
    })
  }

  /**
   * 특정 사용자의 기여도를 계산합니다
   */
  async getUserContribution(userId: string) {
    const [totalCount, highQualityCount, avgRating] = await Promise.all([
      prisma.fineTuningData.count({
        where: { userId }
      }),
      prisma.fineTuningData.count({
        where: {
          userId,
          qualityScore: { gte: 0.7 }
        }
      }),
      prisma.fineTuningData.aggregate({
        where: {
          userId,
          userRating: { not: null }
        },
        _avg: {
          userRating: true
        }
      })
    ])
    
    return {
      totalContributions: totalCount,
      highQualityContributions: highQualityCount,
      averageRating: avgRating._avg.userRating || 0
    }
  }
}