import OpenAI from 'openai'
import { AIProvider } from './base'
import { AIOptions, AIResponse, AIProviderInfo, AIProviderError } from '../types'

export class OpenAIProvider extends AIProvider {
  private client: OpenAI
  private modelName: string

  constructor(apiKey: string, modelName: string = 'gpt-4') {
    super(apiKey)
    this.modelName = modelName
    this.client = new OpenAI({ apiKey })
  }

  get name(): string {
    return 'openai'
  }

  async generateResponse(prompt: string, options: AIOptions = {}): Promise<AIResponse> {
    const startTime = Date.now()
    
    try {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = []
      
      if (options.systemPrompt) {
        messages.push({ role: 'system', content: options.systemPrompt })
      }
      
      messages.push({ role: 'user', content: prompt })

      const completion = await this.client.chat.completions.create({
        model: this.modelName,
        messages,
        max_tokens: options.maxTokens || 2000,
        temperature: options.temperature || 0.7,
        top_p: options.topP,
        frequency_penalty: options.frequencyPenalty,
        presence_penalty: options.presencePenalty,
        stop: options.stopSequences,
      })

      const response = completion.choices[0].message
      const usage = completion.usage!
      const latency = Date.now() - startTime

      const aiResponse: AIResponse = {
        content: response.content || '',
        usage: {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
        },
        model: this.modelName,
        provider: this.name,
        latency,
        cost: this.estimateCost(usage.prompt_tokens, usage.completion_tokens),
      }

      // Function calling support
      if (response.function_call) {
        aiResponse.functionCalls = [{
          name: response.function_call.name!,
          arguments: JSON.parse(response.function_call.arguments!),
        }]
      }

      return aiResponse
    } catch (error) {
      throw new AIProviderError(
        `OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.name,
        error
      )
    }
  }

  estimateCost(inputTokens: number, outputTokens: number): number {
    const info = this.getInfo()
    return this.calculateCost(inputTokens, outputTokens, info)
  }

  async validateConfig(): Promise<boolean> {
    try {
      // 간단한 API 호출로 검증
      await this.client.models.retrieve(this.modelName)
      return true
    } catch {
      return false
    }
  }

  getInfo(): AIProviderInfo {
    const modelPricing: Record<string, { input: number; output: number }> = {
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4-turbo-preview': { input: 0.01, output: 0.03 },
      'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
      'gpt-3.5-turbo-16k': { input: 0.003, output: 0.004 },
    }

    const pricing = modelPricing[this.modelName] || modelPricing['gpt-4']

    return {
      name: 'openai',
      displayName: 'OpenAI',
      description: 'OpenAI의 GPT 모델 시리즈',
      supportedModels: ['gpt-4', 'gpt-4-turbo-preview', 'gpt-3.5-turbo', 'gpt-3.5-turbo-16k'],
      capabilities: {
        streaming: true,
        functionCalling: true,
        vision: this.modelName.includes('vision'),
        maxContextLength: this.modelName.includes('16k') ? 16384 : 
                         this.modelName.includes('gpt-4') ? 8192 : 4096,
      },
      pricing: {
        currency: 'USD',
        inputCostPer1k: pricing.input,
        outputCostPer1k: pricing.output,
      },
    }
  }
}