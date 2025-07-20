'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { adaptiveProcessor } from '@/lib/excel/adaptive-processor'
import { performanceMonitor } from '@/lib/excel/performance-monitor'

export default function TestHyperFormula() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const generateTestFile = (sizeMB: number): File => {
    // Excel 파일 구조를 시뮬레이션하는 테스트 데이터 생성
    const rows = Math.floor(sizeMB * 10000) // 대략 1MB당 10,000행
    const cols = 10 // 10개 컬럼
    
    // 간단한 CSV 형태로 테스트 (실제로는 Excel 파일이어야 함)
    let csvContent = 'A,B,C,D,E,F,G,H,I,J\n'
    
    for (let i = 1; i <= rows; i++) {
      const row = []
      for (let j = 0; j < cols; j++) {
        if (j === 0) {
          row.push(i) // 첫 번째 열은 행 번호
        } else if (j === cols - 1 && i > 1) {
          row.push(`=SUM(A${i}:${String.fromCharCode(65 + cols - 2)}${i})`) // 마지막 열은 SUM 수식
        } else {
          row.push(Math.floor(Math.random() * 100)) // 나머지는 랜덤 숫자
        }
      }
      csvContent += row.join(',') + '\n'
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    return new File([blob], `test-${sizeMB}MB.csv`, { type: 'text/csv' })
  }

  const runTest = async (method: 'exceljs' | 'hyperformula', sizeMB: number) => {
    setLoading(true)
    setError(null)
    setResults(null)

    try {
      const file = generateTestFile(sizeMB)
      const sessionId = `test-${method}-${sizeMB}MB-${Date.now()}`
      
      // 성능 모니터링 시작
      performanceMonitor.startMonitoring(sessionId, file.size)
      
      const startTime = performance.now()
      
      // 처리 실행
      const result = await adaptiveProcessor.processFile(file, {
        forceMethod: method,
        progressCallback: (progress, stage) => {
          console.log(`진행률: ${progress.toFixed(1)}% - ${stage}`)
        }
      })
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      // 성능 메트릭 수집
      const metrics = performanceMonitor.endMonitoring(
        method,
        result.metadata.performance.cellsPerSecond * (duration / 1000),
        result.metadata.performance.formulasPerSecond * (duration / 1000),
        result.errors.length
      )
      
      const testResult = {
        method,
        fileSize: `${sizeMB}MB`,
        duration: `${(duration / 1000).toFixed(2)}초`,
        cellsPerSecond: metrics?.cellsPerSecond.toFixed(0) || '0',
        formulasPerSecond: metrics?.formulasPerSecond.toFixed(0) || '0',
        memoryUsed: `${((metrics?.memoryUsed || 0) / 1024 / 1024).toFixed(2)}MB`,
        errors: result.errors.length,
        optimizations: result.metadata.performance.optimizationApplied
      }
      
      setResults(testResult)
      
    } catch (err: any) {
      setError(err.message || '테스트 실행 중 오류 발생')
      console.error('테스트 오류:', err)
    } finally {
      setLoading(false)
    }
  }

  const runBenchmark = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'quick' })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setResults({ 
          type: 'benchmark', 
          message: '벤치마크 완료! 콘솔에서 상세 결과를 확인하세요.' 
        })
      } else {
        setError(data.error || '벤치마크 실행 실패')
      }
    } catch (err: any) {
      setError(err.message || '벤치마크 요청 실패')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">HyperFormula 통합 테스트</h1>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>개별 테스트</CardTitle>
            <CardDescription>
              특정 처리 방식과 파일 크기로 테스트를 실행합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">ExcelJS (기존)</h3>
                <div className="space-y-2">
                  <Button 
                    onClick={() => runTest('exceljs', 1)} 
                    disabled={loading}
                    variant="outline"
                  >
                    1MB 테스트
                  </Button>
                  <Button 
                    onClick={() => runTest('exceljs', 10)} 
                    disabled={loading}
                    variant="outline"
                  >
                    10MB 테스트
                  </Button>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">HyperFormula (신규)</h3>
                <div className="space-y-2">
                  <Button 
                    onClick={() => runTest('hyperformula', 1)} 
                    disabled={loading}
                  >
                    1MB 테스트
                  </Button>
                  <Button 
                    onClick={() => runTest('hyperformula', 10)} 
                    disabled={loading}
                  >
                    10MB 테스트
                  </Button>
                  <Button 
                    onClick={() => runTest('hyperformula', 100)} 
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    100MB 테스트 (Rails 목표)
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>전체 벤치마크</CardTitle>
            <CardDescription>
              모든 방식과 크기를 자동으로 테스트합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={runBenchmark} 
              disabled={loading}
              className="w-full"
            >
              벤치마크 실행
            </Button>
          </CardContent>
        </Card>

        {loading && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                <span>테스트 실행 중...</span>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="border-red-500">
            <CardContent className="pt-6">
              <p className="text-red-600">오류: {error}</p>
            </CardContent>
          </Card>
        )}

        {results && (
          <Card className="border-green-500">
            <CardHeader>
              <CardTitle>테스트 결과</CardTitle>
            </CardHeader>
            <CardContent>
              {results.type === 'benchmark' ? (
                <p>{results.message}</p>
              ) : (
                <div className="space-y-2">
                  <p><strong>처리 방식:</strong> {results.method}</p>
                  <p><strong>파일 크기:</strong> {results.fileSize}</p>
                  <p><strong>처리 시간:</strong> {results.duration}</p>
                  <p><strong>셀/초:</strong> {results.cellsPerSecond}</p>
                  <p><strong>수식/초:</strong> {results.formulasPerSecond}</p>
                  <p><strong>메모리 사용:</strong> {results.memoryUsed}</p>
                  <p><strong>오류 수:</strong> {results.errors}</p>
                  <p><strong>최적화:</strong> {results.optimizations?.join(', ')}</p>
                  
                  {results.method === 'hyperformula' && results.fileSize === '100MB' && (
                    <div className="mt-4 p-4 bg-blue-50 rounded">
                      <p className="font-semibold">
                        Rails 성능 목표: {parseFloat(results.duration) <= 7 ? '✅ 달성!' : '❌ 미달성'}
                      </p>
                      <p className="text-sm text-gray-600">
                        목표: 5-7초, 현재: {results.duration}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="bg-gray-50">
          <CardHeader>
            <CardTitle>참고사항</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>테스트는 시뮬레이션된 데이터를 사용합니다</li>
              <li>실제 Excel 파일의 경우 결과가 다를 수 있습니다</li>
              <li>브라우저 콘솔에서 상세한 로그를 확인할 수 있습니다</li>
              <li>100MB 테스트는 Rails 성능 목표(5-7초)를 기준으로 평가됩니다</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}