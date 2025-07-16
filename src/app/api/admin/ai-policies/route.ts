import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AIModelManager } from '@/lib/ai/model-manager'
import { getServerSession } from '@/lib/auth/session'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const policy = await prisma.aIModelPolicy.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ policy })
  } catch (error) {
    console.error('Error fetching AI policy:', error)
    return NextResponse.json({ error: 'Failed to fetch policy' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    // 기존 활성 정책 비활성화
    await prisma.aIModelPolicy.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    })

    const policy = await prisma.aIModelPolicy.create({
      data: {
        name: data.name,
        description: data.description,
        selectionMode: data.selectionMode,
        rules: data.rules,
        isActive: true,
      }
    })

    // AI Model Manager 재초기화
    const manager = AIModelManager.getInstance()
    await manager.initialize()

    return NextResponse.json({ policy })
  } catch (error) {
    console.error('Error creating AI policy:', error)
    return NextResponse.json({ error: 'Failed to create policy' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    const policy = await prisma.aIModelPolicy.update({
      where: { id: data.id },
      data: {
        name: data.name,
        description: data.description,
        selectionMode: data.selectionMode,
        rules: data.rules,
      }
    })

    // AI Model Manager 재초기화
    const manager = AIModelManager.getInstance()
    await manager.initialize()

    return NextResponse.json({ policy })
  } catch (error) {
    console.error('Error updating AI policy:', error)
    return NextResponse.json({ error: 'Failed to update policy' }, { status: 500 })
  }
}