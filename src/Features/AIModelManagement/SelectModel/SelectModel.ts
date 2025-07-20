import { Result } from '@/Common/Result'
import { AIModelErrors } from '@/Common/Errors'
import { prisma } from '@/lib/prisma'
import { AIModelConfig, AIModelPolicy } from '@prisma/client'

// Request and Response DTOs
export interface SelectModelRequest {
  taskType: string
  complexity?: 'SIMPLE' | 'MEDIUM' | 'COMPLEX'
  userPreference?: string // Model ID, provider, or model name
  costLimit?: number
  tenantId?: string
}

export interface SelectModelResponse {
  modelId: string
  provider: string
  modelName: string
  displayName: string
  maxTokens: number
  temperature: number
  costPerCredit: number
  endpoint?: string | null
}

// Model selection criteria
interface RoutingConfig {
  enableFallback?: boolean
  fallbackStrategy?: 'same-provider' | 'similar-capability' | 'any-available'
  maxRetries?: number
  blacklistedModels?: string[]
  costThreshold?: number
  enableCostOptimization?: boolean
  providerPriority?: string[]
}

// Model selector service
export class ModelSelector {
  async selectBestModel(
    models: AIModelConfig[],
    criteria: SelectModelRequest,
    routingConfig: RoutingConfig
  ): Promise<Result<AIModelConfig>> {
    if (models.length === 0) {
      return Result.failure(AIModelErrors.NoModelsConfigured)
    }

    // Manual selection mode - user preference takes priority
    if (criteria.userPreference) {
      const preferredModel = models.find(m => 
        m.id === criteria.userPreference ||
        m.provider === criteria.userPreference ||
        m.modelName === criteria.userPreference
      )
      
      if (preferredModel) {
        return Result.success(preferredModel)
      }
    }

    // Filter eligible models
    let eligibleModels = models.filter(model => {
      // Check blacklist
      if (routingConfig.blacklistedModels?.includes(model.modelName)) {
        return false
      }

      // Check task type compatibility
      if (model.taskTypes.length > 0 && !model.taskTypes.includes(criteria.taskType)) {
        return false
      }

      // Check complexity requirements
      if (criteria.complexity === 'COMPLEX' && model.maxTokens < 2000) {
        return false
      }

      // Check cost limit
      const costThreshold = routingConfig.costThreshold || criteria.costLimit
      if (costThreshold && (model as any).costPerCredit && (model as any).costPerCredit > costThreshold) {
        return false
      }

      return true
    })

    if (eligibleModels.length === 0) {
      // Try to find default model as fallback
      const defaultModel = models.find(m => m.isDefault)
      if (defaultModel) {
        return Result.success(defaultModel)
      }
      
      return Result.failure(AIModelErrors.ModelNotFound)
    }

    // Apply sorting based on configuration
    if (routingConfig.enableCostOptimization) {
      // Sort by cost (ascending)
      eligibleModels.sort((a, b) => ((a as any).costPerCredit || 0) - ((b as any).costPerCredit || 0))
    } else if (routingConfig.providerPriority) {
      // Sort by provider priority
      const providerOrder = routingConfig.providerPriority
      eligibleModels.sort((a, b) => {
        const aIndex = providerOrder.indexOf(a.provider)
        const bIndex = providerOrder.indexOf(b.provider)
        if (aIndex === -1) return 1
        if (bIndex === -1) return -1
        return aIndex - bIndex
      })
    } else {
      // Default: Sort by priority and cost
      eligibleModels.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority
        }
        return ((a as any).costPerCredit || 0) - ((b as any).costPerCredit || 0)
      })
    }

    return Result.success(eligibleModels[0])
  }

  getFallbackChain(
    failedModel: AIModelConfig,
    availableModels: AIModelConfig[],
    routingConfig: RoutingConfig
  ): AIModelConfig[] {
    if (!routingConfig.enableFallback) {
      return []
    }

    const maxRetries = routingConfig.maxRetries || 3
    const strategy = routingConfig.fallbackStrategy || 'same-provider'
    
    let candidates = availableModels.filter(m => m.id !== failedModel.id && m.isActive)

    switch (strategy) {
      case 'same-provider':
        candidates = candidates.filter(m => m.provider === failedModel.provider)
        break
        
      case 'similar-capability':
        candidates = candidates.filter(m => {
          const sameTaskType = m.taskTypes.some(t => failedModel.taskTypes.includes(t))
          const similarContext = Math.abs(m.maxTokens - failedModel.maxTokens) < 1000
          return sameTaskType || similarContext
        })
        break
        
      case 'any-available':
        // All candidates are eligible
        break
    }

    // Apply provider priority if configured
    if (routingConfig.providerPriority) {
      const providerOrder = routingConfig.providerPriority
      candidates.sort((a, b) => {
        const aIndex = providerOrder.indexOf(a.provider)
        const bIndex = providerOrder.indexOf(b.provider)
        if (aIndex === -1) return 1
        if (bIndex === -1) return -1
        return aIndex - bIndex
      })
    }

    return candidates.slice(0, maxRetries - 1)
  }
}

// Handler
export class SelectModelHandler {
  private readonly modelSelector: ModelSelector

  constructor(modelSelector?: ModelSelector) {
    this.modelSelector = modelSelector || new ModelSelector()
  }

  async handle(request: SelectModelRequest): Promise<Result<SelectModelResponse>> {
    try {
      // Load active models
      const activeModels = await prisma.aIModelConfig.findMany({
        where: {
          isActive: true,
          ...(request.tenantId && { tenantId: request.tenantId })
        },
        orderBy: { priority: 'desc' }
      })

      if (activeModels.length === 0) {
        return Result.failure(AIModelErrors.NoModelsConfigured)
      }

      // Load routing configuration
      const routingPolicy = await prisma.aIModelPolicy.findFirst({
        where: {
          name: 'routing-config',
          isActive: true
        }
      })

      const routingConfig: RoutingConfig = (routingPolicy?.rules as RoutingConfig) || {}

      // Select best model
      const selectionResult = await this.modelSelector.selectBestModel(
        activeModels,
        request,
        routingConfig
      )

      if (selectionResult.isFailure) {
        return Result.failure(selectionResult.error!)
      }

      const selectedModel = selectionResult.value!

      return Result.success<SelectModelResponse>({
        modelId: selectedModel.id,
        provider: selectedModel.provider,
        modelName: selectedModel.modelName,
        displayName: selectedModel.displayName,
        maxTokens: selectedModel.maxTokens,
        temperature: selectedModel.temperature,
        costPerCredit: (selectedModel as any).costPerCredit || (selectedModel as any).costPerToken || 0,
        endpoint: selectedModel.endpoint
      })
    } catch (error) {
      console.error('Failed to select AI model:', error)
      return Result.failure(AIModelErrors.ModelNotFound)
    }
  }
}