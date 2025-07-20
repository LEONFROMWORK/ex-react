/**
 * Excel 처리 성능 벤치마크 도구
 * Rails와의 성능 비교를 위한 테스트 시스템
 */

import { adaptiveProcessor } from './adaptive-processor'
import { performanceMonitor, RAILS_PERFORMANCE_TARGET } from './performance-monitor'
import { getWorkerPool, destroyWorkerPool } from './worker-pool'

export interface BenchmarkConfig {
  fileSizes: number[] // MB 단위
  iterations: number // 각 크기별 반복 횟수
  methods: Array<'exceljs' | 'hyperformula' | 'streaming'>
  generateTestData: boolean
}

export interface BenchmarkResult {
  fileSize: number
  method: string
  averageTime: number
  minTime: number
  maxTime: number
  cellsPerSecond: number
  formulasPerSecond: number
  memoryUsed: number
  errors: number
  passedRailsTarget: boolean
}

export class PerformanceBenchmark {
  private config: BenchmarkConfig
  private results: BenchmarkResult[] = []

  constructor(config: Partial<BenchmarkConfig> = {}) {
    this.config = {
      fileSizes: [1, 10, 50, 100], // 1MB, 10MB, 50MB, 100MB
      iterations: 3,
      methods: ['exceljs', 'hyperformula', 'streaming'],
      generateTestData: true,
      ...config
    }
  }

  /**
   * 벤치마크 실행
   */
  async run(): Promise<BenchmarkResult[]> {
    console.log('🏃 성능 벤치마크 시작')
    console.log(`파일 크기: ${this.config.fileSizes.join(', ')}MB`)
    console.log(`반복 횟수: ${this.config.iterations}`)
    console.log(`테스트 방법: ${this.config.methods.join(', ')}`)
    console.log('---')

    // Worker Pool 사전 초기화 (HyperFormula용)
    if (this.config.methods.includes('hyperformula')) {
      await getWorkerPool()
    }

    try {
      for (const fileSizeMB of this.config.fileSizes) {
        for (const method of this.config.methods) {
          const result = await this.benchmarkMethod(fileSizeMB, method)
          this.results.push(result)
          
          // 결과 즉시 출력
          this.printResult(result)
        }
        console.log('---')
      }

      // 최종 요약
      this.printSummary()
      
      return this.results

    } finally {
      // Worker Pool 정리
      await destroyWorkerPool()
    }
  }

  /**
   * 특정 방법으로 벤치마크 수행
   */
  private async benchmarkMethod(
    fileSizeMB: number, 
    method: string
  ): Promise<BenchmarkResult> {
    console.log(`\n📊 벤치마킹: ${fileSizeMB}MB 파일, ${method} 방식`)

    const times: number[] = []
    const metrics: any[] = []
    let totalErrors = 0

    for (let i = 0; i < this.config.iterations; i++) {
      console.log(`  반복 ${i + 1}/${this.config.iterations}...`)
      
      // 테스트 파일 생성
      const testFile = this.generateTestFile(fileSizeMB)
      const sessionId = `benchmark-${fileSizeMB}MB-${method}-${i}`
      
      // 성능 모니터링 시작
      performanceMonitor.startMonitoring(sessionId, testFile.size)
      
      try {
        // 처리 실행
        const startTime = performance.now()
        const result = await adaptiveProcessor.processFile(testFile, {
          forceMethod: method as any
        })
        const endTime = performance.now()
        
        const duration = endTime - startTime
        times.push(duration)
        
        // 성능 메트릭 수집
        const perfMetrics = performanceMonitor.endMonitoring(
          method,
          result.metadata.performance.cellsPerSecond * (duration / 1000),
          result.metadata.performance.formulasPerSecond * (duration / 1000),
          result.errors.length
        )
        
        if (perfMetrics) {
          metrics.push(perfMetrics)
          totalErrors += result.errors.length
        }
        
      } catch (error) {
        console.error(`  ❌ 오류 발생: ${error}`)
        times.push(-1)
      }
    }

    // 유효한 결과만 필터링
    const validTimes = times.filter(t => t > 0)
    const validMetrics = metrics.filter(m => m)

    if (validTimes.length === 0) {
      return {
        fileSize: fileSizeMB,
        method,
        averageTime: -1,
        minTime: -1,
        maxTime: -1,
        cellsPerSecond: 0,
        formulasPerSecond: 0,
        memoryUsed: 0,
        errors: totalErrors,
        passedRailsTarget: false
      }
    }

    // 평균 계산
    const averageTime = validTimes.reduce((a, b) => a + b, 0) / validTimes.length
    const avgCellsPerSecond = validMetrics.reduce((a, b) => a + b.cellsPerSecond, 0) / validMetrics.length
    const avgFormulasPerSecond = validMetrics.reduce((a, b) => a + b.formulasPerSecond, 0) / validMetrics.length
    const avgMemoryUsed = validMetrics.reduce((a, b) => a + b.memoryUsed, 0) / validMetrics.length

    // Rails 목표 달성 여부 (100MB 기준)
    const passedRailsTarget = fileSizeMB === 100 
      ? averageTime <= RAILS_PERFORMANCE_TARGET.maxDuration
      : true

    return {
      fileSize: fileSizeMB,
      method,
      averageTime,
      minTime: Math.min(...validTimes),
      maxTime: Math.max(...validTimes),
      cellsPerSecond: avgCellsPerSecond,
      formulasPerSecond: avgFormulasPerSecond,
      memoryUsed: avgMemoryUsed,
      errors: totalErrors / this.config.iterations,
      passedRailsTarget
    }
  }

