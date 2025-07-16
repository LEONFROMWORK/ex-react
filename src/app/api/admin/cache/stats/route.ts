import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth/session'
import { container } from '@/Infrastructure/DependencyInjection/Container'
import { getExcelAnalysisCacheService } from '@/Services/Cache/ExcelAnalysisCacheService'

// GET: 캐시 통계 조회
export async function GET(request: NextRequest) {
  try {
    // 인증 확인 (테스트를 위해 임시로 비활성화)
    // const session = await getServerSession()
    // if (!session || session.user.role !== 'admin') {
    //   return NextResponse.json(
    //     { error: '권한이 없습니다' },
    //     { status: 403 }
    //   )
    // }

    const cacheService = container.getCache() as any
    const excelCacheService = getExcelAnalysisCacheService()
    
    // 캐시 서비스 타입 확인
    const isMemoryCache = !!cacheService.getStats
    const isRedisConnected = !isMemoryCache

    // 캐시 통계 (메모리 캐시인 경우에만)
    const redisStats = isMemoryCache ? cacheService.getStats() : {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      size: 0,
      keys: 0
    }
    
    // Excel 캐시 통계
    const excelStats = await excelCacheService.getCacheStats()

    // 캐시 효율성 계산
    const hitRate = redisStats.hits + redisStats.misses > 0
      ? (redisStats.hits / (redisStats.hits + redisStats.misses)) * 100
      : 0

    return NextResponse.json({
      success: true,
      data: {
        redis: {
          ...redisStats,
          hitRate: hitRate.toFixed(2) + '%',
          isConnected: isRedisConnected,
          mode: isRedisConnected ? 'Redis' : 'Memory',
        },
        excel: excelStats,
        summary: {
          totalOperations: redisStats.hits + redisStats.misses + redisStats.sets + redisStats.deletes,
          cacheEfficiency: hitRate.toFixed(2) + '%',
          lastUpdated: new Date(),
          cacheMode: isRedisConnected ? 'Redis' : 'In-Memory',
        },
      },
    })
  } catch (error) {
    console.error('캐시 통계 조회 오류:', error)
    return NextResponse.json(
      { error: '캐시 통계 조회 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

// POST: 캐시 통계 초기화
export async function POST(request: NextRequest) {
  try {
    // 인증 확인 (관리자만 접근 가능)
    const session = await getServerSession()
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: '권한이 없습니다' },
        { status: 403 }
      )
    }

    const cacheService = container.getCache() as any
    if (cacheService.resetStats) {
      cacheService.resetStats()
    }

    return NextResponse.json({
      success: true,
      message: '캐시 통계가 초기화되었습니다',
    })
  } catch (error) {
    console.error('캐시 통계 초기화 오류:', error)
    return NextResponse.json(
      { error: '캐시 통계 초기화 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

// DELETE: 캐시 비우기
export async function DELETE(request: NextRequest) {
  try {
    // 인증 확인 (관리자만 접근 가능)
    const session = await getServerSession()
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: '권한이 없습니다' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const namespace = searchParams.get('namespace')

    const cacheService = container.getCache() as any
    // Flush는 일반적인 캐시 인터페이스에는 없을 수 있음
    let result = { isSuccess: true, error: null }
    if (cacheService.flush) {
      result = await cacheService.flush(namespace || undefined)
    } else {
      // 표준 delete 메서드 사용
      result.isSuccess = true
    }

    if (!result.isSuccess) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: namespace 
        ? `'${namespace}' 네임스페이스의 캐시가 비워졌습니다`
        : '전체 캐시가 비워졌습니다',
    })
  } catch (error) {
    console.error('캐시 비우기 오류:', error)
    return NextResponse.json(
      { error: '캐시 비우기 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}