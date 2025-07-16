import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { s3CostMonitor, DEFAULT_THRESHOLDS } from '@/lib/monitoring/s3-cost-monitor'

export async function GET(request: NextRequest) {
  try {
    // 관리자 권한 확인
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다' },
        { status: 403 }
      )
    }

    // S3 메트릭 수집
    const metrics = await s3CostMonitor.getStorageMetrics()
    
    // 임계값 확인
    const alerts = await s3CostMonitor.checkCostAlerts(metrics, DEFAULT_THRESHOLDS)

    return NextResponse.json({
      success: true,
      data: {
        metrics,
        alerts,
        thresholds: DEFAULT_THRESHOLDS,
        recommendations: generateRecommendations(metrics)
      }
    })
  } catch (error) {
    console.error('S3 모니터링 API 오류:', error)
    return NextResponse.json(
      { error: 'S3 모니터링 데이터 조회 실패' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // 관리자 권한 확인
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action, thresholds } = body

    switch (action) {
      case 'update-thresholds':
        // 임계값 업데이트 로직
        if (thresholds) {
          // 실제 구현에서는 데이터베이스에 저장
          console.log('새로운 임계값 설정:', thresholds)
        }
        break

      case 'run-monitoring':
        // 즉시 모니터링 실행
        await s3CostMonitor.runMonitoring(thresholds || DEFAULT_THRESHOLDS)
        break

      case 'generate-report':
        // 리포트 생성
        const metrics = await s3CostMonitor.getStorageMetrics()
        const alerts = await s3CostMonitor.checkCostAlerts(metrics, thresholds || DEFAULT_THRESHOLDS)
        await s3CostMonitor.sendCostReport(metrics, alerts)
        break

      default:
        return NextResponse.json(
          { error: '잘못된 액션입니다' },
          { status: 400 }
        )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('S3 모니터링 API 오류:', error)
    return NextResponse.json(
      { error: 'S3 모니터링 작업 실패' },
      { status: 500 }
    )
  }
}

function generateRecommendations(metrics: any): string[] {
  const recommendations: string[] = []

  if (metrics.estimatedMonthlyCost > 20) {
    recommendations.push('라이프사이클 정책을 검토하여 비용을 절감하세요.')
  }

  if (metrics.standardStorage > 50) {
    recommendations.push('오래된 파일을 Standard-IA로 이동하는 것을 고려하세요.')
  }

  if (metrics.totalObjects > 100000) {
    recommendations.push('불필요한 파일을 정리하고 자동 삭제 정책을 설정하세요.')
  }

  return recommendations
}