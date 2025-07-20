/**
 * Excel 처리 성능 모니터링 시스템
 */

export interface PerformanceMetrics {
  processingMethod: string
  startTime: number
  endTime: number
  duration: number
  fileSize: number
  totalCells: number
  totalFormulas: number
  cellsPerSecond: number
  formulasPerSecond: number
  memoryUsed: number
  peakMemory: number
  errors: number
}

export interface PerformanceThresholds {
  maxDuration: number // ms
  minCellsPerSecond: number
  maxMemoryUsage: number // bytes
}

export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map()
  private currentSession: string | null = null
  private startTime: number = 0
  private initialMemory: number = 0
  private peakMemory: number = 0
  private memoryCheckInterval: NodeJS.Timeout | null = null

  /**
   * 성능 모니터링 시작
   */
  startMonitoring(sessionId: string, fileSize: number): void {
    this.currentSession = sessionId
    this.startTime = performance.now()
    this.initialMemory = this.getCurrentMemory()
    this.peakMemory = this.initialMemory
    
    // 메모리 사용량 추적
    this.memoryCheckInterval = setInterval(() => {
      const currentMemory = this.getCurrentMemory()
      if (currentMemory > this.peakMemory) {
        this.peakMemory = currentMemory
      }
    }, 100) // 100ms마다 체크
    
    console.log(`📊 성능 모니터링 시작: ${sessionId}`)
    console.log(`   파일 크기: ${(fileSize / 1024 / 1024).toFixed(2)}MB`)
    console.log(`   초기 메모리: ${(this.initialMemory / 1024 / 1024).toFixed(2)}MB`)
  }

  /**
   * 성능 모니터링 종료
   */
  endMonitoring(
    processingMethod: string,
    totalCells: number,
    totalFormulas: number,
    errors: number
  ): PerformanceMetrics | null {
    if (!this.currentSession) {
      return null
    }
    
    const endTime = performance.now()
    const duration = endTime - this.startTime
    const finalMemory = this.getCurrentMemory()
    const memoryUsed = finalMemory - this.initialMemory
    
    // 메모리 체크 중지
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval)
      this.memoryCheckInterval = null
    }
    
    const metrics: PerformanceMetrics = {
      processingMethod,
      startTime: this.startTime,
      endTime,
      duration,
      fileSize: 0, // 외부에서 설정
      totalCells,
      totalFormulas,
      cellsPerSecond: totalCells / (duration / 1000),
      formulasPerSecond: totalFormulas / (duration / 1000),
      memoryUsed,
      peakMemory: this.peakMemory - this.initialMemory,
      errors
    }
    
    this.metrics.set(this.currentSession, metrics)
    
    console.log(`✅ 성능 모니터링 완료: ${this.currentSession}`)
    console.log(`   처리 시간: ${duration.toFixed(2)}ms`)
    console.log(`   셀/초: ${metrics.cellsPerSecond.toFixed(0)}`)
    console.log(`   수식/초: ${metrics.formulasPerSecond.toFixed(0)}`)
    console.log(`   메모리 사용: ${(memoryUsed / 1024 / 1024).toFixed(2)}MB`)
    console.log(`   최대 메모리: ${(metrics.peakMemory / 1024 / 1024).toFixed(2)}MB`)
    
    this.currentSession = null
    return metrics
  }

  /**
   * 성능 비교
   */
  comparePerformance(sessionIds: string[]): Record<string, any> {
    const comparison: Record<string, any> = {}
    
    sessionIds.forEach(sessionId => {
      const metrics = this.metrics.get(sessionId)
      if (metrics) {
        comparison[sessionId] = {
          method: metrics.processingMethod,
          duration: `${metrics.duration.toFixed(2)}ms`,
          cellsPerSecond: metrics.cellsPerSecond.toFixed(0),
          formulasPerSecond: metrics.formulasPerSecond.toFixed(0),
          memoryUsed: `${(metrics.memoryUsed / 1024 / 1024).toFixed(2)}MB`,
          errors: metrics.errors
        }
      }
    })
    
    return comparison
  }

  /**
   * 성능 임계값 검사
   */
  checkThresholds(
    sessionId: string, 
    thresholds: PerformanceThresholds
  ): { passed: boolean; violations: string[] } {
    const metrics = this.metrics.get(sessionId)
    if (!metrics) {
      return { passed: false, violations: ['메트릭 없음'] }
    }
    
    const violations: string[] = []
    
    if (metrics.duration > thresholds.maxDuration) {
      violations.push(`처리 시간 초과: ${metrics.duration.toFixed(0)}ms > ${thresholds.maxDuration}ms`)
    }
    
    if (metrics.cellsPerSecond < thresholds.minCellsPerSecond) {
      violations.push(`처리 속도 미달: ${metrics.cellsPerSecond.toFixed(0)} < ${thresholds.minCellsPerSecond} cells/s`)
    }
    
    if (metrics.memoryUsed > thresholds.maxMemoryUsage) {
      violations.push(`메모리 사용량 초과: ${(metrics.memoryUsed / 1024 / 1024).toFixed(2)}MB`)
    }
    
    return {
      passed: violations.length === 0,
      violations
    }
  }

  /**
   * 성능 보고서 생성
   */
  generateReport(sessionId: string): string {
    const metrics = this.metrics.get(sessionId)
    if (!metrics) {
      return '성능 데이터 없음'
    }
    
    const report = `
=== Excel 처리 성능 보고서 ===
세션 ID: ${sessionId}
처리 방식: ${metrics.processingMethod}

📊 처리 통계:
- 총 처리 시간: ${metrics.duration.toFixed(2)}ms
- 총 셀 수: ${metrics.totalCells.toLocaleString()}
- 총 수식 수: ${metrics.totalFormulas.toLocaleString()}
- 오류 수: ${metrics.errors}

⚡ 성능 지표:
- 셀 처리 속도: ${metrics.cellsPerSecond.toFixed(0)} cells/s
- 수식 처리 속도: ${metrics.formulasPerSecond.toFixed(0)} formulas/s
- 파일 크기: ${(metrics.fileSize / 1024 / 1024).toFixed(2)}MB
- 처리 속도: ${(metrics.fileSize / metrics.duration * 1000 / 1024 / 1024).toFixed(2)}MB/s

💾 메모리 사용:
- 사용된 메모리: ${(metrics.memoryUsed / 1024 / 1024).toFixed(2)}MB
- 최대 메모리: ${(metrics.peakMemory / 1024 / 1024).toFixed(2)}MB

🎯 효율성:
- 메모리 효율: ${(metrics.totalCells / metrics.memoryUsed * 1024 * 1024).toFixed(0)} cells/MB
- 시간 효율: ${(metrics.fileSize / metrics.duration).toFixed(0)} bytes/ms
`
    
    return report
  }

  /**
   * 모든 메트릭 초기화
   */
  clearMetrics(): void {
    this.metrics.clear()
    this.currentSession = null
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval)
      this.memoryCheckInterval = null
    }
  }

  /**
   * 특정 세션의 메트릭 가져오기
   */
  getMetrics(sessionId: string): PerformanceMetrics | undefined {
    return this.metrics.get(sessionId)
  }

  /**
   * 모든 세션의 평균 성능 계산
   */
  getAveragePerformance(): Record<string, number> {
    if (this.metrics.size === 0) {
      return {}
    }
    
    let totalDuration = 0
    let totalCellsPerSecond = 0
    let totalFormulasPerSecond = 0
    let totalMemoryUsed = 0
    
    this.metrics.forEach(metrics => {
      totalDuration += metrics.duration
      totalCellsPerSecond += metrics.cellsPerSecond
      totalFormulasPerSecond += metrics.formulasPerSecond
      totalMemoryUsed += metrics.memoryUsed
    })
    
    const count = this.metrics.size
    
    return {
      avgDuration: totalDuration / count,
      avgCellsPerSecond: totalCellsPerSecond / count,
      avgFormulasPerSecond: totalFormulasPerSecond / count,
      avgMemoryUsed: totalMemoryUsed / count
    }
  }

  // 유틸리티 함수
  
  private getCurrentMemory(): number {
    if (typeof performance !== 'undefined' && performance.memory) {
      return performance.memory.usedJSHeapSize
    }
    // Node.js 환경
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage()
      return usage.heapUsed
    }
    return 0
  }
}

// 전역 인스턴스
export const performanceMonitor = new PerformanceMonitor()

// Rails 성능 목표 (100MB 파일 기준)
export const RAILS_PERFORMANCE_TARGET: PerformanceThresholds = {
  maxDuration: 7000, // 7초
  minCellsPerSecond: 100000, // 10만 셀/초
  maxMemoryUsage: 500 * 1024 * 1024 // 500MB
}