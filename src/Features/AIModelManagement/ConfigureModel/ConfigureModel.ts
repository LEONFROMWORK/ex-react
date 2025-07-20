import { Result } from '@/Common/Result'
import { AIModelErrors } from '@/Common/Errors'
import { prisma } from '@/lib/prisma'
import { AIModelConfig } from '@prisma/client'
import crypto from 'crypto'

// Request and Response DTOs
export interface ConfigureModelRequest {
  provider: string
  modelName: string
  apiKey?: string
  endpoint?: string
  displayName: string
  maxTokens: number
  temperature: number
  costPerToken: number
  costPerCredit?: number
  taskTypes: string[]
  priority: number
  isDefault?: boolean
  isActive?: boolean
  tenantId?: string
}

export interface ConfigureModelResponse {
  id: string
  provider: string
  modelName: string
  displayName: string
  isActive: boolean
  createdAt: Date
}

// Validator
export class ConfigureModelValidator {
  validate(request: ConfigureModelRequest): Result<ConfigureModelRequest> {
    const errors: string[] = []

    if (!request.provider) {
      errors.push('Provider is required')
    }

    if (!request.modelName) {
      errors.push('Model name is required')
    }

    if (!request.displayName) {
      errors.push('Display name is required')
    }

    if (request.maxTokens <= 0) {
      errors.push('Max tokens must be greater than 0')
    }

    if (request.temperature < 0 || request.temperature > 2) {
      errors.push('Temperature must be between 0 and 2')
    }

    if (request.costPerCredit && request.costPerCredit < 0) {
      errors.push('Cost per credit must be non-negative')
    }

    // Provider-specific validation
    if (request.provider === 'llama' && !request.endpoint) {
      errors.push('Endpoint is required for LLAMA provider')
    }

    if (request.provider !== 'llama' && !request.apiKey) {
      errors.push('API key is required for non-LLAMA providers')
    }

    if (errors.length > 0) {
      return Result.failure({
        code: 'ConfigureModel.ValidationFailed',
        message: errors.join(', ')
      })
    }

    return Result.success(request)
  }
}

// Encryption service (extracted from original code)
export class ApiKeyEncryptionService {
  private readonly algorithm = 'aes-256-cbc'
  private readonly encryptionKey: Buffer

  constructor() {
    const key = process.env.ENCRYPTION_KEY || 'default-encryption-key-32-chars!!'
    this.encryptionKey = Buffer.from(key.padEnd(32, '!').slice(0, 32), 'utf-8')
  }

  encrypt(apiKey: string): string {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv)
    
    let encrypted = cipher.update(apiKey, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    return iv.toString('hex') + ':' + encrypted
  }

  decrypt(encryptedApiKey: string): string {
    try {
      const parts = encryptedApiKey.split(':')
      if (parts.length !== 2) {
        // Not encrypted, return as is (for development)
        return encryptedApiKey
      }

      const iv = Buffer.from(parts[0], 'hex')
      const encrypted = parts[1]
      
      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv)
      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      
      return decrypted
    } catch {
      // Assume it's not encrypted
      return encryptedApiKey
    }
  }
}

// Handler
export class ConfigureModelHandler {
  private readonly validator: ConfigureModelValidator
  private readonly encryptionService: ApiKeyEncryptionService

  constructor(
    validator?: ConfigureModelValidator,
    encryptionService?: ApiKeyEncryptionService
  ) {
    this.validator = validator || new ConfigureModelValidator()
    this.encryptionService = encryptionService || new ApiKeyEncryptionService()
  }

  async handle(request: ConfigureModelRequest): Promise<Result<ConfigureModelResponse>> {
    // Validate request
    const validationResult = this.validator.validate(request)
    if (validationResult.isFailure) {
      return Result.failure(validationResult.error!)
    }

    try {
      // Check if model already exists
      const existingModel = await prisma.aIModelConfig.findFirst({
        where: {
          provider: request.provider,
          modelName: request.modelName,
          ...(request.tenantId && { tenantId: request.tenantId })
        }
      })

      let model: AIModelConfig

      if (existingModel) {
        // Update existing model
        model = await prisma.aIModelConfig.update({
          where: { id: existingModel.id },
          data: {
            apiKey: request.apiKey ? this.encryptionService.encrypt(request.apiKey) : existingModel.apiKey,
            endpoint: request.endpoint,
            displayName: request.displayName,
            maxTokens: request.maxTokens,
            temperature: request.temperature,
            costPerCredit: request.costPerCredit || existingModel.costPerCredit || 0,
            taskTypes: request.taskTypes,
            priority: request.priority,
            isDefault: request.isDefault ?? existingModel.isDefault,
            isActive: request.isActive ?? existingModel.isActive,
            updatedAt: new Date()
          }
        })
      } else {
        // Create new model
        model = await prisma.aIModelConfig.create({
          data: {
            provider: request.provider,
            modelName: request.modelName,
            apiKey: request.apiKey ? this.encryptionService.encrypt(request.apiKey) : null,
            endpoint: request.endpoint,
            displayName: request.displayName,
            maxTokens: request.maxTokens,
            temperature: request.temperature,
            costPerCredit: request.costPerCredit || 0,
            taskTypes: request.taskTypes,
            priority: request.priority,
            isDefault: request.isDefault ?? false,
            isActive: request.isActive ?? true,
            tenantId: request.tenantId
          }
        })
      }

      // If this is set as default, unset other defaults
      if (request.isDefault) {
        await prisma.aIModelConfig.updateMany({
          where: {
            id: { not: model.id },
            ...(request.tenantId && { tenantId: request.tenantId })
          },
          data: { isDefault: false }
        })
      }

      return Result.success<ConfigureModelResponse>({
        id: model.id,
        provider: model.provider,
        modelName: model.modelName,
        displayName: model.displayName,
        isActive: model.isActive,
        createdAt: model.createdAt
      })
    } catch (error) {
      console.error('Failed to configure AI model:', error)
      return Result.failure(AIModelErrors.InvalidConfiguration)
    }
  }
}