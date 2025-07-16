import { Result } from '@/Common/Result'
import { AIModelErrors } from '@/Common/Errors'
import { prisma } from '@/lib/prisma'

// Request and Response DTOs
export interface GetActiveModelsRequest {
  tenantId?: string
  taskType?: string
  includeInactive?: boolean
}

export interface ModelInfo {
  id: string
  provider: string
  modelName: string
  displayName: string
  maxTokens: number
  temperature: number
  costPerToken: number
  taskTypes: string[]
  priority: number
  isDefault: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface GetActiveModelsResponse {
  models: ModelInfo[]
  totalCount: number
}

// Handler
export class GetActiveModelsHandler {
  async handle(request: GetActiveModelsRequest): Promise<Result<GetActiveModelsResponse>> {
    try {
      const whereClause: any = {}

      // Filter by tenant if provided
      if (request.tenantId) {
        whereClause.tenantId = request.tenantId
      }

      // Filter by active status unless explicitly requested
      if (!request.includeInactive) {
        whereClause.isActive = true
      }

      // Filter by task type if provided
      if (request.taskType) {
        whereClause.taskTypes = {
          has: request.taskType
        }
      }

      // Fetch models
      const models = await prisma.aIModelConfig.findMany({
        where: whereClause,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ]
      })

      // Map to response DTOs
      const modelInfos: ModelInfo[] = models.map(model => ({
        id: model.id,
        provider: model.provider,
        modelName: model.modelName,
        displayName: model.displayName,
        maxTokens: model.maxTokens,
        temperature: model.temperature,
        costPerToken: model.costPerToken,
        taskTypes: model.taskTypes,
        priority: model.priority,
        isDefault: model.isDefault,
        isActive: model.isActive,
        createdAt: model.createdAt,
        updatedAt: model.updatedAt
      }))

      return Result.success<GetActiveModelsResponse>({
        models: modelInfos,
        totalCount: modelInfos.length
      })
    } catch (error) {
      console.error('Failed to get active models:', error)
      return Result.failure({
        code: 'GetActiveModels.QueryFailed',
        message: 'Failed to retrieve active models'
      })
    }
  }
}