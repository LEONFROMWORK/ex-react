export { AIProvider } from './base'
export { OpenAIProvider } from './openai'
export { GeminiProvider } from './gemini'
export { ClaudeProvider } from './claude'
export { LlamaProvider } from './llama'
export { OpenRouterProvider } from './openrouter'

export const SUPPORTED_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    models: ['gpt-4', 'gpt-4-turbo-preview', 'gpt-3.5-turbo'],
    requiresApiKey: true,
    requiresEndpoint: false,
  },
  gemini: {
    name: 'Google Gemini',
    models: ['gemini-pro', 'gemini-pro-vision'],
    requiresApiKey: true,
    requiresEndpoint: false,
  },
  claude: {
    name: 'Anthropic Claude',
    models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
    requiresApiKey: true,
    requiresEndpoint: false,
  },
  llama: {
    name: 'LLAMA (Self-hosted)',
    models: ['llama2-7b', 'llama2-13b', 'llama2-70b'],
    requiresApiKey: true,
    requiresEndpoint: true,
  },
  openrouter: {
    name: 'OpenRouter (Multi-Model)',
    models: [
      'meta-llama/llama-2-70b-chat',
      'meta-llama/llama-2-13b-chat',
      'openai/gpt-4-turbo-preview',
      'openai/gpt-3.5-turbo',
      'anthropic/claude-3-opus',
      'google/gemini-pro',
      'mistralai/mixtral-8x7b-instruct'
    ],
    requiresApiKey: true,
    requiresEndpoint: false,
  },
} as const