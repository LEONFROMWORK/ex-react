import { prisma } from '@/lib/prisma'
import { 
  AIProvider, 
  OpenAIProvider, 
  GeminiProvider, 
  ClaudeProvider, 
  LlamaProvider,
  OpenRouterProvider 
} from './providers'
import { 
  ModelSelectionCriteria, 
  AIOptions, 
  AIResponse, 
  AIProviderError 
} from './types'
import { AIModelConfig, AIModelPolicy } from '@prisma/client'
import crypto from 'crypto'

export class AIModelManager {
  private providers: Map<string, AIProvider> = new Map()
  private activeConfigs: AIModelConfig[] = []
  private activePolicy: AIModelPolicy | null = null
  private routingConfig: any = null
  private failureCount: Map<string, number> = new Map()
  private static instance: AIModelManager | null = null

  private constructor() {}

  static getInstance(): AIModelManager {
    if (!AIModelManager.instance) {
      AIModelManager.instance = new AIModelManager()
    }
    return AIModelManager.instance
  }

  async initialize(): Promise<void> {
    // 활성 모델 설정 로드
    this.activeConfigs = await prisma.aIModelConfig.findMany({
      where: { isActive: true },
      orderBy: { priority: 'desc' }
    })

    // 활성 정책 로드
    this.activePolicy = await prisma.aIModelPolicy.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    })

    // 라우팅 설정 로드
    const routingPolicy = await prisma.aIModelPolicy.findFirst({
      where: { name: 'routing-config', isActive: true }
    })
    if (routingPolicy) {
      this.routingConfig = routingPolicy.rules
    }

    // Provider 인스턴스 생성
    for (const config of this.activeConfigs) {
      try {
        const provider = await this.createProvider(config)
        if (provider) {
          this.providers.set(config.id, provider)
        }
      } catch (error) {
        console.error(`Failed to create provider for ${config.displayName}:`, error)
      }
    }
  }

  private async createProvider(config: AIModelConfig): Promise<AIProvider | null> {
    const apiKey = config.apiKey ? this.decryptApiKey(config.apiKey) : ''
    
    switch (config.provider) {
      case 'openai':
        return new OpenAIProvider(apiKey, config.modelName)
      
      case 'gemini':
        return new GeminiProvider(apiKey, config.modelName)
      
      case 'claude':
        return new ClaudeProvider(apiKey, config.modelName)
      
      case 'llama':
        if (!config.endpoint) {
          throw new Error('Endpoint is required for LLAMA provider')
        }
        return new LlamaProvider(apiKey, config.endpoint, config.modelName)
      
      case 'openrouter':
        return new OpenRouterProvider(apiKey, config.modelName)
      
      default:
        console.warn(`Unknown provider: ${config.provider}`)
        return null
    }
  }

  async selectModel(criteria: ModelSelectionCriteria): Promise<{
    provider: AIProvider
    config: AIModelConfig
  }> {
    if (this.providers.size === 0) {
      throw new Error('No AI models configured')
    }

    // 수동 선택 모드 - If user has a specific preference
    if (criteria.userPreference) {
      const config = this.activeConfigs.find(c => 
        c.id === criteria.userPreference ||
        c.provider === criteria.userPreference || 
        c.modelName === criteria.userPreference
      )
      
      if (config && this.providers.has(config.id)) {
        return {
          provider: this.providers.get(config.id)!,
          config
        }
      }
    }

    // 라우팅 설정 적용
    const routingConfig = this.routingConfig || {}
    
    // 블랙리스트 필터링
    const blacklistedModels = routingConfig.blacklistedModels || []
    
    // 자동 선택 모드 - Intelligent automatic selection
    let eligibleConfigs = this.activeConfigs.filter(config => {
      // 블랙리스트 체크
      if (blacklistedModels.includes(config.modelName)) {
        return false
      }
      
      // 작업 유형 확인
      if (config.taskTypes.length > 0 && !config.taskTypes.includes(criteria.taskType)) {
        return false
      }

      // 복잡도 확인 - Match complexity level
      if (criteria.complexity === 'COMPLEX') {
        // For complex tasks, prefer more capable models
        if (config.maxTokens < 2000) return false
      } else if (criteria.complexity === 'SIMPLE') {
        // For simple tasks, any model is fine
      }

      // 비용 한도 확인
      const costThreshold = routingConfig.costThreshold || criteria.costLimit
      if (costThreshold && config.costPerToken > costThreshold) {
        return false
      }

      // Provider가 활성화되어 있는지 확인
      return this.providers.has(config.id)
    })

    if (eligibleConfigs.length === 0) {
      // 폴백: 기본 모델 사용
      const defaultConfig = this.activeConfigs.find(c => c.isDefault)
      if (defaultConfig && this.providers.has(defaultConfig.id)) {
        return {
          provider: this.providers.get(defaultConfig.id)!,
          config: defaultConfig
        }
      }
      
      throw new Error('No suitable AI model found')
    }

    // 비용 최적화 적용
    if (routingConfig.enableCostOptimization) {
      eligibleConfigs.sort((a, b) => a.costPerToken - b.costPerToken)
    }
    
    // 프로바이더 우선순위 적용
    if (routingConfig.providerPriority) {
      const providerOrder = routingConfig.providerPriority
      eligibleConfigs.sort((a, b) => {
        const aIndex = providerOrder.indexOf(a.provider)
        const bIndex = providerOrder.indexOf(b.provider)
        if (aIndex === -1) return 1
        if (bIndex === -1) return -1
        return aIndex - bIndex
      })
    } else {
      // Default: Sort by priority and cost-effectiveness
      eligibleConfigs.sort((a, b) => {
        // First sort by priority (higher is better)
        if (a.priority !== b.priority) {
          return b.priority - a.priority
        }
        // Then by cost (lower is better)
        return a.costPerToken - b.costPerToken
      })
    }

    // Select the best model
    const selectedConfig = sortedConfigs[0]
    return {
      provider: this.providers.get(selectedConfig.id)!,
      config: selectedConfig
    }
  }

  async chat(
    prompt: string, 
    criteria: ModelSelectionCriteria,
    options: AIOptions = {}
  ): Promise<AIResponse & { configId: string }> {
    // Add transforms for Claude models to enable prompt caching
    const enhancedOptions = { ...options }
    
    const { provider, config } = await this.selectModel(criteria)
    
    // Add prompt caching transforms for Claude models
    if (config.provider === 'claude' || (config.provider === 'openrouter' && config.modelName.includes('claude'))) {
      enhancedOptions.transforms = ['cache_control']
    }
    
    try {
      const response = await provider.generateResponse(prompt, {
        ...enhancedOptions,
        maxTokens: enhancedOptions.maxTokens || config.maxTokens,
        temperature: enhancedOptions.temperature || config.temperature,
      })

      // 사용 로그 기록
      await this.logUsage(config.id, criteria.taskType || 'GENERAL', response)

      return {
        ...response,
        configId: config.id
      }
    } catch (error) {
      console.error(`Primary model ${config.provider}/${config.modelName} failed:`, error)
      
      // Implement automatic fallback chain
      const fallbackChain = this.getFallbackChain(config)
      
      for (const fallbackConfig of fallbackChain) {
        if (this.providers.has(fallbackConfig.id)) {
          try {
            console.log(`Attempting fallback to ${fallbackConfig.provider}/${fallbackConfig.modelName}`)
            
            const fallbackProviderInstance = this.providers.get(fallbackConfig.id)!
            const response = await fallbackProviderInstance.generateResponse(prompt, enhancedOptions)
            
            await this.logUsage(
              fallbackConfig.id, 
              criteria.taskType || 'GENERAL', 
              response,
              `Fallback from ${config.provider}/${config.modelName}`
            )
            
            return {
              ...response,
              configId: fallbackConfig.id
            }
          } catch (fallbackError) {
            console.error(`Fallback to ${fallbackConfig.provider}/${fallbackConfig.modelName} failed:`, fallbackError)
          }
        }
      }
      
      throw new Error(`All models failed. Original error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private getFallbackChain(failedConfig: AIModelConfig): AIModelConfig[] {
    // 라우팅 설정에 따른 폴백
    if (!this.routingConfig?.enableFallback) {
      return []
    }
    
    const fallbackStrategy = this.routingConfig.fallbackStrategy || 'same-provider'
    const maxRetries = this.routingConfig.maxRetries || 3
    
    let fallbackCandidates: AIModelConfig[] = []
    
    // Get configs sorted by priority
    const availableConfigs = this.activeConfigs.filter(c => 
      c.id !== failedConfig.id && c.isActive && this.providers.has(c.id)
    )
    
    switch (fallbackStrategy) {
      case 'same-provider':
        // 같은 프로바이더의 다른 모델
        fallbackCandidates = availableConfigs.filter(c => c.provider === failedConfig.provider)
        break
        
      case 'similar-capability':
        // 비슷한 기능의 모델
        fallbackCandidates = availableConfigs.filter(c => {
          // 같은 작업 유형 지원
          const sameTaskType = c.taskTypes.some(t => failedConfig.taskTypes.includes(t))
          // 비슷한 컨텍스트 크기
          const similarContext = Math.abs(c.maxTokens - failedConfig.maxTokens) < 1000
          
          return sameTaskType || similarContext
        })
        break
        
      case 'any-available':
        // 모든 사용 가능한 모델
        fallbackCandidates = availableConfigs
        break
    }
    
    // 우선순위에 따라 정렬
    if (this.routingConfig.providerPriority) {
      const providerOrder = this.routingConfig.providerPriority
      fallbackCandidates.sort((a, b) => {
        const aIndex = providerOrder.indexOf(a.provider)
        const bIndex = providerOrder.indexOf(b.provider)
        if (aIndex === -1) return 1
        if (bIndex === -1) return -1
        return aIndex - bIndex
      })
    }
    
    // Limit to maxRetries
    return fallbackCandidates.slice(0, maxRetries - 1)
  }

  private async logUsage(
    modelConfigId: string,
    taskType: string,
    response: AIResponse,
    note?: string
  ): Promise<void> {
    try {
      await prisma.aIModelUsageLog.create({
        data: {
          modelConfigId,
          userId: 'system', // TODO: 실제 사용자 ID 전달
          promptTokens: response.usage.promptTokens,
          completionTokens: response.usage.completionTokens,
          totalTokens: response.usage.totalTokens,
          cost: response.cost,
          latency: response.latency,
          success: true,
          taskType,
          errorMessage: note,
        }
      })
    } catch (error) {
      console.error('Failed to log AI usage:', error)
    }
  }

  async validateAllConfigs(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>()
    
    for (const [configId, provider] of this.providers) {
      try {
        const isValid = await provider.validateConfig()
        results.set(configId, isValid)
      } catch {
        results.set(configId, false)
      }
    }
    
    return results
  }

  // API 키 암호화/복호화 (실제 구현에서는 더 안전한 방법 사용)
  private encryptApiKey(apiKey: string): string {
    const algorithm = 'aes-256-cbc'
    const key = Buffer.from(process.env.ENCRYPTION_KEY || 'default-encryption-key-32-chars!!', 'utf-8')
    const iv = crypto.randomBytes(16)
    
    const cipher = crypto.createCipheriv(algorithm, key, iv)
    let encrypted = cipher.update(apiKey, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    return iv.toString('hex') + ':' + encrypted
  }

  private decryptApiKey(encryptedApiKey: string): string {
    try {
      const algorithm = 'aes-256-cbc'
      const key = Buffer.from(process.env.ENCRYPTION_KEY || 'default-encryption-key-32-chars!!', 'utf-8')
      
      const parts = encryptedApiKey.split(':')
      const iv = Buffer.from(parts[0], 'hex')
      const encrypted = parts[1]
      
      const decipher = crypto.createDecipheriv(algorithm, key, iv)
      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      
      return decrypted
    } catch {
      // 암호화되지 않은 키일 수 있음 (개발 환경)
      return encryptedApiKey
    }
  }

  // 외부에서 사용할 수 있는 유틸리티 메서드
  static encryptApiKey(apiKey: string): string {
    const instance = AIModelManager.getInstance()
    return instance.encryptApiKey(apiKey)
  }

  getActiveModels(): AIModelConfig[] {
    return this.activeConfigs
  }

  getActivePolicy(): AIModelPolicy | null {
    return this.activePolicy
  }

  private incrementFailureCount(modelId: string): void {
    const current = this.failureCount.get(modelId) || 0
    this.failureCount.set(modelId, current + 1)
    
    // 모니터링 알림 체크
    if (this.routingConfig?.monitoring?.alertOnFailure) {
      const threshold = this.routingConfig.monitoring.alertThreshold || 5
      if (current + 1 >= threshold) {
        console.error(`Model ${modelId} has failed ${current + 1} times consecutively`)
        // TODO: Send actual alert to admin
      }
    }
  }

  resetFailureCount(modelId: string): void {
    this.failureCount.delete(modelId)
  }
}