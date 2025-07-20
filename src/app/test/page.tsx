'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  Loader2,
  FileSpreadsheet,
  Code2,
  Database,
  Zap,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'

interface TestResult {
  name: string
  status: 'pending' | 'running' | 'success' | 'failed'
  message?: string
  duration?: number
}

export default function TestPage() {
  const [isRunning, setIsRunning] = useState(false)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [prompt, setPrompt] = useState('2024년 월별 매출 데이터를 만들어줘. 제품별(A, B, C) 매출액과 전월 대비 성장률을 포함해줘.')
  const [systemInfo, setSystemInfo] = useState<any>(null)

  // 시스템 정보 가져오기
  useEffect(() => {
    fetch('/api/system/info')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSystemInfo(data.data)
        }
      })
      .catch(err => console.error('시스템 정보 로드 실패:', err))
  }, [])

  // 테스트 케이스 정의
  const testCases = [
    {
      name: '서버 연결 확인',
      endpoint: '/api/health',
      method: 'GET',
    },
    {
      name: 'Excel 생성 (AI 프롬프트)',
      endpoint: '/api/excel/generate-from-prompt',
      method: 'POST',
      body: { prompt, options: { includeFormulas: true } },
    },
    {
      name: '템플릿 목록 조회',
      endpoint: '/api/excel/templates',
      method: 'GET',
    },
    {
      name: '캐시 통계 조회',
      endpoint: '/api/admin/cache/stats',
      method: 'GET',
    },
  ]

  const runTests = async () => {
    setIsRunning(true)
    setTestResults([])

    for (const testCase of testCases) {
      const result: TestResult = {
        name: testCase.name,
        status: 'running',
      }

      setTestResults(prev => [...prev, result])

      const startTime = Date.now()

      try {
        const response = await fetch(testCase.endpoint, {
          method: testCase.method,
          headers: {
            'Content-Type': 'application/json',
            // 실제 환경에서는 인증 토큰 필요
          },
          body: testCase.body ? JSON.stringify(testCase.body) : undefined,
        })

        const data = await response.json()
        const duration = Date.now() - startTime

        if (response.ok && (data.success !== false)) {
          result.status = 'success'
          result.message = `응답 시간: ${duration}ms`
          result.duration = duration
        } else {
          result.status = 'failed'
          result.message = data.error || '요청 실패'
        }
      } catch (error) {
        result.status = 'failed'
        result.message = error instanceof Error ? error.message : '알 수 없는 오류'
      }

      setTestResults(prev => 
        prev.map(r => r.name === result.name ? result : r)
      )

      // 테스트 간 딜레이
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    setIsRunning(false)
    toast.success('모든 테스트가 완료되었습니다')
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <AlertCircle className="w-4 h-4 text-gray-400" />
      case 'running':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600'
      case 'failed':
        return 'text-red-600'
      case 'running':
        return 'text-blue-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Excel App 테스트</h1>
        <p className="text-muted-foreground mt-2">
          주요 기능들이 정상적으로 작동하는지 확인합니다
        </p>
      </div>

      <Tabs defaultValue="quick-test" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="quick-test">빠른 테스트</TabsTrigger>
          <TabsTrigger value="manual-test">수동 테스트</TabsTrigger>
          <TabsTrigger value="system-info">시스템 정보</TabsTrigger>
        </TabsList>

        <TabsContent value="quick-test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>자동 테스트 실행</CardTitle>
              <CardDescription>
                주요 API 엔드포인트를 자동으로 테스트합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <Button
                  onClick={runTests}
                  disabled={isRunning}
                  size="lg"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      테스트 실행 중...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      테스트 시작
                    </>
                  )}
                </Button>

                {testResults.length > 0 && (
                  <div className="flex gap-4 text-sm">
                    <span className="text-green-600">
                      성공: {testResults.filter(r => r.status === 'success').length}
                    </span>
                    <span className="text-red-600">
                      실패: {testResults.filter(r => r.status === 'failed').length}
                    </span>
                  </div>
                )}
              </div>

              {testResults.length > 0 && (
                <div className="space-y-2">
                  {testResults.map((result, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(result.status)}
                        <span className="font-medium">{result.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {result.message && (
                          <span className={`text-sm ${getStatusColor(result.status)}`}>
                            {result.message}
                          </span>
                        )}
                        {result.duration && result.duration > 1000 && (
                          <Badge variant="destructive">느림</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual-test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Excel 생성 테스트</CardTitle>
              <CardDescription>
                프롬프트를 입력하여 Excel 생성을 테스트합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Excel 생성 프롬프트를 입력하세요..."
                rows={3}
              />
              <Button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/excel/generate-from-prompt', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ prompt }),
                    })
                    const data = await response.json()
                    
                    if (data.success) {
                      toast.success('Excel 생성 성공!')
                      console.log('생성된 파일:', data.data)
                    } else {
                      toast.error(data.error || 'Excel 생성 실패')
                    }
                  } catch (error) {
                    toast.error('요청 중 오류가 발생했습니다')
                  }
                }}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Excel 생성
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>기능별 테스트 링크</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <a
                href="/excel/dashboard"
                target="_blank"
                className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted transition-colors"
              >
                <FileSpreadsheet className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">Excel 대시보드</p>
                  <p className="text-sm text-muted-foreground">AI 기반 Excel 생성</p>
                </div>
              </a>

              <a
                href="/vba/extract"
                target="_blank"
                className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted transition-colors"
              >
                <Code2 className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">VBA 추출</p>
                  <p className="text-sm text-muted-foreground">VBA 코드 추출 및 분석</p>
                </div>
              </a>

              <a
                href="/admin/cache"
                target="_blank"
                className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted transition-colors"
              >
                <Database className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">캐시 관리</p>
                  <p className="text-sm text-muted-foreground">Redis 캐시 성능 모니터링</p>
                </div>
              </a>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system-info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>시스템 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {systemInfo ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Node.js 버전</p>
                    <p className="font-mono">{systemInfo.nodeVersion}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">환경</p>
                    <p className="font-mono">{systemInfo.env}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">플랫폼</p>
                    <p className="font-mono">{systemInfo.platform}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">메모리 사용량</p>
                    <p className="font-mono">
                      {systemInfo.heapUsed} / {systemInfo.heapTotal} MB
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">시스템 메모리</p>
                    <p className="font-mono">
                      {systemInfo.freeMemory} / {systemInfo.totalMemory} MB
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">CPU 코어</p>
                    <p className="font-mono">{systemInfo.cpus}개</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">시스템 정보 로딩 중...</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Alert>
            <Zap className="h-4 w-4" />
            <AlertDescription>
              모든 기능을 테스트하려면 Redis, PostgreSQL이 
              설치되어 있어야 합니다. start-dev.sh 스크립트를 실행하여 
              환경을 설정하세요.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  )
}