export interface AIOptions {
  maxTokens?: number
  temperature?: number
  systemPrompt?: string
  stopSequences?: string[]
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  tools?: Array<{
    type: 'function'
    function: {
      name: string
      description: string
      parameters: any
    }
  }>
  toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } }
  transforms?: string[] // For prompt caching with Claude models
}

export interface AIResponse {
  content: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  model: string
  provider: string
  latency: number
  cost: number
  functionCalls?: Array<{
    name: string
    arguments: any
  }>
}

export interface AIProviderInfo {
  name: string
  displayName: string
  description: string
  supportedModels: string[]
  capabilities: {
    streaming: boolean
    functionCalling: boolean
    vision: boolean
    maxContextLength: number
  }
  pricing: {
    currency: string
    inputCostPer1k: number
    outputCostPer1k: number
  }
}

export interface ModelSelectionCriteria {
  taskType: string // CREATE, CORRECT, ANALYZE, etc.
  complexity: 'SIMPLE' | 'MEDIUM' | 'COMPLEX' | string
  userPreference?: string
  costLimit?: number
  requiredCapabilities?: string[]
}

export class AIProviderError extends Error {
  constructor(
    message: string,
    public provider: string,
    public originalError?: any
  ) {
    super(message)
    this.name = 'AIProviderError'
  }
}