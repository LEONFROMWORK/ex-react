import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { writeFile } from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

const feedbackSchema = z.object({
  type: z.enum(['bug', 'feature', 'improvement', 'other']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  subject: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  email: z.string().email().optional().nullable(),
  metadata: z.object({
    currentPage: z.string().optional(),
    userAgent: z.string().optional(),
    timestamp: z.string().optional()
  }).optional()
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    // 폼데이터 파싱
    const formData = await request.formData()
    const dataString = formData.get('data') as string
    const screenshot = formData.get('screenshot') as File | null
    
    if (!dataString) {
      return NextResponse.json(
        { error: '피드백 데이터가 없습니다.' },
        { status: 400 }
      )
    }
    
    // JSON 파싱 및 검증
    const data = JSON.parse(dataString)
    const validatedData = feedbackSchema.parse(data)
    
    // 스크린샷 저장
    let screenshotPath: string | null = null
    if (screenshot) {
      const bytes = await screenshot.arrayBuffer()
      const buffer = Buffer.from(bytes)
      
      const fileName = `${uuidv4()}-${screenshot.name}`
      const uploadDir = path.join(process.cwd(), 'uploads', 'feedback')
      const filePath = path.join(uploadDir, fileName)
      
      await writeFile(filePath, buffer)
      screenshotPath = `/uploads/feedback/${fileName}`
    }
    
    // 피드백 저장
    const feedback = await prisma.feedback.create({
      data: {
        type: validatedData.type,
        priority: validatedData.priority,
        subject: validatedData.subject,
        description: validatedData.description,
        email: validatedData.email || null,
        userId: session?.user?.id || null,
        status: 'OPEN',
        metadata: validatedData.metadata as any,
        screenshotPath
      }
    })
    
    // 긴급 피드백인 경우 관리자에게 알림
    if (validatedData.priority === 'urgent') {
      // NotificationService를 사용하여 알림 전송
      const notificationData = {
        title: `긴급 피드백: ${validatedData.subject}`,
        body: validatedData.description.substring(0, 100) + '...',
        type: 'urgent_feedback' as const,
        priority: 'high' as const,
        metadata: {
          feedbackId: feedback.id,
          feedbackType: validatedData.type
        }
      }
      
      // 관리자들에게 이메일 알림
      const admins = await prisma.user.findMany({
        where: {
          role: { in: ['ADMIN', 'SUPER_ADMIN'] }
        },
        select: { email: true, name: true }
      })
      
      // 비동기로 알림 전송 (응답 지연 방지)
      Promise.all(
        admins.map(admin => 
          fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...notificationData,
              recipientEmail: admin.email,
              recipientName: admin.name
            })
          })
        )
      ).catch(console.error)
    }
    
    return NextResponse.json({
      success: true,
      feedbackId: feedback.id,
      message: '피드백이 성공적으로 전송되었습니다.'
    })
    
  } catch (error) {
    console.error('Feedback submission error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '입력 데이터가 올바르지 않습니다.', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: '피드백 전송 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    // 관리자만 피드백 목록 조회 가능
    if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role || '')) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const type = searchParams.get('type') || undefined
    const priority = searchParams.get('priority') || undefined
    const status = searchParams.get('status') || undefined
    
    const where: any = {}
    if (type) where.type = type
    if (priority) where.priority = priority
    if (status) where.status = status
    
    const [feedbacks, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ],
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.feedback.count({ where })
    ])
    
    return NextResponse.json({
      feedbacks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
    
  } catch (error) {
    console.error('Feedback fetch error:', error)
    return NextResponse.json(
      { error: '피드백 목록을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}