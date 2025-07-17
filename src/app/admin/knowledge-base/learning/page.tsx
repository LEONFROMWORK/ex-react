"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Brain, 
  TrendingUp, 
  Settings, 
  PlayCircle,
  StopCircle,
  RotateCcw,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronRight,
  Database,
  Zap,
  Target,
  Activity,
  LineChart
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface LearningStats {
  totalTrainingData: number
  lastTrainingDate: string
  modelVersion: string
  accuracy: number
  avgResponseTime: number
  userSatisfaction: number
  knowledgeGaps: string[]
}

interface TrainingJob {
  id: string
  type: 'full_retrain' | 'incremental' | 'fine_tune'
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number
  startedAt: string
  completedAt?: string
  datasetSize: number
  estimatedTime: number
  error?: string
  metrics?: {
    accuracy: number
    loss: number
    learningRate: number
  }
}

interface ModelMetrics {
  accuracy: number
  precision: number
  recall: number
  f1Score: number
  perplexity: number
  bleuScore: number
}

export default function AILearningManagementPage() {
  const [stats, setStats] = useState<LearningStats | null>(null)
  const [activeJobs, setActiveJobs] = useState<TrainingJob[]>([])
  const [recentJobs, setRecentJobs] = useState<TrainingJob[]>([])
  const [modelMetrics, setModelMetrics] = useState<ModelMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLearningStats()
    fetchTrainingJobs()
    fetchModelMetrics()
    
    // 실시간 업데이트를 위한 폴링
    const interval = setInterval(() => {
      fetchTrainingJobs()
      fetchModelMetrics()
    }, 10000)
    
    return () => clearInterval(interval)
  }, [])

  const fetchLearningStats = async () => {
    try {
      const response = await fetch('/api/admin/ai-learning/stats')
      const data = await response.json()
      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('학습 통계 로드 실패:', error)
    }
  }

  const fetchTrainingJobs = async () => {
    try {
      const response = await fetch('/api/admin/ai-learning/jobs')
      const data = await response.json()
      if (data.success) {
        setActiveJobs(data.activeJobs)
        setRecentJobs(data.recentJobs)
      }
    } catch (error) {
      console.error('훈련 작업 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchModelMetrics = async () => {
    try {
      const response = await fetch('/api/admin/ai-learning/metrics')
      const data = await response.json()
      if (data.success) {
        setModelMetrics(data.metrics)
      }
    } catch (error) {
      console.error('모델 메트릭 로드 실패:', error)
    }
  }

  const startTraining = async (type: string) => {
    try {
      const response = await fetch('/api/admin/ai-learning/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      })
      
      const data = await response.json()
      if (data.success) {
        toast.success('AI 학습이 시작되었습니다')
        fetchTrainingJobs()
      } else {
        toast.error('학습 시작 실패: ' + data.error)
      }
    } catch (error) {
      toast.error('학습 시작 중 오류 발생')
    }
  }

  const stopTraining = async (jobId: string) => {
    try {
      const response = await fetch(`/api/admin/ai-learning/jobs/${jobId}/stop`, {
        method: 'POST'
      })
      
      const data = await response.json()
      if (data.success) {
        toast.success('학습이 중단되었습니다')
        fetchTrainingJobs()
      } else {
        toast.error('학습 중단 실패: ' + data.error)
      }
    } catch (error) {
      toast.error('학습 중단 중 오류 발생')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'running':
        return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />
      case 'cancelled':
        return <StopCircle className="h-4 w-4 text-gray-500" />
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '대기 중'
      case 'running': return '실행 중'
      case 'completed': return '완료'
      case 'failed': return '실패'
      case 'cancelled': return '취소됨'
      default: return '알 수 없음'
    }
  }

  const getTrainingTypeText = (type: string) => {
    switch (type) {
      case 'full_retrain': return '전체 재훈련'
      case 'incremental': return '증분 학습'
      case 'fine_tune': return '파인튜닝'
      default: return type
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Brain className="h-8 w-8 animate-pulse mx-auto mb-2" />
          <p>AI 학습 데이터 로딩 중...</p>
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
            <span>AI 학습 관리</span>
          </div>
          <h1 className="text-3xl font-bold">AI 학습 관리</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            AI 모델의 학습 상태를 모니터링하고 성능을 최적화하세요
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={() => startTraining('incremental')}
            disabled={activeJobs.length > 0}
          >
            <PlayCircle className="mr-2 h-4 w-4" />
            증분 학습 시작
          </Button>
          <Button 
            variant="outline"
            onClick={() => startTraining('full_retrain')}
            disabled={activeJobs.length > 0}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            전체 재훈련
          </Button>
        </div>
      </div>

      {/* 주요 통계 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">학습 데이터</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalTrainingData.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">총 Q&A 항목</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">모델 정확도</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.accuracy.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">현재 모델 성능</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">응답 시간</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.avgResponseTime}ms</div>
            <p className="text-xs text-muted-foreground">평균 응답 시간</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">사용자 만족도</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.userSatisfaction.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">긍정적 피드백</p>
          </CardContent>
        </Card>
      </div>

      {/* 탭 컨텐츠 */}
      <Tabs defaultValue="training" className="space-y-4">
        <TabsList>
          <TabsTrigger value="training">학습 작업</TabsTrigger>
          <TabsTrigger value="metrics">성능 메트릭</TabsTrigger>
          <TabsTrigger value="analysis">분석 및 개선</TabsTrigger>
          <TabsTrigger value="settings">설정</TabsTrigger>
        </TabsList>

        {/* 학습 작업 탭 */}
        <TabsContent value="training" className="space-y-4">
          {/* 진행 중인 작업 */}
          {activeJobs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>진행 중인 학습 작업</CardTitle>
                <CardDescription>현재 실행 중인 AI 학습 작업들</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeJobs.map((job) => (
                    <div key={job.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(job.status)}
                          <span className="font-medium">{getTrainingTypeText(job.type)}</span>
                          <Badge variant="secondary">{getStatusText(job.status)}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">
                            {new Date(job.startedAt).toLocaleString()}
                          </span>
                          {job.status === 'running' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => stopTraining(job.id)}
                            >
                              <StopCircle className="h-4 w-4 mr-1" />
                              중단
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>데이터셋: {job.datasetSize.toLocaleString()}개</span>
                          <span>{job.progress}% 완료</span>
                        </div>
                        <Progress value={job.progress} className="h-2" />
                        
                        {job.metrics && (
                          <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t text-sm">
                            <div>정확도: {job.metrics.accuracy.toFixed(2)}%</div>
                            <div>손실: {job.metrics.loss.toFixed(4)}</div>
                            <div>학습률: {job.metrics.learningRate}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 최근 작업 이력 */}
          <Card>
            <CardHeader>
              <CardTitle>최근 학습 이력</CardTitle>
              <CardDescription>지난 학습 작업들의 결과</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentJobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(job.status)}
                      <div>
                        <div className="font-medium">{getTrainingTypeText(job.type)}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(job.startedAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={job.status === 'completed' ? 'default' : 
                                   job.status === 'failed' ? 'destructive' : 'secondary'}>
                        {getStatusText(job.status)}
                      </Badge>
                      {job.status === 'completed' && job.metrics && (
                        <div className="text-sm text-gray-500 mt-1">
                          정확도: {job.metrics.accuracy.toFixed(1)}%
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 성능 메트릭 탭 */}
        <TabsContent value="metrics" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  모델 성능 지표
                </CardTitle>
              </CardHeader>
              <CardContent>
                {modelMetrics && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                        <div className="text-2xl font-bold text-blue-600">{modelMetrics.accuracy.toFixed(1)}%</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">정확도</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded">
                        <div className="text-2xl font-bold text-green-600">{modelMetrics.precision.toFixed(1)}%</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">정밀도</div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded">
                        <div className="text-2xl font-bold text-purple-600">{modelMetrics.recall.toFixed(1)}%</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">재현율</div>
                      </div>
                      <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded">
                        <div className="text-2xl font-bold text-orange-600">{modelMetrics.f1Score.toFixed(1)}%</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">F1 점수</div>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t">
                      <h4 className="font-medium mb-2">고급 메트릭</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Perplexity:</span>
                          <span className="font-mono">{modelMetrics.perplexity.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>BLEU Score:</span>
                          <span className="font-mono">{modelMetrics.bleuScore.toFixed(3)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5" />
                  성능 트렌드
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center p-6 border-2 border-dashed rounded-lg">
                    <BarChart3 className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-500">성능 차트 영역</p>
                    <p className="text-sm text-gray-400">Chart.js 또는 Recharts 라이브러리로 구현 예정</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 분석 및 개선 탭 */}
        <TabsContent value="analysis" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  지식 격차 분석
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats?.knowledgeGaps && stats.knowledgeGaps.length > 0 ? (
                  <div className="space-y-2">
                    {stats.knowledgeGaps.map((gap, index) => (
                      <div key={index} className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border-l-4 border-yellow-400">
                        <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                          {gap}
                        </div>
                      </div>
                    ))}
                    <Button className="w-full mt-4" variant="outline">
                      <Target className="mr-2 h-4 w-4" />
                      개선 계획 수립
                    </Button>
                  </div>
                ) : (
                  <div className="text-center p-6">
                    <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-2" />
                    <p className="text-green-600">식별된 지식 격차가 없습니다</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>학습 권장사항</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                    <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                      데이터 보강 필요
                    </h4>
                    <p className="text-sm text-blue-600 dark:text-blue-300">
                      VBA 관련 질문의 정확도가 다른 카테고리보다 낮습니다
                    </p>
                  </div>
                  
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded">
                    <h4 className="font-medium text-green-800 dark:text-green-200 mb-1">
                      성능 최적화
                    </h4>
                    <p className="text-sm text-green-600 dark:text-green-300">
                      응답 시간이 목표치를 달성했습니다
                    </p>
                  </div>
                  
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded">
                    <h4 className="font-medium text-purple-800 dark:text-purple-200 mb-1">
                      모델 업데이트
                    </h4>
                    <p className="text-sm text-purple-600 dark:text-purple-300">
                      주간 증분 학습 스케줄 권장
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 설정 탭 */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                AI 학습 설정
              </CardTitle>
              <CardDescription>
                AI 모델의 학습 파라미터와 스케줄을 관리합니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center p-8 border-2 border-dashed rounded-lg">
                <Settings className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500">AI 학습 설정 패널</p>
                <p className="text-sm text-gray-400">학습률, 배치 크기, 스케줄 등의 설정 구현 예정</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}