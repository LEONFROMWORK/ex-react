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

    // 지식 베이스 통계 조회
    const stats = await getKnowledgeBaseStats()

    return NextResponse.json({
      success: true,
      stats
    })
  } catch (error) {
    console.error('지식 베이스 통계 조회 실패:', error)
    return NextResponse.json(
      { error: '통계 조회에 실패했습니다' },
      { status: 500 }
    )
  }
}

async function getKnowledgeBaseStats() {
  // 실제 구현에서는 지식 베이스 테이블에서 조회
  // 현재는 bigdata 시스템 통합을 반영한 임시 데이터로 구현
  const mockStats = {
    totalDocuments: 18456,
    totalEmbeddings: 18456,
    categories: {
      '함수오류': 5012,
      '피벗테이블': 3245,
      'VBA': 2187,
      '데이터분석': 2634,
      '차트': 1789,
      '서식': 2234,
      '기타': 1355
    },
    sources: {
      'stackoverflow': 12234,
      'reddit': 4567,
      'manual': 1655
    },
    sourceQuality: {
      'stackoverflow': 8.2,
      'reddit': 7.1,
      'manual': 9.3
    },
    lastUpdated: new Date().toISOString(),
    processingJobs: 0
  }

  // 실제 데이터베이스 조회 로직 (추후 구현 예정)
  // bigdata 시스템에서 수집된 Stack Overflow + Reddit 데이터 반영
  // const totalDocuments = await prisma.knowledgeDocument.count()
  // const categories = await prisma.knowledgeDocument.groupBy({
  //   by: ['category'],
  //   _count: true
  // })
  // const sources = await prisma.knowledgeDocument.groupBy({
  //   by: ['source'],
  //   _count: true
  // })
  // const sourceQuality = await prisma.knowledgeDocument.groupBy({
  //   by: ['source'],
  //   _avg: { qualityScore: true }
  // })
  // const processingJobs = await prisma.processingJob.count({
  //   where: { status: { in: ['pending', 'running'] } }
  // })

  return mockStats
}