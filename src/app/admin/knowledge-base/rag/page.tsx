"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Search,
  Database,
  Zap,
  Settings,
  BarChart3,
  ChevronRight,
  RefreshCw,
  Eye,
  Filter,
  Trash2,
  Download,
  Upload,
  Activity,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Target,
  Layers,
  GitBranch,
  Cpu,
  HardDrive
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface RAGStats {
  totalVectors: number
  vectorDimensions: number
  indexSize: string
  searchLatency: number
  retrievalAccuracy: number
  lastSync: string
  embeddingModel: string
  vectorStore: string
}

interface SearchMetrics {
  totalQueries: number
  avgResponseTime: number
  successRate: number
  topCategories: { [key: string]: number }
  popularQueries: string[]
}

interface VectorIndex {
  id: string
  name: string
  type: string
  documents: number
  size: string
  lastUpdated: string
  status: 'healthy' | 'degraded' | 'error'
  accuracy: number
}

interface EmbeddingJob {
  id: string
  type: 'full_reindex' | 'incremental' | 'cleanup'
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  documentsProcessed: number
  totalDocuments: number
  startedAt: string
  completedAt?: string
  error?: string
}

export default function RAGManagementPage() {
  const [ragStats, setRAGStats] = useState<RAGStats | null>(null)
  const [searchMetrics, setSearchMetrics] = useState<SearchMetrics | null>(null)
  const [vectorIndices, setVectorIndices] = useState<VectorIndex[]>([])
  const [embeddingJobs, setEmbeddingJobs] = useState<EmbeddingJob[]>([])
  const [testQuery, setTestQuery] = useState("")
  const [testResults, setTestResults] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRAGStats()
    fetchSearchMetrics()
    fetchVectorIndices()
    fetchEmbeddingJobs()
    
    // 실시간 업데이트를 위한 폴링
    const interval = setInterval(() => {
      fetchRAGStats()
      fetchSearchMetrics()
      fetchEmbeddingJobs()
    }, 15000)
    
    return () => clearInterval(interval)
  }, [])

  const fetchRAGStats = async () => {
    try {
      const response = await fetch('/api/admin/rag/stats')
      const data = await response.json()
      if (data.success) {
        setRAGStats(data.stats)
      }
    } catch (error) {
      console.error('RAG 통계 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSearchMetrics = async () => {
    try {
      const response = await fetch('/api/admin/rag/metrics')
      const data = await response.json()
      if (data.success) {
        setSearchMetrics(data.metrics)
      }
    } catch (error) {
      console.error('검색 메트릭 로드 실패:', error)
    }
  }

  const fetchVectorIndices = async () => {
    try {
      const response = await fetch('/api/admin/rag/indices')
      const data = await response.json()
      if (data.success) {
        setVectorIndices(data.indices)
      }
    } catch (error) {
      console.error('벡터 인덱스 로드 실패:', error)
    }
  }

  const fetchEmbeddingJobs = async () => {
    try {
      const response = await fetch('/api/admin/rag/embedding-jobs')
      const data = await response.json()
      if (data.success) {
        setEmbeddingJobs(data.jobs)
      }
    } catch (error) {
      console.error('임베딩 작업 로드 실패:', error)
    }
  }

  const startEmbeddingJob = async (type: string) => {
    try {
      const response = await fetch('/api/admin/rag/embedding-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      })
      
      const data = await response.json()
      if (data.success) {
        toast.success('임베딩 작업이 시작되었습니다')
        fetchEmbeddingJobs()
      } else {
        toast.error('임베딩 작업 시작 실패: ' + data.error)
      }
    } catch (error) {
      toast.error('임베딩 작업 시작 중 오류 발생')
    }
  }

  const testRAGSearch = async () => {
    if (!testQuery.trim()) {
      toast.error('검색 쿼리를 입력해주세요')
      return
    }

    try {
      const response = await fetch('/api/admin/rag/test-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: testQuery })
      })
      
      const data = await response.json()
      if (data.success) {
        setTestResults(data.results)
        toast.success('검색 테스트 완료')
      } else {
        toast.error('검색 테스트 실패: ' + data.error)
      }
    } catch (error) {
      toast.error('검색 테스트 중 오류 발생')
    }
  }

  const optimizeIndex = async (indexId: string) => {
    try {
      const response = await fetch(`/api/admin/rag/indices/${indexId}/optimize`, {
        method: 'POST'
      })
      
      const data = await response.json()
      if (data.success) {
        toast.success('인덱스 최적화가 시작되었습니다')
        fetchVectorIndices()
      } else {
        toast.error('인덱스 최적화 실패: ' + data.error)
      }
    } catch (error) {
      toast.error('인덱스 최적화 중 오류 발생')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'running':
        return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'healthy': return '정상'
      case 'degraded': return '저하됨'
      case 'error': return '오류'
      case 'pending': return '대기중'
      case 'running': return '실행중'
      case 'completed': return '완료'
      case 'failed': return '실패'
      default: return status
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Search className="h-8 w-8 animate-pulse mx-auto mb-2" />
          <p>RAG 시스템 데이터 로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
            <Link href="/admin" className="hover:text-gray-900 dark:hover:text-gray-100">
              관리자
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link href="/admin/knowledge-base" className="hover:text-gray-900 dark:hover:text-gray-100">
              지식 베이스 관리
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span>RAG 시스템 관리</span>
          </div>
          <h1 className="text-3xl font-bold">RAG 시스템 관리</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            벡터 데이터베이스와 검색 성능을 모니터링하고 최적화하세요
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={() => startEmbeddingJob('incremental')}
            disabled={embeddingJobs.some(job => ['pending', 'running'].includes(job.status))}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            증분 재색인
          </Button>
          <Button 
            variant="outline"
            onClick={() => startEmbeddingJob('full_reindex')}
            disabled={embeddingJobs.some(job => ['pending', 'running'].includes(job.status))}
          >
            <Database className="mr-2 h-4 w-4" />
            전체 재색인
          </Button>
        </div>
      </div>

      {/* 주요 통계 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 벡터 수</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ragStats?.totalVectors.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              {ragStats?.vectorDimensions}차원 벡터
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">검색 지연시간</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ragStats?.searchLatency}ms</div>
            <p className="text-xs text-muted-foreground">평균 응답 시간</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">검색 정확도</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ragStats?.retrievalAccuracy}%</div>
            <p className="text-xs text-muted-foreground">검색 결과 정확도</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">인덱스 크기</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ragStats?.indexSize}</div>
            <p className="text-xs text-muted-foreground">
              {ragStats?.vectorStore} 스토어
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 탭 컨텐츠 */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="indices">벡터 인덱스</TabsTrigger>
          <TabsTrigger value="search">검색 테스트</TabsTrigger>
          <TabsTrigger value="jobs">임베딩 작업</TabsTrigger>
          <TabsTrigger value="settings">설정</TabsTrigger>
        </TabsList>

        {/* 개요 탭 */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  검색 성능 메트릭
                </CardTitle>
              </CardHeader>
              <CardContent>
                {searchMetrics && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                        <div className="text-2xl font-bold text-blue-600">{searchMetrics.totalQueries.toLocaleString()}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">총 쿼리 수</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded">
                        <div className="text-2xl font-bold text-green-600">{searchMetrics.avgResponseTime}ms</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">평균 응답 시간</div>
                      </div>
                    </div>
                    
                    <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded">
                      <div className="text-2xl font-bold text-purple-600">{searchMetrics.successRate}%</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">성공률</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  인기 검색 카테고리
                </CardTitle>
              </CardHeader>
              <CardContent>
                {searchMetrics?.topCategories && (
                  <div className="space-y-3">
                    {Object.entries(searchMetrics.topCategories)
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 5)
                      .map(([category, count]) => (
                      <div key={category} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{category}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${(count / Math.max(...Object.values(searchMetrics.topCategories))) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-500">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 시스템 상태 */}
          <Card>
            <CardHeader>
              <CardTitle>시스템 상태</CardTitle>
              <CardDescription>RAG 파이프라인의 전반적인 상태</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 border rounded">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                  <div>
                    <div className="font-medium">벡터 저장소</div>
                    <div className="text-sm text-gray-500">정상 작동</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 border rounded">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                  <div>
                    <div className="font-medium">임베딩 모델</div>
                    <div className="text-sm text-gray-500">{ragStats?.embeddingModel}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 border rounded">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                  <div>
                    <div className="font-medium">검색 엔진</div>
                    <div className="text-sm text-gray-500">최적화됨</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 벡터 인덱스 탭 */}
        <TabsContent value="indices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>벡터 인덱스 관리</CardTitle>
              <CardDescription>현재 운영 중인 벡터 인덱스들의 상태</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {vectorIndices.map((index) => (
                  <div key={index.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(index.status)}
                        <div>
                          <div className="font-medium">{index.name}</div>
                          <div className="text-sm text-gray-500">{index.type} • {index.documents.toLocaleString()} 문서</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={index.status === 'healthy' ? 'default' : 'destructive'}>
                          {getStatusText(index.status)}
                        </Badge>
                        <Button size="sm" variant="outline" onClick={() => optimizeIndex(index.id)}>
                          <Settings className="h-4 w-4 mr-1" />
                          최적화
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">크기:</span>
                        <span className="ml-1 font-medium">{index.size}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">정확도:</span>
                        <span className="ml-1 font-medium">{index.accuracy}%</span>
                      </div>
                      <div>
                        <span className="text-gray-500">마지막 업데이트:</span>
                        <span className="ml-1 font-medium">{new Date(index.lastUpdated).toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">상태:</span>
                        <span className="ml-1 font-medium">{getStatusText(index.status)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 검색 테스트 탭 */}
        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                RAG 검색 테스트
              </CardTitle>
              <CardDescription>
                실제 RAG 파이프라인을 테스트하여 검색 품질을 확인하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Excel 관련 질문을 입력하세요 (예: VLOOKUP 함수 오류 해결법)"
                    value={testQuery}
                    onChange={(e) => setTestQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && testRAGSearch()}
                    className="flex-1"
                  />
                  <Button onClick={testRAGSearch}>
                    <Search className="mr-2 h-4 w-4" />
                    검색 테스트
                  </Button>
                </div>

                {testResults && (
                  <div className="space-y-4">
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3">검색 결과</h4>
                      <div className="space-y-3">
                        {testResults.documents?.map((doc: any, index: number) => (
                          <div key={index} className="p-3 border rounded bg-gray-50 dark:bg-gray-800">
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-medium">문서 #{index + 1}</div>
                              <Badge variant="outline">
                                유사도: {(doc.similarity * 100).toFixed(1)}%
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              <strong>질문:</strong> {doc.question}
                            </div>
                            <div className="text-sm">
                              <strong>답변:</strong> {doc.answer.substring(0, 200)}...
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3">생성된 답변</h4>
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded">
                        <div className="text-sm">
                          {testResults.generatedAnswer || "답변 생성 중..."}
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3">성능 메트릭</h4>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">검색 시간:</span>
                          <span className="ml-1 font-medium">{testResults.metrics?.searchTime}ms</span>
                        </div>
                        <div>
                          <span className="text-gray-500">생성 시간:</span>
                          <span className="ml-1 font-medium">{testResults.metrics?.generationTime}ms</span>
                        </div>
                        <div>
                          <span className="text-gray-500">총 시간:</span>
                          <span className="ml-1 font-medium">{testResults.metrics?.totalTime}ms</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 임베딩 작업 탭 */}
        <TabsContent value="jobs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>임베딩 작업 관리</CardTitle>
              <CardDescription>벡터 생성 및 인덱싱 작업들</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {embeddingJobs.map((job) => (
                  <div key={job.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(job.status)}
                        <span className="font-medium">
                          {job.type === 'full_reindex' ? '전체 재색인' :
                           job.type === 'incremental' ? '증분 색인' : '정리 작업'}
                        </span>
                        <Badge variant={job.status === 'completed' ? 'default' : 
                                       job.status === 'failed' ? 'destructive' : 'secondary'}>
                          {getStatusText(job.status)}
                        </Badge>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(job.startedAt).toLocaleString()}
                      </span>
                    </div>
                    
                    {job.status === 'running' && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{job.documentsProcessed} / {job.totalDocuments} 문서</span>
                          <span>{job.progress}%</span>
                        </div>
                        <Progress value={job.progress} className="h-2" />
                      </div>
                    )}
                    
                    {job.error && (
                      <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-600 dark:text-red-400">
                        {job.error}
                      </div>
                    )}
                  </div>
                ))}

                {embeddingJobs.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    진행 중인 임베딩 작업이 없습니다
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 설정 탭 */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                RAG 시스템 설정
              </CardTitle>
              <CardDescription>
                벡터 검색과 임베딩 모델 설정을 관리합니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center p-8 border-2 border-dashed rounded-lg">
                <Settings className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500">RAG 시스템 설정 패널</p>
                <p className="text-sm text-gray-400">임베딩 모델, 검색 파라미터, 벡터 차원 등의 설정 구현 예정</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}