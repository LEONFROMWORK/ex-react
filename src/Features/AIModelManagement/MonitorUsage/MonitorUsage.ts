import { Result } from '@/Common/Result'
import { prisma } from '@/lib/prisma'
import { AIResponse } from '@/lib/ai/types'

// Request and Response DTOs
export interface LogUsageRequest {
  modelConfigId: string
  userId: string
  taskType: string
  response: AIResponse
  note?: string
  tenantId?: string
}

export interface LogUsageResponse {
  logId: string
  totalCost: number
}

export interface GetUsageStatsRequest {
  modelConfigId?: string
  userId?: string
  startDate?: Date
  endDate?: Date
  tenantId?: string
}

export interface ModelUsageStats {
  modelConfigId: string
  modelName: string
  provider: string
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  totalTokens: number
  totalCost: number
  averageLatency: number
  latencySum?: number
}

export interface GetUsageStatsResponse {
  stats: ModelUsageStats[]
  totalCost: number
  totalRequests: number
}

// Usage monitoring service
export class UsageMonitor {
  async logUsage(request: LogUsageRequest): Promise<Result<LogUsageResponse>> {
    try {
      const log = await prisma.aIModelUsageLog.create({
        data: {
          modelConfigId: request.modelConfigId,
          userId: request.userId,
          promptTokens: request.response.usage.promptTokens,
          completionTokens: request.response.usage.completionTokens,
          totalTokens: request.response.usage.totalTokens,
          cost: request.response.cost,
          latency: request.response.latency,
          success: true,
          taskType: request.taskType,
          errorMessage: request.note
        }
      })

      return Result.success<LogUsageResponse>({
        logId: log.id,
        totalCost: log.cost
      })
    } catch (error) {
      console.error('Failed to log AI usage:', error)
      return Result.failure({
        code: 'MonitorUsage.LogFailed',
        message: 'Failed to log AI model usage'
      })
    }
  }

  async logFailure(request: {
    modelConfigId: string
    userId: string
    taskType: string
    errorMessage: string
    tenantId?: string
  }): Promise<Result<void>> {
    try {
      await prisma.aIModelUsageLog.create({
        data: {
          modelConfigId: request.modelConfigId,
          userId: request.userId,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          cost: 0,
          latency: 0,
          success: false,
          taskType: request.taskType,
          errorMessage: request.errorMessage
        }
      })

      return Result.success(undefined)
    } catch (error) {
      console.error('Failed to log AI failure:', error)
      return Result.failure({
        code: 'MonitorUsage.LogFailed',
        message: 'Failed to log AI model failure'
      })
    }
  }

  async getUsageStats(request: GetUsageStatsRequest): Promise<Result<GetUsageStatsResponse>> {
    try {
      const whereClause: any = {}

      if (request.modelConfigId) {
        whereClause.modelConfigId = request.modelConfigId
      }

      if (request.userId) {
        whereClause.userId = request.userId
      }

      if (request.tenantId) {
        whereClause.tenantId = request.tenantId
      }

      if (request.startDate || request.endDate) {
        whereClause.createdAt = {}
        if (request.startDate) {
          whereClause.createdAt.gte = request.startDate
        }
        if (request.endDate) {
          whereClause.createdAt.lte = request.endDate
        }
      }

      // Get usage logs with model info
      const logs = await prisma.aIModelUsageLog.findMany({
        where: whereClause,
        include: {
          modelConfig: {
            select: {
              id: true,
              modelName: true,
              provider: true,
              displayName: true
            }
          }
        }
      })

      // Aggregate stats by model
      const statsMap = new Map<string, ModelUsageStats>()

      for (const log of logs) {
        const key = log.modelConfigId
        const existing = statsMap.get(key) || {
          modelConfigId: log.modelConfigId,
          modelName: log.modelConfig.modelName,
          provider: log.modelConfig.provider,
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          totalTokens: 0,
          totalCost: 0,
          averageLatency: 0,
          latencySum: 0
        }

        existing.totalRequests++
        if (log.success) {
          existing.successfulRequests++
        } else {
          existing.failedRequests++
        }
        existing.totalTokens += log.totalTokens
        existing.totalCost += log.cost
        existing.latencySum = (existing.latencySum || 0) + log.latency

        statsMap.set(key, existing)
      }

      // Calculate averages
      const stats = Array.from(statsMap.values()).map(stat => ({
        ...stat,
        averageLatency: stat.totalRequests > 0 ? stat.latencySum! / stat.totalRequests : 0,
        latencySum: undefined // Remove internal field
      }))

      // Calculate totals
      const totalCost = stats.reduce((sum, stat) => sum + stat.totalCost, 0)
      const totalRequests = stats.reduce((sum, stat) => sum + stat.totalRequests, 0)

      return Result.success<GetUsageStatsResponse>({
        stats,
        totalCost,
        totalRequests
      })
    } catch (error) {
      console.error('Failed to get usage stats:', error)
      return Result.failure({
        code: 'MonitorUsage.QueryFailed',
        message: 'Failed to retrieve usage statistics'
      })
    }
  }
}

// Handlers
export class LogUsageHandler {
  private readonly usageMonitor: UsageMonitor

  constructor(usageMonitor?: UsageMonitor) {
    this.usageMonitor = usageMonitor || new UsageMonitor()
  }

  async handle(request: LogUsageRequest): Promise<Result<LogUsageResponse>> {
    return this.usageMonitor.logUsage(request)
  }
}

export class GetUsageStatsHandler {
  private readonly usageMonitor: UsageMonitor

  constructor(usageMonitor?: UsageMonitor) {
    this.usageMonitor = usageMonitor || new UsageMonitor()
  }

  async handle(request: GetUsageStatsRequest): Promise<Result<GetUsageStatsResponse>> {
    return this.usageMonitor.getUsageStats(request)
  }
}