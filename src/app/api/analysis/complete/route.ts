import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/prisma'
import { NotificationService } from '@/lib/services/notification.service'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { fileId, analysisId } = await request.json()

    // 분석 정보 가져오기
    const analysis = await prisma.analysis.findUnique({
      where: { id: analysisId },
      include: {
        file: true
      }
    })

    if (!analysis || analysis.userId !== session.user.id) {
      return new Response('Analysis not found', { status: 404 })
    }

    // 오류 개수 계산
    const errors = JSON.parse(analysis.errors || '[]')
    const corrections = JSON.parse(analysis.corrections || '[]')

    // 알림 서비스를 통해 이메일/푸시 알림 전송
    const notificationService = NotificationService.getInstance()
    await notificationService.sendAnalysisComplete(
      session.user.id,
      fileId,
      analysis.file.originalName
    )

    // 사용자의 토큰이 부족한지 확인
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { tokens: true }
    })

    if (user && user.tokens < 50) {
      // 토큰 부족 알림도 전송
      await notificationService.sendLowTokensWarning(
        session.user.id,
        user.tokens
      )
    }

    return Response.json({
      success: true,
      errorCount: errors.length,
      fixedCount: corrections.length
    })
  } catch (error) {
    console.error('Error handling analysis completion:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}