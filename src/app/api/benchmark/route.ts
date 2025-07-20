import { NextRequest, NextResponse } from 'next/server'
import { runQuickBenchmark, runFullBenchmark } from '@/lib/excel/performance-benchmark'

export async function POST(request: NextRequest) {
  try {
    const { type = 'quick' } = await request.json()
    
    console.log(`벤치마크 요청: ${type}`)
    
    if (type === 'quick') {
      await runQuickBenchmark()
      return NextResponse.json({ 
        success: true, 
        message: '빠른 벤치마크 완료. 콘솔에서 결과를 확인하세요.' 
      })
    } else if (type === 'full') {
      const results = await runFullBenchmark()
      return NextResponse.json({ 
        success: true, 
        results,
        summary: generateSummary(results)
      })
    } else {
      return NextResponse.json(
        { error: '잘못된 벤치마크 타입' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('벤치마크 오류:', error)
    return NextResponse.json(
      { error: '벤치마크 실행 중 오류 발생' },
      { status: 500 }
    )
  }
}

function generateSummary(results: any[]): any {
  const results100MB = results.filter(r => r.fileSize === 100)
  const passedCount = results100MB.filter(r => r.passedRailsTarget).length
  
  return {
    totalTests: results.length,
    results100MB: results100MB.map(r => ({
      method: r.method,
      time: `${(r.averageTime/1000).toFixed(2)}초`,
      passed: r.passedRailsTarget
    })),
    railsTargetAchieved: passedCount > 0,
    bestMethod: results100MB.reduce((best, current) => 
      current.averageTime < best.averageTime ? current : best
    )?.method || null
  }
}