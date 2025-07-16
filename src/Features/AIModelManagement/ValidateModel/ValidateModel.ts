import { Result } from '@/Common/Result'
import { AIModelErrors } from '@/Common/Errors'
import { prisma } from '@/lib/prisma'
import { ApiKeyEncryptionService } from '../ConfigureModel/ConfigureModel'
import { AIProvider, OpenAIProvider, GeminiProvider, ClaudeProvider, LlamaProvider, OpenRouterProvider } from '@/lib/ai/providers'

// Request and Response DTOs
export interface ValidateModelRequest {
  modelId: string
  tenantId?: string
}

export interface ValidateModelResponse {
  modelId: string
  provider: string
  modelName: string
  isValid: boolean
  errorMessage?: string
  validatedAt: Date
}

// Provider factory service
export class ProviderFactory {
  private readonly encryptionService: ApiKeyEncryptionService

  constructor(encryptionService?: ApiKeyEncryptionService) {
    this.encryptionService = encryptionService || new ApiKeyEncryptionService()
  }

  createProvider(config: {
    provider: string
    apiKey: string | null
    endpoint: string | null
    modelName: string
  }): Result<AIProvider> {
    const apiKey = config.apiKey ? this.encryptionService.decrypt(config.apiKey) : ''

    try {
      switch (config.provider) {
        case 'openai':
          return Result.success(new OpenAIProvider(apiKey, config.modelName))
        
        case 'gemini':
          return Result.success(new GeminiProvider(apiKey, config.modelName))
        
        case 'claude':
          return Result.success(new ClaudeProvider(apiKey, config.modelName))
        
        case 'llama':
          if (!config.endpoint) {
            return Result.failure({
              code: 'ValidateModel.MissingEndpoint',
              message: 'Endpoint is required for LLAMA provider'
            })
          }
          return Result.success(new LlamaProvider(apiKey, config.endpoint, config.modelName))
        
        case 'openrouter':
          return Result.success(new OpenRouterProvider(apiKey, config.modelName))
        
        default:
          return Result.failure({
            code: 'ValidateModel.UnknownProvider',
            message: `Unknown provider: ${config.provider}`
          })
      }
    } catch (error) {
      return Result.failure({
        code: 'ValidateModel.ProviderCreationFailed',
        message: `Failed to create provider: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }
}

// Handler
export class ValidateModelHandler {
  private readonly providerFactory: ProviderFactory

  constructor(providerFactory?: ProviderFactory) {
    this.providerFactory = providerFactory || new ProviderFactory()
  }

  async handle(request: ValidateModelRequest): Promise<Result<ValidateModelResponse>> {
    try {
      // Load model configuration
      const model = await prisma.aIModelConfig.findFirst({
        where: {
          id: request.modelId,
          ...(request.tenantId && { tenantId: request.tenantId })
        }
      })

      if (!model) {
        return Result.failure(AIModelErrors.ModelNotFound)
      }

      // Create provider instance
      const providerResult = this.providerFactory.createProvider({
        provider: model.provider,
        apiKey: model.apiKey,
        endpoint: model.endpoint,
        modelName: model.modelName
      })

      if (providerResult.isFailure) {
        return Result.success<ValidateModelResponse>({
          modelId: model.id,
          provider: model.provider,
          modelName: model.modelName,
          isValid: false,
          errorMessage: providerResult.error!.message,
          validatedAt: new Date()
        })
      }

      const provider = providerResult.value!

      // Validate the provider configuration
      try {
        const isValid = await provider.validateConfig()

        // Log validation result
        await prisma.aIModelUsageLog.create({
          data: {
            modelConfigId: model.id,
            userId: 'system',
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            cost: 0,
            latency: 0,
            success: isValid,
            taskType: 'VALIDATION',
            errorMessage: isValid ? null : 'Configuration validation failed'
          }
        })

        return Result.success<ValidateModelResponse>({
          modelId: model.id,
          provider: model.provider,
          modelName: model.modelName,
          isValid,
          errorMessage: isValid ? undefined : 'Configuration validation failed',
          validatedAt: new Date()
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown validation error'
        
        // Log validation failure
        await prisma.aIModelUsageLog.create({
          data: {
            modelConfigId: model.id,
            userId: 'system',
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            cost: 0,
            latency: 0,
            success: false,
            taskType: 'VALIDATION',
            errorMessage
          }
        })

        return Result.success<ValidateModelResponse>({
          modelId: model.id,
          provider: model.provider,
          modelName: model.modelName,
          isValid: false,
          errorMessage,
          validatedAt: new Date()
        })
      }
    } catch (error) {
      console.error('Failed to validate AI model:', error)
      return Result.failure(AIModelErrors.ValidationFailed)
    }
  }
}