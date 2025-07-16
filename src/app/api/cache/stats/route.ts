import { NextRequest, NextResponse } from 'next/server'
import { container } from '@/Infrastructure/DependencyInjection/Container'
import { getExcelAnalysisCacheService } from '@/Services/Cache/ExcelAnalysisCacheService'

// GET: 캐시 통계 조회
export async function GET(request: NextRequest) {
  try {
    const cacheService = container.getCache() as any
    const excelCacheService = getExcelAnalysisCacheService()
    
    // 캐시 통계 (메모리 캐시인 경우에만)
    const cacheStats = cacheService.getStats ? cacheService.getStats() : {
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
    const hitRate = cacheStats.hits + cacheStats.misses > 0
      ? (cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100
      : 0

    return NextResponse.json({
      success: true,
      ...cacheStats,
      hitRate: hitRate.toFixed(2) + '%',
      mode: cacheService.getStats ? 'In-Memory' : 'Redis',
      excel: excelStats,
      summary: {
        totalOperations: cacheStats.hits + cacheStats.misses + cacheStats.sets + cacheStats.deletes,
        cacheEfficiency: hitRate.toFixed(2) + '%',
        lastUpdated: new Date(),
        cacheMode: cacheService.getStats ? 'In-Memory' : 'Redis',
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