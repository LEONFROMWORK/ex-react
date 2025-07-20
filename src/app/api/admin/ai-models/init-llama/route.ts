import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AIModelManager } from '@/lib/ai/model-manager'
import { auth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if OpenRouter model already exists
    const existingModel = await prisma.aIModelConfig.findFirst({
      where: { provider: 'openrouter' }
    })

    if (existingModel) {
      // Update existing model
      await prisma.aIModelConfig.update({
        where: { id: existingModel.id },
        data: {
          apiKey: AIModelManager.encryptApiKey('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'),
          modelName: 'meta-llama/llama-2-70b-chat',
          displayName: 'LLAMA 2 70B Chat (via OpenRouter)',
          isActive: true,
          isDefault: true,
          priority: 100,
          maxTokens: 2000,
          temperature: 0.7,
          costPerCredit: 0.0007,
          taskTypes: ['EXCEL_ANALYSIS', 'ERROR_CORRECTION', 'FORMULA_GENERATION', 'GENERAL'],
          complexity: ['SIMPLE', 'MEDIUM', 'COMPLEX'],
        }
      })
    } else {
      // Deactivate other default models
      await prisma.aIModelConfig.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      })

      // Create new model
      await prisma.aIModelConfig.create({
        data: {
          provider: 'openrouter',
          apiKey: AIModelManager.encryptApiKey('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'),
          modelName: 'meta-llama/llama-2-70b-chat',
          displayName: 'LLAMA 2 70B Chat (via OpenRouter)',
          isActive: true,
          isDefault: true,
          priority: 100,
          maxTokens: 2000,
          temperature: 0.7,
          costPerCredit: 0.0007,
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
      await prisma.aIModelPolicy.update({
        where: { id: existingPolicy.id },
        data: {
          name: 'OpenRouter LLAMA 우선 정책',
          description: 'OpenRouter를 통한 LLAMA 모델을 기본으로 사용하는 정책',
          selectionMode: 'automatic',
          rules: JSON.stringify({
            fallbackChain: ['openrouter', 'openai', 'gemini', 'claude'],
            taskTypeMapping: {
              'EXCEL_ANALYSIS': ['openrouter'],
              'ERROR_CORRECTION': ['openrouter'],
              'FORMULA_GENERATION': ['openrouter'],
              'GENERAL': ['openrouter']
            },
            complexityThresholds: {
              simple: ['openrouter'],
              medium: ['openrouter'],
              complex: ['openrouter']
            },
            costOptimization: true,
            qualityPriority: 0.8
          })
        }
      })
    } else {
      await prisma.aIModelPolicy.create({
        data: {
          name: 'OpenRouter LLAMA 우선 정책',
          description: 'OpenRouter를 통한 LLAMA 모델을 기본으로 사용하는 정책',
          selectionMode: 'automatic',
          rules: JSON.stringify({
            fallbackChain: ['openrouter', 'openai', 'gemini', 'claude'],
            taskTypeMapping: {
              'EXCEL_ANALYSIS': ['openrouter'],
              'ERROR_CORRECTION': ['openrouter'],
              'FORMULA_GENERATION': ['openrouter'],
              'GENERAL': ['openrouter']
            },
            complexityThresholds: {
              simple: ['openrouter'],
              medium: ['openrouter'],
              complex: ['openrouter']
            },
            costOptimization: true,
            qualityPriority: 0.8
          }),
          isActive: true
        }
      })
    }

    // Initialize AI Model Manager
    const manager = AIModelManager.getInstance()
    await manager.initialize()

    return NextResponse.json({ 
      success: true, 
      message: 'OpenRouter LLAMA model configured successfully' 
    })
  } catch (error) {
    console.error('Error initializing LLAMA:', error)
    return NextResponse.json({ 
      error: 'Failed to initialize LLAMA',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}