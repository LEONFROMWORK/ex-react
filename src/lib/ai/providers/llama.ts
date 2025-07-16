import { AIProvider } from './base'
import { AIOptions, AIResponse, AIProviderInfo, AIProviderError } from '../types'

interface LlamaResponse {
  choices: Array<{
    message?: {
      content: string
      role: string
    }
    text?: string
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  model: string
}

export class LlamaProvider extends AIProvider {
  private modelName: string

  constructor(apiKey: string, endpoint: string, modelName: string = 'llama2-70b') {
    super(apiKey, endpoint)
    this.modelName = modelName
    
    if (!endpoint) {
      throw new Error('Endpoint is required for LLAMA provider')
    }
  }

  get name(): string {
    return 'llama'
  }

  async generateResponse(prompt: string, options: AIOptions = {}): Promise<AIResponse> {
    const startTime = Date.now()
    
    try {
      // OpenRouter uses chat completions API format
      const response = await fetch(`${this.endpoint}/api/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://exhell.app', // Required by OpenRouter
          'X-Title': 'Exhell Excel Assistant', // Optional but recommended
        },
        body: JSON.stringify({
          model: this.modelName,
          messages: [
            ...(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
            { role: 'user', content: prompt }
          ],
          max_tokens: options.maxTokens || 2000,
          temperature: options.temperature || 0.7,
          top_p: options.topP || 0.95,
          stop: options.stopSequences,
          frequency_penalty: options.frequencyPenalty,
          presence_penalty: options.presencePenalty,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: LlamaResponse = await response.json()
      const latency = Date.now() - startTime

      // OpenRouter returns chat format
      const content = data.choices[0].message?.content || data.choices[0].text || ''
      
      return {
        content: content.trim(),
        usage: {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        },
        model: this.modelName,
        provider: this.name,
        latency,
        cost: this.estimateCost(data.usage.prompt_tokens, data.usage.completion_tokens),
      }
    } catch (error) {
      throw new AIProviderError(
        `LLAMA API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.name,
        error
      )
    }
  }

  estimateCost(inputTokens: number, outputTokens: number): number {
    // OpenRouter pricing for LLAMA models (per 1K tokens)
    const costPerThousand = {
      'meta-llama/llama-2-70b-chat': { input: 0.0007, output: 0.0009 },
      'meta-llama/llama-2-13b-chat': { input: 0.0002, output: 0.0002 },
      'meta-llama/llama-2-7b-chat': { input: 0.00007, output: 0.00007 },
    }
    
    const pricing = costPerThousand[this.modelName] || { input: 0.0007, output: 0.0009 }
    
    return (inputTokens * pricing.input + outputTokens * pricing.output) / 1000
  }

  async validateConfig(): Promise<boolean> {
    try {
      // Test with a minimal request to OpenRouter
      const response = await fetch(`${this.endpoint}/api/v1/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://exhell.app',
        },
      })
      return response.ok
    } catch {
      return false
    }
  }

  getInfo(): AIProviderInfo {
    return {
      name: 'llama',
      displayName: 'LLAMA (자체 호스팅)',
      description: 'Meta의 LLAMA 모델 (자체 호스팅)',
      supportedModels: [
        'meta-llama/llama-2-7b-chat',
        'meta-llama/llama-2-13b-chat', 
        'meta-llama/llama-2-70b-chat',
        'meta-llama/codellama-34b-instruct'
      ],
      capabilities: {
        streaming: true,
        functionCalling: false,
        vision: false,
        maxContextLength: 4096,
      },
      pricing: {
        currency: 'USD',
        inputCostPer1k: 0, // 자체 호스팅
        outputCostPer1k: 0,
      },
    }
  }
}