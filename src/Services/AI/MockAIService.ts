import { OpenAI } from "openai"

/**
 * Mock AI Service for testing
 * Returns predefined responses for common prompts
 */
export class MockAIService {
  // Mimic OpenAI structure
  chat = {
    completions: {
      create: async (params: any) => {
        const message = params.messages[params.messages.length - 1].content
        
        // Mock responses based on common Excel generation patterns
        if (message.toLowerCase().includes('excel') || message.toLowerCase().includes('spreadsheet')) {
          return {
            id: 'mock-' + Date.now(),
            object: 'chat.completion',
            created: Date.now(),
            model: params.model || 'mock-model',
            choices: [{
              index: 0,
              message: {
                role: 'assistant',
                content: JSON.stringify({
                  sheets: [{
                    name: 'Sheet1',
                    columns: [
                      { name: 'ID', type: 'number' },
                      { name: 'Name', type: 'text' },
                      { name: 'Value', type: 'number' }
                    ],
                    data: [
                      [1, 'Test Item 1', 100],
                      [2, 'Test Item 2', 200],
                      [3, 'Test Item 3', 300]
                    ]
                  }],
                  formulas: [],
                  styles: {}
                })
              },
              finish_reason: 'stop'
            }],
            usage: {
              prompt_tokens: 10,
              completion_tokens: 20,
              total_tokens: 30
            }
          }
        }
        
        // Default mock response
        return {
          id: 'mock-' + Date.now(),
          object: 'chat.completion',
          created: Date.now(),
          model: params.model || 'mock-model',
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content: 'This is a mock response for testing purposes.'
            },
            finish_reason: 'stop'
          }],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 10,
            total_tokens: 20
          }
        }
      }
    }
  }

  // Mimic other OpenAI endpoints if needed
  models = {
    list: async () => ({
      data: [
        { id: 'mock-model-1', object: 'model', created: Date.now(), owned_by: 'mock' },
        { id: 'mock-model-2', object: 'model', created: Date.now(), owned_by: 'mock' }
      ]
    })
  }
}