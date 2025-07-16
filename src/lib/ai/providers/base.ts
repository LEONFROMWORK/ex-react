import { AIOptions, AIResponse, AIProviderInfo } from '../types'

export abstract class AIProvider {
  constructor(
    protected apiKey: string,
    protected endpoint?: string
  ) {}

  abstract get name(): string
  abstract generateResponse(prompt: string, options: AIOptions): Promise<AIResponse>
  abstract estimateCost(inputTokens: number, outputTokens: number): number
  abstract validateConfig(): Promise<boolean>
  abstract getInfo(): AIProviderInfo

  protected calculateCost(inputTokens: number, outputTokens: number, info: AIProviderInfo): number {
    const inputCost = (inputTokens / 1000) * info.pricing.inputCostPer1k
    const outputCost = (outputTokens / 1000) * info.pricing.outputCostPer1k
    return inputCost + outputCost
  }
}