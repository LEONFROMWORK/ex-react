import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCacheWarmingService } from '@/Services/Cache/CacheWarmingService'

// POST: 캐시 워밍 시작
export async function POST(request: NextRequest) {
  try {
    // 인증 확인 (관리자만 접근 가능)
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: '권한이 없습니다' },
        { status: 403 }
      )
    }

    const warmingService = getCacheWarmingService()
    const status = warmingService.getWarmingStatus()

    if (status.isRunning) {
      return NextResponse.json(
        { error: '캐시 워밍이 이미 실행 중입니다' },
        { status: 409 }
      )
    }

    // 비동기로 워밍 시작
    warmingService.startWarming().then(result => {
      if (!result.isSuccess) {
        console.error('캐시 워밍 실패:', result.error)
      }
    })

    return NextResponse.json({
      success: true,
      message: '캐시 워밍이 시작되었습니다',
      status: warmingService.getWarmingStatus(),
    })
  } catch (error) {
    console.error('캐시 워밍 시작 오류:', error)
    return NextResponse.json(
      { error: '캐시 워밍 시작 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

// GET: 캐시 워밍 상태 조회
export async function GET(request: NextRequest) {
  try {
    // 인증 확인 (관리자만 접근 가능)
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: '권한이 없습니다' },
        { status: 403 }
      )
    }

    const warmingService = getCacheWarmingService()
    const status = warmingService.getWarmingStatus()

    return NextResponse.json({
      success: true,
      data: status,
    })
  } catch (error) {
    console.error('캐시 워밍 상태 조회 오류:', error)
    return NextResponse.json(
      { error: '캐시 워밍 상태 조회 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

// DELETE: 캐시 워밍 통계 초기화
export async function DELETE(request: NextRequest) {
  try {
    // 인증 확인 (관리자만 접근 가능)
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: '권한이 없습니다' },
        { status: 403 }
      )
    }

    const warmingService = getCacheWarmingService()
    warmingService.resetStats()

    return NextResponse.json({
      success: true,
      message: '캐시 워밍 통계가 초기화되었습니다',
    })
  } catch (error) {
    console.error('캐시 워밍 통계 초기화 오류:', error)
    return NextResponse.json(
      { error: '캐시 워밍 통계 초기화 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}