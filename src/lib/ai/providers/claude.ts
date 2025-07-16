import Anthropic from '@anthropic-ai/sdk'
import { AIProvider } from './base'
import { AIOptions, AIResponse, AIProviderInfo, AIProviderError } from '../types'

export class ClaudeProvider extends AIProvider {
  private client: Anthropic
  private modelName: string

  constructor(apiKey: string, modelName: string = 'claude-3-opus-20240229') {
    super(apiKey)
    this.modelName = modelName
    this.client = new Anthropic({ apiKey })
  }

  get name(): string {
    return 'claude'
  }

  async generateResponse(prompt: string, options: AIOptions = {}): Promise<AIResponse> {
    const startTime = Date.now()
    
    try {
      const messages: Anthropic.MessageParam[] = [{
        role: 'user',
        content: prompt,
      }]

      const completion = await this.client.messages.create({
        model: this.modelName,
        messages,
        system: options.systemPrompt,
        max_tokens: options.maxTokens || 2000,
        temperature: options.temperature || 0.7,
        top_p: options.topP,
        stop_sequences: options.stopSequences,
      })

      const latency = Date.now() - startTime
      const content = completion.content
        .filter(block => block.type === 'text')
        .map(block => (block as any).text)
        .join('\n')

      const usage = completion.usage

      return {
        content,
        usage: {
          promptTokens: usage.input_tokens,
          completionTokens: usage.output_tokens,
          totalTokens: usage.input_tokens + usage.output_tokens,
        },
        model: this.modelName,
        provider: this.name,
        latency,
        cost: this.estimateCost(usage.input_tokens, usage.output_tokens),
      }
    } catch (error) {
      throw new AIProviderError(
        `Claude API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
      // 간단한 메시지로 API 검증
      await this.client.messages.create({
        model: this.modelName,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 10,
      })
      return true
    } catch {
      return false
    }
  }

  getInfo(): AIProviderInfo {
    const modelPricing: Record<string, { input: number; output: number }> = {
      'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
      'claude-3-sonnet-20240229': { input: 0.003, output: 0.015 },
      'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
      'claude-2.1': { input: 0.008, output: 0.024 },
    }

    const pricing = modelPricing[this.modelName] || modelPricing['claude-3-opus-20240229']

    return {
      name: 'claude',
      displayName: 'Anthropic Claude',
      description: 'Anthropic의 Claude AI 모델',
      supportedModels: Object.keys(modelPricing),
      capabilities: {
        streaming: true,
        functionCalling: false,
        vision: this.modelName.includes('claude-3'),
        maxContextLength: this.modelName.includes('claude-3') ? 200000 : 100000,
      },
      pricing: {
        currency: 'USD',
        inputCostPer1k: pricing.input,
        outputCostPer1k: pricing.output,
      },
    }
  }
}