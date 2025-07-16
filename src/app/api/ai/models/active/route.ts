import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from '@/lib/auth-helper'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get only active models
    const models = await prisma.aIModelConfig.findMany({
      where: { isActive: true },
      orderBy: [
        { isDefault: 'desc' },
        { priority: 'desc' },
        { displayName: 'asc' }
      ],
      select: {
        id: true,
        provider: true,
        modelName: true,
        displayName: true,
        isActive: true,
        isDefault: true,
        maxTokens: true,
        costPerToken: true,
      }
    })

    return NextResponse.json({ 
      success: true,
      models 
    })
  } catch (error) {
    console.error('Error fetching active models:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch models' 
    }, { status: 500 })
  }
}