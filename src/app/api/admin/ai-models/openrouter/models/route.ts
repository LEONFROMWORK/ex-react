import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

interface OpenRouterModel {
  id: string
  name: string
  description?: string
  context_length: number
  architecture: {
    modality: string
    tokenizer: string
    instruct_type?: string
  }
  pricing: {
    prompt: string
    completion: string
    request?: string
    image?: string
  }
  top_provider: {
    context_length?: number
    max_completion_tokens?: number
    is_moderated?: boolean
  }
  per_request_limits?: {
    prompt_tokens?: string
    completion_tokens?: string
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch models from OpenRouter
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY || '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'}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://exhell.app',
        'X-Title': 'Exhell Admin',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`)
    }

    const data = await response.json()
    const models: OpenRouterModel[] = data.data || []

    // Filter and categorize models
    const categorizedModels = {
      recommended: models.filter(m => 
        m.id.includes('llama') || 
        m.id.includes('gpt-4') || 
        m.id.includes('claude-3') ||
        m.id.includes('gemini')
      ),
      chat: models.filter(m => 
        m.architecture.instruct_type === 'chat' ||
        m.id.includes('chat') ||
        m.id.includes('turbo')
      ),
      completion: models.filter(m => 
        m.architecture.instruct_type === 'completion' ||
        (!m.architecture.instruct_type && !m.id.includes('chat'))
      ),
      vision: models.filter(m => 
        m.architecture.modality === 'multimodal' ||
        m.id.includes('vision')
      ),
      all: models
    }

    // Add cost calculations
    const modelsWithCost = models.map(model => ({
      ...model,
      estimatedCost: {
        per1kInput: parseFloat(model.pricing.prompt) * 1000,
        per1kOutput: parseFloat(model.pricing.completion) * 1000,
        perRequest: parseFloat(model.pricing.request || '0'),
      }
    }))

    return NextResponse.json({
      success: true,
      models: modelsWithCost,
      categorized: categorizedModels,
      total: models.length
    })
  } catch (error) {
    console.error('Error fetching OpenRouter models:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch models',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}