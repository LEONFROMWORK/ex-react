import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AIModelManager } from '@/lib/ai/model-manager'
import { getServerSession } from '@/lib/auth/session'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    
    // API 키가 변경된 경우 암호화
    if (data.apiKey && !data.apiKey.includes(':')) {
      data.apiKey = AIModelManager.encryptApiKey(data.apiKey)
    }

    // 기본 모델로 설정하는 경우 다른 모델의 기본 설정 해제
    if (data.isDefault) {
      await prisma.aIModelConfig.updateMany({
        where: { 
          id: { not: params.id },
          isDefault: true
        },
        data: { isDefault: false }
      })
    }

    const model = await prisma.aIModelConfig.update({
      where: { id: params.id },
      data: {
        apiKey: data.apiKey,
        endpoint: data.endpoint,
        modelName: data.modelName,
        displayName: data.displayName,
        isActive: data.isActive,
        isDefault: data.isDefault,
        priority: data.priority,
        maxTokens: data.maxTokens,
        temperature: data.temperature,
        costPerToken: data.costPerToken,
        taskTypes: data.taskTypes,
        complexity: data.complexity,
      }
    })

    // AI Model Manager 재초기화
    const manager = AIModelManager.getInstance()
    await manager.initialize()

    return NextResponse.json({ model })
  } catch (error) {
    console.error('Error updating AI model:', error)
    return NextResponse.json({ error: 'Failed to update model' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.aIModelConfig.delete({
      where: { id: params.id }
    })

    // AI Model Manager 재초기화
    const manager = AIModelManager.getInstance()
    await manager.initialize()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting AI model:', error)
    return NextResponse.json({ error: 'Failed to delete model' }, { status: 500 })
  }
}