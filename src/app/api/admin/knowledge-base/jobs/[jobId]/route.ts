import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { AuthPermissionService } from '@/lib/services/auth-permission.service'

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
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

    const jobId = params.jobId

    // 작업 상태 조회
    const job = await getJobStatus(jobId)

    if (!job) {
      return NextResponse.json({ error: '작업을 찾을 수 없습니다' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      job
    })
  } catch (error) {
    console.error('작업 상태 조회 실패:', error)
    return NextResponse.json(
      { error: '작업 상태 조회에 실패했습니다' },
      { status: 500 }
    )
  }
}

async function getJobStatus(jobId: string) {
  // 실제 구현에서는 데이터베이스에서 조회
  // 현재는 임시 구현
  
  // 임시 저장소에서 조회 (실제로는 Redis나 Database 사용)
  // const job = await prisma.processingJob.findUnique({
  //   where: { id: jobId }
  // })
  
  // 임시 데이터 (실제로는 위 코드 사용)
  const mockJob = {
    id: jobId,
    status: 'completed',
    progress: 100,
    stats: {
      totalItems: 1000,
      validItems: 950,
      invalidItems: 50,
      categories: {
        '함수오류': 300,
        '피벗테이블': 200,
        'VBA': 150,
        '데이터분석': 200,
        '기타': 100
      },
      averageQuality: 0.85,
      duplicates: 25
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  
  return mockJob
}