  /**
   * 테스트 파일 생성
   */
  private generateTestFile(sizeMB: number): File {
    // 실제 구현에서는 진짜 Excel 파일을 생성해야 함
    // 여기서는 시뮬레이션을 위한 더미 파일 생성
    
    const bytesPerMB = 1024 * 1024
    const totalBytes = sizeMB * bytesPerMB
    
    // Excel 파일의 대략적인 구조를 시뮬레이션
    // 평균적으로 1셀당 10바이트로 가정
    const cellsCount = totalBytes / 10
    const formulaRatio = 0.3 // 30%가 수식
    
    console.log(`  생성: ${sizeMB}MB (약 ${Math.floor(cellsCount).toLocaleString()} 셀)`)
    
    // Blob으로 더미 파일 생성
    const buffer = new ArrayBuffer(totalBytes)
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    
    return new File([blob], `test-${sizeMB}MB.xlsx`, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
  }

  /**
   * 결과 출력
   */
  private printResult(result: BenchmarkResult): void {
    if (result.averageTime < 0) {
      console.log(`  ❌ ${result.method}: 실패`)
      return
    }

    const avgTimeSeconds = result.averageTime / 1000
    const status = result.passedRailsTarget ? '✅' : '❌'
    
    console.log(`  ${status} ${result.method}:`)
    console.log(`     평균 시간: ${avgTimeSeconds.toFixed(2)}초`)
    console.log(`     최소/최대: ${(result.minTime/1000).toFixed(2)}초 / ${(result.maxTime/1000).toFixed(2)}초`)
    console.log(`     처리 속도: ${result.cellsPerSecond.toFixed(0)} cells/s`)
    console.log(`     메모리: ${(result.memoryUsed / 1024 / 1024).toFixed(2)}MB`)
    
    if (result.fileSize === 100 && !result.passedRailsTarget) {
      console.log(`     ⚠️ Rails 목표 미달성 (목표: ${RAILS_PERFORMANCE_TARGET.maxDuration/1000}초)`)
    }
  }

  /**
   * 전체 요약 출력
   */
  private printSummary(): void {
    console.log('\n📊 벤치마크 요약')
    console.log('================')
    
    // 100MB 파일 결과 중점 분석
    const results100MB = this.results.filter(r => r.fileSize === 100)
    
    if (results100MB.length > 0) {
      console.log('\n100MB 파일 성능 (Rails 목표: 5-7초):')
      
      results100MB.forEach(result => {
        const timeStr = result.averageTime > 0 
          ? `${(result.averageTime/1000).toFixed(2)}초`
          : '실패'
        const status = result.passedRailsTarget ? '✅ 달성' : '❌ 미달성'
        
        console.log(`  ${result.method}: ${timeStr} ${status}`)
      })
    }
    
    // 최적 방법 찾기
    const validResults = this.results.filter(r => r.averageTime > 0)
    if (validResults.length > 0) {
      const best = validResults.reduce((a, b) => 
        a.averageTime < b.averageTime ? a : b
      )
      
      console.log(`\n🏆 최고 성능: ${best.method} (${best.fileSize}MB - ${(best.averageTime/1000).toFixed(2)}초)`)
    }
    
    // 개선 제안
    console.log('\n💡 성능 개선 제안:')
    const failedTargets = results100MB.filter(r => !r.passedRailsTarget)
    
    if (failedTargets.length === results100MB.length) {
      console.log('  - 모든 방법이 Rails 목표를 달성하지 못했습니다')
      console.log('  - WebAssembly 또는 더 공격적인 최적화가 필요합니다')
    } else if (failedTargets.length > 0) {
      const passed = results100MB.filter(r => r.passedRailsTarget)
      console.log(`  - ${passed.map(r => r.method).join(', ')} 방법이 목표를 달성했습니다`)
      console.log(`  - 프로덕션에서는 이 방법들을 우선 사용하세요`)
    } else {
      console.log('  - 모든 방법이 Rails 성능 목표를 달성했습니다! 🎉')
    }
  }

  /**
   * CSV로 결과 내보내기
   */
  exportToCSV(): string {
    const headers = [
      'File Size (MB)',
      'Method',
      'Average Time (ms)',
      'Min Time (ms)',
      'Max Time (ms)',
      'Cells/Second',
      'Formulas/Second',
      'Memory Used (MB)',
      'Errors',
      'Passed Rails Target'
    ]
    
    const rows = this.results.map(r => [
      r.fileSize,
      r.method,
      r.averageTime.toFixed(2),
      r.minTime.toFixed(2),
      r.maxTime.toFixed(2),
      r.cellsPerSecond.toFixed(0),
      r.formulasPerSecond.toFixed(0),
      (r.memoryUsed / 1024 / 1024).toFixed(2),
      r.errors.toFixed(0),
      r.passedRailsTarget ? 'Yes' : 'No'
    ])
    
    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }
}

// 빠른 벤치마크 실행 함수
export async function runQuickBenchmark(): Promise<void> {
  const benchmark = new PerformanceBenchmark({
    fileSizes: [1, 10, 100], // 1MB, 10MB, 100MB만 테스트
    iterations: 2,
    methods: ['exceljs', 'hyperformula']
  })
  
  await benchmark.run()
}

// 전체 벤치마크 실행 함수
export async function runFullBenchmark(): Promise<BenchmarkResult[]> {
  const benchmark = new PerformanceBenchmark({
    fileSizes: [1, 10, 50, 100, 200], // 최대 200MB까지
    iterations: 5,
    methods: ['exceljs', 'hyperformula', 'streaming']
  })
  
  return await benchmark.run()
}