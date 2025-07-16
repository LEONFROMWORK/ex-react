import { prisma } from '../src/lib/prisma'
import { AIModelManager } from '../src/lib/ai/model-manager'

async function setupLlama() {
  console.log('Setting up LLAMA model configuration...')

  try {
    // Check if LLAMA model already exists
    const existingModel = await prisma.aIModelConfig.findFirst({
      where: { provider: 'llama' }
    })

    if (existingModel) {
      console.log('LLAMA model already exists, updating configuration...')
      
      // Update existing model
      await prisma.aIModelConfig.update({
        where: { id: existingModel.id },
        data: {
          apiKey: AIModelManager.encryptApiKey('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'),
          endpoint: 'https://api.openrouter.ai', // OpenRouter endpoint for LLAMA
          modelName: 'meta-llama/llama-2-70b-chat',
          displayName: 'LLAMA 2 70B Chat',
          isActive: true,
          isDefault: true,
          priority: 100,
          maxTokens: 2000,
          temperature: 0.7,
          costPerToken: 0.0007, // OpenRouter pricing
          taskTypes: ['EXCEL_ANALYSIS', 'ERROR_CORRECTION', 'FORMULA_GENERATION', 'GENERAL'],
          complexity: ['SIMPLE', 'MEDIUM', 'COMPLEX'],
        }
      })
    } else {
      console.log('Creating new LLAMA model configuration...')
      
      // Create new model
      await prisma.aIModelConfig.create({
        data: {
          provider: 'llama',
          apiKey: AIModelManager.encryptApiKey('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'),
          endpoint: 'https://api.openrouter.ai',
          modelName: 'meta-llama/llama-2-70b-chat',
          displayName: 'LLAMA 2 70B Chat',
          isActive: true,
          isDefault: true,
          priority: 100,
          maxTokens: 2000,
          temperature: 0.7,
          costPerToken: 0.0007,
          taskTypes: ['EXCEL_ANALYSIS', 'ERROR_CORRECTION', 'FORMULA_GENERATION', 'GENERAL'],
          complexity: ['SIMPLE', 'MEDIUM', 'COMPLEX'],
        }
      })
    }

    // Create or update AI policy
    const existingPolicy = await prisma.aIModelPolicy.findFirst({
      where: { isActive: true }
    })

    if (existingPolicy) {
      console.log('Updating existing AI policy...')
      
      await prisma.aIModelPolicy.update({
        where: { id: existingPolicy.id },
        data: {
          name: 'LLAMA 우선 정책',
          description: 'LLAMA 모델을 기본으로 사용하는 정책',
          selectionMode: 'automatic',
          rules: {
            fallbackChain: ['llama', 'openai', 'gemini', 'claude'],
            taskTypeMapping: {
              'EXCEL_ANALYSIS': ['llama'],
              'ERROR_CORRECTION': ['llama'],
              'FORMULA_GENERATION': ['llama'],
              'GENERAL': ['llama']
            },
            complexityThresholds: {
              simple: ['llama'],
              medium: ['llama'],
              complex: ['llama']
            },
            costOptimization: true,
            qualityPriority: 0.8
          }
        }
      })
    } else {
      console.log('Creating new AI policy...')
      
      await prisma.aIModelPolicy.create({
        data: {
          name: 'LLAMA 우선 정책',
          description: 'LLAMA 모델을 기본으로 사용하는 정책',
          selectionMode: 'automatic',
          rules: {
            fallbackChain: ['llama', 'openai', 'gemini', 'claude'],
            taskTypeMapping: {
              'EXCEL_ANALYSIS': ['llama'],
              'ERROR_CORRECTION': ['llama'],
              'FORMULA_GENERATION': ['llama'],
              'GENERAL': ['llama']
            },
            complexityThresholds: {
              simple: ['llama'],
              medium: ['llama'],
              complex: ['llama']
            },
            costOptimization: true,
            qualityPriority: 0.8
          },
          isActive: true
        }
      })
    }

    console.log('LLAMA setup completed successfully!')
    console.log('Model is now active and set as default.')
  } catch (error) {
    console.error('Error setting up LLAMA:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the setup
setupLlama()