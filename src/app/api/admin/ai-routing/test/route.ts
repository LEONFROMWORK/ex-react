import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth/session'
import { AIModelManager } from '@/lib/ai/model-manager'
import { ModelSelectionCriteria } from '@/lib/ai/types'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { prompt, taskType } = await request.json()
    
    // Initialize AI Manager
    const manager = AIModelManager.getInstance()
    await manager.initialize()

    // Test the routing with the given prompt
    const startTime = Date.now()
    
    const criteria: ModelSelectionCriteria = {
      taskType: taskType || 'GENERAL',
      complexity: 'MEDIUM',
    }

    try {
      const response = await manager.chat(prompt, criteria, {
        maxTokens: 100, // Limit tokens for testing
        temperature: 0.7,
      })

      const endTime = Date.now()

      return NextResponse.json({
        success: true,
        model: response.model,
        provider: response.provider,
        latency: endTime - startTime,
        cost: response.cost.toFixed(6),
        tokensUsed: response.usage.totalTokens,
        fallbackAttempts: 0, // TODO: Track this in the manager
        response: response.content.substring(0, 200) + '...' // Preview only
      })
    } catch (error) {
      const endTime = Date.now()
      
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        latency: endTime - startTime,
        fallbackAttempts: 1, // At least one attempt was made
      })
    }
  } catch (error) {
    console.error('Error testing routing:', error)
    return NextResponse.json({ 
      error: 'Failed to test routing' 
    }, { status: 500 })
  }
}