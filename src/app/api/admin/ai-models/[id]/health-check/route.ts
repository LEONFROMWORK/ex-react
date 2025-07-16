import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AIModelManager } from '@/lib/ai/model-manager'
import { getServerSession } from '@/lib/auth/session'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const model = await prisma.aIModelConfig.findUnique({
      where: { id: params.id }
    })

    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 })
    }

    // Perform health check
    const manager = AIModelManager.getInstance()
    const provider = await (manager as any).createProvider(model)
    
    if (!provider) {
      return NextResponse.json({ 
        modelId: model.id,
        displayName: model.displayName,
        status: 'error',
        error: 'Provider not supported'
      })
    }

    const startTime = Date.now()
    
    try {
      // Simple health check with minimal prompt
      const response = await provider.generateResponse("Hi", {
        maxTokens: 10,
        temperature: 0.1,
      })
      
      const latency = Date.now() - startTime

      // Log health check result
      await prisma.aIModelUsageLog.create({
        data: {
          modelConfigId: model.id,
          userId: 'system-health-check',
          promptTokens: response.usage.promptTokens || 0,
          completionTokens: response.usage.completionTokens || 0,
          totalTokens: response.usage.totalTokens,
          cost: response.cost,
          latency,
          success: true,
          taskType: 'HEALTH_CHECK'
        }
      })

      return NextResponse.json({
        modelId: model.id,
        displayName: model.displayName,
        status: 'online',
        latency,
        tokensUsed: response.usage.totalTokens,
        cost: response.cost,
      })
    } catch (error) {
      const latency = Date.now() - startTime
      
      // Log health check error
      await prisma.aIModelUsageLog.create({
        data: {
          modelConfigId: model.id,
          userId: 'system-health-check',
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          cost: 0,
          latency,
          success: false,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          taskType: 'HEALTH_CHECK'
        }
      })

      return NextResponse.json({
        modelId: model.id,
        displayName: model.displayName,
        status: 'error',
        latency,
        error: error instanceof Error ? error.message : 'Health check failed',
      })
    }
  } catch (error) {
    console.error('Error during health check:', error)
    return NextResponse.json({ 
      error: 'Health check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}