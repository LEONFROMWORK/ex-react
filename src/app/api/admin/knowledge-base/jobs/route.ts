import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { AuthPermissionService } from '@/lib/services/auth-permission.service'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    // 권한 확인
    const permissionService = AuthPermissionService.getInstance()
    const userRole = await permissionService.getUserRole(session.user.id)
    
    if (!permissionService.hasPermission(userRole, 'canAccessAdmin')) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    // 처리 중인 작업들 조회
    const jobs = await getProcessingJobs()

    return NextResponse.json({
      success: true,
      jobs
    })
  } catch (error) {
    console.error('작업 목록 조회 실패:', error)
    return NextResponse.json(
      { error: '작업 목록 조회에 실패했습니다' },
      { status: 500 }
    )
  }
}

async function getProcessingJobs() {
  // 실제 구현에서는 Processing Job 테이블에서 조회
  // 현재는 임시 데이터로 구현
  const mockJobs = [
    // 예시 진행 중인 작업이 있다면 여기에 표시
  ]

  // 실제 데이터베이스 조회 로직 (추후 구현 예정)
  // const jobs = await prisma.processingJob.findMany({
  //   where: {
  //     status: { in: ['pending', 'running'] }
  //   },
  //   orderBy: { createdAt: 'desc' },
  //   take: 10
  // })

  return mockJobs
}