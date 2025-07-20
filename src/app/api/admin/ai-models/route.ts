import { NextRequest, NextResponse } from 'next/server'
import { container } from '@/Infrastructure/DependencyInjection/Container'
import { getServerSession } from '@/lib/auth/session'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const handler = container.getGetActiveModelsHandler()
    const result = await handler.handle({
      includeInactive: true // Admin can see all models
    })

    if (result.isFailure) {
      return NextResponse.json({ error: result.error!.message }, { status: 400 })
    }

    return NextResponse.json({ models: result.value!.models })
  } catch (error) {
    console.error('Error fetching AI models:', error)
    return NextResponse.json({ error: 'Failed to fetch models' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { provider, modelName, displayName, context_length, pricing, apiKey } = body

    // 기본 설정
    const providerDefaults: Record<string, any> = {
      openai: {
        modelName: 'gpt-4',
        displayName: 'OpenAI GPT-4',
        maxTokens: 2000,
        temperature: 0.7,
        costPerCredit: 0.00003,
      },
      gemini: {
        modelName: 'gemini-pro',
        displayName: 'Google Gemini Pro',
        maxTokens: 2048,
        temperature: 0.7,
        costPerCredit: 0.000001,
      },
      claude: {
        modelName: 'claude-3-opus-20240229',
        displayName: 'Anthropic Claude 3 Opus',
        maxTokens: 2000,
        temperature: 0.7,
        costPerCredit: 0.000015,
      },
      llama: {
        modelName: 'llama2-70b',
        displayName: 'LLAMA 2 70B',
        maxTokens: 2000,
        temperature: 0.7,
        costPerCredit: 0,
      },
      openrouter: {
        maxTokens: 2000,
        temperature: 0.7,
        costPerCredit: 0.001,
      }
    }

    const defaults = providerDefaults[provider] || {}

    const handler = container.getConfigureModelHandler()
    const result = await handler.handle({
      provider,
      modelName: modelName || defaults.modelName,
      displayName: displayName || defaults.displayName,
      apiKey: apiKey || (provider === 'openrouter' ? process.env.OPENROUTER_API_KEY : undefined),
      endpoint: provider === 'llama' ? body.endpoint : undefined,
      maxTokens: Math.min(context_length || defaults.maxTokens || 2000, 4000),
      temperature: defaults.temperature || 0.7,
      costPerToken: pricing ? parseFloat(pricing.prompt) : (defaults.costPerToken || 0.001),
      costPerCredit: pricing ? parseFloat(pricing.prompt) : (defaults.costPerCredit || 0.001),
      taskTypes: body.taskTypes || [],
      priority: body.priority || 0,
      isDefault: false,
      isActive: false
    })

    if (result.isFailure) {
      return NextResponse.json({ error: result.error!.message }, { status: 400 })
    }

    return NextResponse.json({ model: result.value })
  } catch (error) {
    console.error('Error creating AI model:', error)
    return NextResponse.json({ error: 'Failed to create model' }, { status: 500 })
  }
}