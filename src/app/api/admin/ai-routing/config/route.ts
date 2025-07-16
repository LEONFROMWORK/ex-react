import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from '@/lib/auth/session'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get routing configuration from database or use defaults
    let config = await prisma.aIModelPolicy.findFirst({
      where: { 
        name: 'routing-config',
        isActive: true 
      }
    })

    if (!config) {
      // Return default configuration
      const defaultRules = {
        enableFallback: true,
        enableLoadBalancing: true,
        enableCostOptimization: true,
        enableLatencyOptimization: false,
        maxRetries: 3,
        timeoutMs: 30000,
        fallbackStrategy: 'same-provider',
        costThreshold: 0.1,
        latencyThreshold: 5000,
        providerPriority: ['openrouter', 'openai', 'claude', 'gemini'],
        blacklistedModels: [],
        monitoring: {
          enableMetrics: true,
          alertOnFailure: true,
          alertThreshold: 5
        }
      }
      
      return NextResponse.json({ 
        config: {
          id: 'default',
          ...defaultRules
        }
      })
    }

    const rules = typeof config.rules === 'object' ? config.rules : {}
    
    return NextResponse.json({ 
      config: {
        id: config.id,
        ...rules
      }
    })
  } catch (error) {
    console.error('Error fetching routing config:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch configuration' 
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    const { id, ...rules } = data

    // Update or create routing configuration
    const existingConfig = await prisma.aIModelPolicy.findFirst({
      where: { name: 'routing-config' }
    })

    if (existingConfig) {
      await prisma.aIModelPolicy.update({
        where: { id: existingConfig.id },
        data: {
          rules,
          updatedAt: new Date()
        }
      })
    } else {
      await prisma.aIModelPolicy.create({
        data: {
          name: 'routing-config',
          description: 'AI Model Routing Configuration',
          selectionMode: 'automatic',
          rules,
          isActive: true
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating routing config:', error)
    return NextResponse.json({ 
      error: 'Failed to update configuration' 
    }, { status: 500 })
  }
}