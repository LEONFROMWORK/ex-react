import { Anthropic } from '@anthropic-ai/sdk'
import OpenAI from 'openai'

export interface AIServiceConfig {
  provider: 'openai' | 'anthropic'
  apiKey: string
  model?: string
}

export interface AIResponse {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export class AIService {
  private provider: 'openai' | 'anthropic'
  private openai?: OpenAI
  private anthropic?: Anthropic
  private model: string

  constructor(config: AIServiceConfig) {
    this.provider = config.provider
    this.model = config.model || this.getDefaultModel()

    if (config.provider === 'openai') {
      this.openai = new OpenAI({
        apiKey: config.apiKey || process.env.OPENAI_API_KEY,
      })
    } else if (config.provider === 'anthropic') {
      this.anthropic = new Anthropic({
        apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY || '',
      })
    }
  }

  private getDefaultModel(): string {
    return this.provider === 'openai' ? 'gpt-4' : 'claude-3-sonnet-20240229'
  }

  async generateCompletion(prompt: string, systemPrompt?: string): Promise<AIResponse> {
    if (this.provider === 'openai' && this.openai) {
      return this.generateOpenAICompletion(prompt, systemPrompt)
    } else if (this.provider === 'anthropic' && this.anthropic) {
      return this.generateAnthropicCompletion(prompt, systemPrompt)
    }
    
    throw new Error(`AI provider ${this.provider} not configured`)
  }

  private async generateOpenAICompletion(prompt: string, systemPrompt?: string): Promise<AIResponse> {
    if (!this.openai) throw new Error('OpenAI client not initialized')

    const messages: any[] = []
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }
    messages.push({ role: 'user', content: prompt })

    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages,
      temperature: 0.7,
      max_tokens: 4000,
    })

    const choice = response.choices[0]
    if (!choice.message?.content) {
      throw new Error('No content in OpenAI response')
    }

    return {
      content: choice.message.content,
      usage: response.usage ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      } : undefined,
    }
  }

  private async generateAnthropicCompletion(prompt: string, systemPrompt?: string): Promise<AIResponse> {
    if (!this.anthropic) throw new Error('Anthropic client not initialized')

    const response = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: 4000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    if (response.content[0].type !== 'text') {
      throw new Error('Unexpected response type from Anthropic')
    }

    return {
      content: response.content[0].text,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
    }
  }

  async generateJSON<T>(prompt: string, systemPrompt?: string): Promise<T> {
    const jsonSystemPrompt = `${systemPrompt || ''}\n\nYou must respond with valid JSON only. Do not include any markdown formatting or code blocks.`
    
    const response = await this.generateCompletion(prompt, jsonSystemPrompt)
    
    try {
      // Remove any potential markdown code blocks
      const jsonStr = response.content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
      
      return JSON.parse(jsonStr)
    } catch (error) {
      console.error('Failed to parse AI response as JSON:', response.content)
      throw new Error('AI did not return valid JSON')
    }
  }
}

// Mock AI Service for testing
export class MockAIService extends AIService {
  async generateCompletion(prompt: string, systemPrompt?: string): Promise<AIResponse> {
    // 간단한 Mock 응답 생성
    return {
      content: JSON.stringify({
        sheets: [{
          name: "Sheet1",
          columns: [
            { header: "월", key: "month", type: "text", width: 15 },
            { header: "제품A", key: "productA", type: "currency", width: 20 },
            { header: "제품B", key: "productB", type: "currency", width: 20 },
            { header: "제품C", key: "productC", type: "currency", width: 20 },
            { header: "합계", key: "total", type: "currency", width: 20 },
            { header: "성장률", key: "growth", type: "percentage", width: 15 }
          ],
          rows: [
            { month: "1월", productA: 1000000, productB: 800000, productC: 1200000, total: 3000000, growth: 0 },
            { month: "2월", productA: 1100000, productB: 850000, productC: 1300000, total: 3250000, growth: 0.083 },
            { month: "3월", productA: 1200000, productB: 900000, productC: 1400000, total: 3500000, growth: 0.077 }
          ],
          formulas: [
            { cell: "E2", formula: "=SUM(B2:D2)" },
            { cell: "F3", formula: "=(E3-E2)/E2" }
          ],
          formatting: [
            { range: "A1:F1", style: { font: { bold: true }, fill: { color: "#f0f0f0" } } }
          ]
        }],
        metadata: {
          title: "2024년 월간 매출 데이터",
          description: "제품별 매출액과 성장률 분석"
        }
      }),
      usage: {
        promptTokens: 100,
        completionTokens: 200,
        totalTokens: 300
      }
    }
  }

  async generateJSON<T>(prompt: string, systemPrompt?: string): Promise<T> {
    const response = await this.generateCompletion(prompt, systemPrompt)
    return JSON.parse(response.content) as T
  }
}

// Factory function for creating AI service instances
export function createAIService(provider?: 'openai' | 'anthropic'): AIService {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    // In browser, always use mock service for now
    return new MockAIService({
      provider: 'openai',
      apiKey: 'mock-key'
    })
  }

  // Server-side only
  // Mock 모드 확인
  if (process.env.USE_MOCK_AI === 'true') {
    return new MockAIService({
      provider: 'openai',
      apiKey: 'mock-key'
    })
  }

  const selectedProvider = provider || (process.env.ANTHROPIC_API_KEY ? 'anthropic' : 'openai')
  
  return new AIService({
    provider: selectedProvider,
    apiKey: selectedProvider === 'openai' 
      ? process.env.OPENAI_API_KEY || ''
      : process.env.ANTHROPIC_API_KEY || '',
  })
}