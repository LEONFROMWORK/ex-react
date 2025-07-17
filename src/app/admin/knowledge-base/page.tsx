"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Upload, 
  Database, 
  FileText, 
  BarChart3, 
  Settings,
  Plus,
  ChevronRight,
  Info,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Brain,
  Search
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface KnowledgeBaseStats {
  totalDocuments: number
  totalEmbeddings: number
  categories: { [key: string]: number }
  sources: { [key: string]: number }
  sourceQuality: { [key: string]: number }
  lastUpdated: string
  processingJobs: number
}

interface ProcessingJob {
  id: string
  type: 'upload' | 'embedding' | 'processing'
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  totalItems: number
  processedItems: number
  createdAt: string
  completedAt?: string
  error?: string
}

export default function KnowledgeBasePage() {
  const [stats, setStats] = useState<KnowledgeBaseStats | null>(null)
  const [processingJobs, setProcessingJobs] = useState<ProcessingJob[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
    fetchProcessingJobs()
    
    // 5초마다 진행 상황 업데이트
    const interval = setInterval(() => {
      fetchProcessingJobs()
    }, 5000)
    
    return () => clearInterval(interval)
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/knowledge-base/stats')
      const data = await response.json()
      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('통계 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProcessingJobs = async () => {
    try {
      const response = await fetch('/api/admin/knowledge-base/jobs')
      const data = await response.json()
      if (data.success) {
        setProcessingJobs(data.jobs)
      }
    } catch (error) {
      console.error('작업 상태 로드 실패:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '완료'
      case 'failed':
        return '실패'
      case 'running':
        return '진행중'
      default:
        return '대기중'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>통계 로딩 중...</p>
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
            <span>지식 베이스 관리</span>
          </div>
          <h1 className="text-3xl font-bold">지식 베이스 관리</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Excel Q&A 데이터를 관리하고 AI 학습을 위한 지식 베이스를 구축하세요
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/admin/knowledge-base/upload">
              <Plus className="mr-2 h-4 w-4" />
              데이터 업로드
            </Link>
          </Button>
        </div>
      </div>

      {/* 통계 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 문서 수</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalDocuments.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              Excel Q&A 데이터
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">임베딩 수</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalEmbeddings.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              벡터 데이터베이스
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">처리 중인 작업</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.processingJobs || 0}</div>
            <p className="text-xs text-muted-foreground">
              진행 중인 작업
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">마지막 업데이트</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">
              {stats?.lastUpdated ? new Date(stats.lastUpdated).toLocaleString() : '없음'}
            </div>
            <p className="text-xs text-muted-foreground">
              최근 업데이트
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 카테고리 분포 */}
      {stats?.categories && Object.keys(stats.categories).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>카테고리별 문서 분포</CardTitle>
            <CardDescription>
              Excel 도움말 주제별 데이터 분포
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(stats.categories).map(([category, count]) => (
                <div key={category} className="text-center">
                  <div className="text-lg font-semibold">{count.toLocaleString()}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{category}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 데이터 소스별 통계 */}
      {stats?.sources && Object.keys(stats.sources).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>데이터 소스별 분포</CardTitle>
            <CardDescription>
              Stack Overflow, Reddit, 수동 입력 등 소스별 데이터 현황
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Object.entries(stats.sources).map(([source, count]) => {
                const sourceLabel = source === 'stackoverflow' ? 'Stack Overflow' : 
                                  source === 'reddit' ? 'Reddit' : 
                                  source === 'manual' ? '수동 입력' : source
                const qualityScore = stats.sourceQuality?.[source] || 0
                const percentage = ((count / stats.totalDocuments) * 100).toFixed(1)
                
                return (
                  <div key={source} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{sourceLabel}</div>
                      <Badge variant="secondary">{percentage}%</Badge>
                    </div>
                    <div className="text-2xl font-bold mb-1">{count.toLocaleString()}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">문서</div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm">품질 점수:</div>
                      <div className="text-sm font-medium">
                        {qualityScore.toFixed(1)}/10
                      </div>
                    </div>
                    <Progress value={qualityScore * 10} className="h-1 mt-1" />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 진행 중인 작업들 */}
      {processingJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>진행 중인 작업</CardTitle>
            <CardDescription>
              데이터 처리 및 임베딩 생성 현황
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {processingJobs.map((job) => (
                <div key={job.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(job.status)}
                      <span className="font-medium">
                        {job.type === 'upload' ? '데이터 업로드' :
                         job.type === 'embedding' ? '임베딩 생성' :
                         '데이터 처리'}
                      </span>
                      <Badge variant={job.status === 'completed' ? 'default' : 
                                   job.status === 'failed' ? 'destructive' : 'secondary'}>
                        {getStatusText(job.status)}
                      </Badge>
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(job.createdAt).toLocaleString()}
                    </span>
                  </div>
                  
                  {job.status === 'running' && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{job.processedItems} / {job.totalItems}</span>
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
            </div>
          </CardContent>
        </Card>
      )}

      {/* 빠른 액션 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/admin/knowledge-base/upload">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                데이터 업로드
              </CardTitle>
              <CardDescription>
                포럼 Q&A 데이터 파일을 업로드하고 처리하세요
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/admin/knowledge-base/learning">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI 학습 관리
              </CardTitle>
              <CardDescription>
                AI 모델의 학습 상태를 모니터링하고 관리하세요
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/admin/knowledge-base/rag">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                RAG 시스템 관리
              </CardTitle>
              <CardDescription>
                벡터 검색과 RAG 파이프라인을 관리하세요
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/admin/knowledge-base/settings">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                설정
              </CardTitle>
              <CardDescription>
                임베딩 모델과 처리 설정을 관리하세요
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>
      </div>

      {/* 도움말 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            사용 가이드
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>1. <strong>데이터 업로드</strong>: JSONL 형식의 Q&A 데이터를 업로드하세요</p>
            <p>2. <strong>자동 처리</strong>: 품질 필터링, 임베딩 생성이 자동으로 진행됩니다</p>
            <p>3. <strong>즉시 적용</strong>: 처리 완료 즉시 AI 답변에 반영됩니다</p>
            <p>4. <strong>성능 모니터링</strong>: 답변 품질과 사용자 만족도를 추적하세요</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}