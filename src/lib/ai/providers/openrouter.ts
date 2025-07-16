import { AIProvider } from './base'
import { AIOptions, AIResponse, AIProviderInfo, AIProviderError } from '../types'

interface OpenRouterResponse {
  id: string
  choices: Array<{
    message: {
      role: string
      content: string
      tool_calls?: Array<{
        id: string
        type: 'function'
        function: {
          name: string
          arguments: string
        }
      }>
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  model: string
}

export class OpenRouterProvider extends AIProvider {
  private modelName: string

  constructor(apiKey: string, modelName: string = 'meta-llama/llama-2-70b-chat') {
    super(apiKey, 'https://openrouter.ai')
    this.modelName = modelName
  }

  get name(): string {
    return 'openrouter'
  }

  async generateResponse(prompt: string, options: AIOptions = {}): Promise<AIResponse> {
    const startTime = Date.now()
    
    try {
      const requestBody: any = {
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
      }

      // Add tool calling support for compatible models
      if (options.tools && this.supportsTools()) {
        requestBody.tools = options.tools
        requestBody.tool_choice = options.toolChoice || 'auto'
      }

      // Add transforms for prompt caching (Claude models)
      if (this.modelName.includes('claude') && options.transforms) {
        requestBody.transforms = options.transforms
      }

      const response = await fetch(`${this.endpoint}/api/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://exhell.app',
          'X-Title': 'Exhell Excel Assistant',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`OpenRouter API error: ${response.status} - ${error}`)
      }

      const data: OpenRouterResponse = await response.json()
      const latency = Date.now() - startTime

      const result: AIResponse = {
        content: data.choices[0].message.content.trim(),
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

      // Include tool calls if present
      if (data.choices[0].message.tool_calls) {
        result.functionCalls = data.choices[0].message.tool_calls.map(call => ({
          name: call.function.name,
          arguments: JSON.parse(call.function.arguments)
        }))
      }

      return result
    } catch (error) {
      throw new AIProviderError(
        `OpenRouter API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.name,
        error
      )
    }
  }

  estimateCost(inputTokens: number, outputTokens: number): number {
    // OpenRouter pricing varies by model
    // These are approximate costs per 1K tokens
    const modelPricing: Record<string, { input: number; output: number }> = {
      // LLAMA models
      'meta-llama/llama-2-70b-chat': { input: 0.0007, output: 0.0009 },
      'meta-llama/llama-2-13b-chat': { input: 0.0002, output: 0.0002 },
      'meta-llama/llama-2-7b-chat': { input: 0.00007, output: 0.00007 },
      'meta-llama/codellama-34b-instruct': { input: 0.0004, output: 0.0004 },
      
      // OpenAI models (via OpenRouter)
      'openai/gpt-4-turbo-preview': { input: 0.01, output: 0.03 },
      'openai/gpt-4': { input: 0.03, output: 0.06 },
      'openai/gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
      
      // Claude models (via OpenRouter)
      'anthropic/claude-3-opus': { input: 0.015, output: 0.075 },
      'anthropic/claude-3-sonnet': { input: 0.003, output: 0.015 },
      'anthropic/claude-3-haiku': { input: 0.00025, output: 0.00125 },
      
      // Gemini models (via OpenRouter)
      'google/gemini-pro': { input: 0.00025, output: 0.0005 },
      'google/gemini-pro-vision': { input: 0.00025, output: 0.0005 },
      
      // Mixtral models
      'mistralai/mixtral-8x7b-instruct': { input: 0.00024, output: 0.00024 },
      'mistralai/mistral-7b-instruct': { input: 0.00006, output: 0.00006 },
    }
    
    const pricing = modelPricing[this.modelName] || { input: 0.001, output: 0.001 }
    
    return (inputTokens * pricing.input + outputTokens * pricing.output) / 1000
  }

  async validateConfig(): Promise<boolean> {
    try {
      // Test authentication by fetching available models
      const response = await fetch(`${this.endpoint}/api/v1/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://exhell.app',
          'X-Title': 'Exhell Excel Assistant',
        },
      })
      
      if (!response.ok) {
        console.error('OpenRouter validation failed:', response.status)
        return false
      }
      
      // Check if our model is available
      const data = await response.json()
      const models = data.data || []
      const modelIds = models.map((m: any) => m.id)
      
      return modelIds.includes(this.modelName)
    } catch (error) {
      console.error('OpenRouter validation error:', error)
      return false
    }
  }

  private supportsTools(): boolean {
    // Tool calling is supported by OpenAI, Claude, and some other models
    return this.modelName.includes('gpt') || 
           this.modelName.includes('claude') ||
           this.modelName.includes('mistral') ||
           this.modelName.includes('mixtral')
  }

  getInfo(): AIProviderInfo {
    const isLlama = this.modelName.includes('llama')
    const isClaude = this.modelName.includes('claude')
    const isGemini = this.modelName.includes('gemini')
    const isOpenAI = this.modelName.includes('gpt')
    
    return {
      name: 'openrouter',
      displayName: `OpenRouter (${this.modelName})`,
      description: 'Access multiple AI models through OpenRouter',
      supportedModels: [
        // LLAMA models
        'meta-llama/llama-2-70b-chat',
        'meta-llama/llama-2-13b-chat',
        'meta-llama/llama-2-7b-chat',
        'meta-llama/codellama-34b-instruct',
        // OpenAI models
        'openai/gpt-4-turbo-preview',
        'openai/gpt-4',
        'openai/gpt-3.5-turbo',
        // Claude models
        'anthropic/claude-3-opus',
        'anthropic/claude-3-sonnet',
        'anthropic/claude-3-haiku',
        // Gemini models
        'google/gemini-pro',
        'google/gemini-pro-vision',
        // Mixtral models
        'mistralai/mixtral-8x7b-instruct',
        'mistralai/mistral-7b-instruct',
      ],
      capabilities: {
        streaming: true,
        functionCalling: this.supportsTools(),
        vision: isGemini || (isOpenAI && this.modelName.includes('vision')) || isClaude,
        maxContextLength: isLlama ? 4096 : (isClaude ? 200000 : 128000),
      },
      pricing: {
        currency: 'USD',
        inputCostPer1k: 0.001, // Dynamic based on model
        outputCostPer1k: 0.001,
      },
    }
  }
}