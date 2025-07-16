import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'

const updateSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    // 로그인 확인
    if (!session?.user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }
    
    const feedback = await prisma.feedback.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        responder: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })
    
    if (!feedback) {
      return NextResponse.json(
        { error: '피드백을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }
    
    // 일반 사용자는 자신의 피드백만 조회 가능
    if (
      session.user.role !== 'ADMIN' && 
      session.user.role !== 'SUPER_ADMIN' &&
      feedback.userId !== session.user.id
    ) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(feedback)
    
  } catch (error) {
    console.error('Feedback fetch error:', error)
    return NextResponse.json(
      { error: '피드백을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    // 관리자만 수정 가능
    if (!session?.user || !['ADMIN', 'SUPER_ADMIN', 'SUPPORT'].includes(session.user.role || '')) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }
    
    const body = await request.json()
    const validatedData = updateSchema.parse(body)
    
    const feedback = await prisma.feedback.update({
      where: { id: params.id },
      data: validatedData
    })
    
    // 감사 로그 기록
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE_FEEDBACK',
        targetId: params.id,
        details: validatedData
      }
    })
    
    return NextResponse.json(feedback)
    
  } catch (error) {
    console.error('Feedback update error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '입력 데이터가 올바르지 않습니다.', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: '피드백 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    // 관리자만 삭제 가능
    if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role || '')) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }
    
    await prisma.feedback.delete({
      where: { id: params.id }
    })
    
    // 감사 로그 기록
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE_FEEDBACK',
        targetId: params.id,
        details: null
      }
    })
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Feedback delete error:', error)
    return NextResponse.json(
      { error: '피드백 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}