import { GoogleGenerativeAI } from '@google/generative-ai'
import { AIProvider } from './base'
import { AIOptions, AIResponse, AIProviderInfo, AIProviderError } from '../types'

export class GeminiProvider extends AIProvider {
  private client: GoogleGenerativeAI
  private modelName: string

  constructor(apiKey: string, modelName: string = 'gemini-pro') {
    super(apiKey)
    this.modelName = modelName
    this.client = new GoogleGenerativeAI(apiKey)
  }

  get name(): string {
    return 'gemini'
  }

  async generateResponse(prompt: string, options: AIOptions = {}): Promise<AIResponse> {
    const startTime = Date.now()
    
    try {
      const model = this.client.getGenerativeModel({ model: this.modelName })
      
      // Gemini는 시스템 프롬프트를 별도로 지원하지 않으므로 프롬프트에 포함
      const fullPrompt = options.systemPrompt 
        ? `${options.systemPrompt}\n\n${prompt}`
        : prompt

      const generationConfig = {
        temperature: options.temperature || 0.7,
        topP: options.topP || 0.95,
        maxOutputTokens: options.maxTokens || 2000,
        stopSequences: options.stopSequences,
      }

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        generationConfig,
      })

      const response = result.response
      const text = response.text()
      const latency = Date.now() - startTime

      // Gemini는 정확한 토큰 수를 제공하지 않으므로 추정
      const estimatedPromptTokens = Math.ceil(fullPrompt.length / 4)
      const estimatedCompletionTokens = Math.ceil(text.length / 4)
      const totalTokens = estimatedPromptTokens + estimatedCompletionTokens

      return {
        content: text,
        usage: {
          promptTokens: estimatedPromptTokens,
          completionTokens: estimatedCompletionTokens,
          totalTokens,
        },
        model: this.modelName,
        provider: this.name,
        latency,
        cost: this.estimateCost(estimatedPromptTokens, estimatedCompletionTokens),
      }
    } catch (error) {
      throw new AIProviderError(
        `Gemini API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
      const model = this.client.getGenerativeModel({ model: this.modelName })
      // 간단한 테스트 생성
      await model.generateContent('Hello')
      return true
    } catch {
      return false
    }
  }

  getInfo(): AIProviderInfo {
    return {
      name: 'gemini',
      displayName: 'Google Gemini',
      description: 'Google의 Gemini AI 모델',
      supportedModels: ['gemini-pro', 'gemini-pro-vision'],
      capabilities: {
        streaming: true,
        functionCalling: false, // 아직 미지원
        vision: this.modelName.includes('vision'),
        maxContextLength: 32768, // 32K context
      },
      pricing: {
        currency: 'USD',
        inputCostPer1k: 0.0005, // $0.0005 per 1k characters
        outputCostPer1k: 0.0015, // $0.0015 per 1k characters
      },
    }
  }
}