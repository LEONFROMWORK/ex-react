'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Zap,
  Database,
  TrendingUp,
  Activity,
  RefreshCw,
  Play,
  Pause,
  Trash2,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  Flame,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface CacheStats {
  redis: {
    hits: number
    misses: number
    sets: number
    deletes: number
    errors: number
    hitRate: string
  }
  excel: {
    stats: any
    namespaceInfo: {
      totalKeys: number
      totalSize: number
    }
  }
  summary: {
    totalOperations: number
    cacheEfficiency: string
    lastUpdated: Date
  }
}

interface WarmingStatus {
  isRunning: boolean
  stats: {
    totalTasks: number
    completedTasks: number
    failedTasks: number
    averageProcessingTime: number
    lastWarmingAt?: Date
  }
  pendingTasks: number
}

export function CachePerformanceDashboard() {
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null)
  const [warmingStatus, setWarmingStatus] = useState<WarmingStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [historicalData, setHistoricalData] = useState<any[]>([])

  useEffect(() => {
    fetchCacheStats()
    fetchWarmingStatus()
    
    // 30초마다 자동 갱신
    const interval = setInterval(() => {
      fetchCacheStats()
      fetchWarmingStatus()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const fetchCacheStats = async () => {
    try {
      const response = await fetch('/api/admin/cache/stats')
      const data = await response.json()
      
      if (data.success) {
        setCacheStats(data.data)
        updateHistoricalData(data.data)
      }
    } catch (error) {
      console.error('캐시 통계 조회 오류:', error)
      toast.error('캐시 통계를 불러오는데 실패했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchWarmingStatus = async () => {
    try {
      const response = await fetch('/api/admin/cache/warming')
      const data = await response.json()
      
      if (data.success) {
        setWarmingStatus(data.data)
      }
    } catch (error) {
      console.error('워밍 상태 조회 오류:', error)
    }
  }

  const updateHistoricalData = (stats: CacheStats) => {
    setHistoricalData(prev => {
      const newData = [...prev, {
        time: new Date().toLocaleTimeString(),
        hits: stats.redis.hits,
        misses: stats.redis.misses,
        hitRate: parseFloat(stats.redis.hitRate),
      }].slice(-20) // 최근 20개만 유지
      
      return newData
    })
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([fetchCacheStats(), fetchWarmingStatus()])
    setIsRefreshing(false)
    toast.success('캐시 통계가 갱신되었습니다')
  }

  const handleStartWarming = async () => {
    try {
      const response = await fetch('/api/admin/cache/warming', {
        method: 'POST',
      })
      const data = await response.json()
      
      if (data.success) {
        toast.success('캐시 워밍이 시작되었습니다')
        fetchWarmingStatus()
      } else {
        toast.error(data.error || '캐시 워밍 시작에 실패했습니다')
      }
    } catch (error) {
      console.error('캐시 워밍 시작 오류:', error)
      toast.error('캐시 워밍 시작에 실패했습니다')
    }
  }

  const handleResetStats = async () => {
    if (!confirm('정말로 캐시 통계를 초기화하시겠습니까?')) return

    try {
      const response = await fetch('/api/admin/cache/stats', {
        method: 'POST',
      })
      const data = await response.json()
      
      if (data.success) {
        toast.success('캐시 통계가 초기화되었습니다')
        fetchCacheStats()
        setHistoricalData([])
      }
    } catch (error) {
      console.error('캐시 통계 초기화 오류:', error)
      toast.error('캐시 통계 초기화에 실패했습니다')
    }
  }

  const handleClearCache = async (namespace?: string) => {
    const message = namespace 
      ? `'${namespace}' 네임스페이스의 캐시를 비우시겠습니까?`
      : '전체 캐시를 비우시겠습니까? 이 작업은 되돌릴 수 없습니다.'
    
    if (!confirm(message)) return

    try {
      const url = namespace 
        ? `/api/admin/cache/stats?namespace=${namespace}`
        : '/api/admin/cache/stats'
      
      const response = await fetch(url, {
        method: 'DELETE',
      })
      const data = await response.json()
      
      if (data.success) {
        toast.success(data.message)
        fetchCacheStats()
      }
    } catch (error) {
      console.error('캐시 비우기 오류:', error)
      toast.error('캐시 비우기에 실패했습니다')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // 차트 데이터 준비
  const pieData = cacheStats ? [
    { name: 'Hits', value: cacheStats.redis.hits, color: '#22c55e' },
    { name: 'Misses', value: cacheStats.redis.misses, color: '#ef4444' },
  ] : []

  const operationsData = cacheStats ? [
    { name: 'Gets', value: cacheStats.redis.hits + cacheStats.redis.misses },
    { name: 'Sets', value: cacheStats.redis.sets },
    { name: 'Deletes', value: cacheStats.redis.deletes },
    { name: 'Errors', value: cacheStats.redis.errors },
  ] : []

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">캐시 성능 대시보드</h2>
          <p className="text-muted-foreground mt-1">
            Redis 캐시 성능 모니터링 및 관리
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">캐시 적중률</p>
                <p className="text-2xl font-bold text-green-600">
                  {cacheStats?.redis.hitRate || '0%'}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <Progress 
              value={parseFloat(cacheStats?.redis.hitRate || '0')} 
              className="mt-3 h-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">총 작업</p>
                <p className="text-2xl font-bold">
                  {cacheStats?.summary.totalOperations.toLocaleString() || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Hits + Misses + Sets + Deletes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">캐시 키</p>
                <p className="text-2xl font-bold">
                  {cacheStats?.excel.namespaceInfo.totalKeys || 0}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Database className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Excel 분석 네임스페이스
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">오류</p>
                <p className="text-2xl font-bold text-red-600">
                  {cacheStats?.redis.errors || 0}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              캐시 작업 오류 횟수
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 차트 섹션 */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">성능 추이</TabsTrigger>
          <TabsTrigger value="operations">작업 분석</TabsTrigger>
          <TabsTrigger value="warming">캐시 워밍</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>캐시 적중률 추이</CardTitle>
              <CardDescription>시간별 캐시 적중/미적중 현황</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={historicalData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="hitRate" 
                    stroke="#22c55e" 
                    name="적중률 (%)"
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="hits" 
                    stroke="#3b82f6" 
                    name="적중"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="misses" 
                    stroke="#ef4444" 
                    name="미적중"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">캐시 적중/미적중 비율</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">작업별 분포</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={operationsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="operations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>캐시 작업 상세</CardTitle>
              <CardDescription>각 작업별 상세 통계</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">조회 (GET)</p>
                    <p className="text-sm text-muted-foreground">
                      성공: {cacheStats?.redis.hits || 0} / 실패: {cacheStats?.redis.misses || 0}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {((cacheStats?.redis.hits || 0) + (cacheStats?.redis.misses || 0)).toLocaleString()}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">저장 (SET)</p>
                    <p className="text-sm text-muted-foreground">
                      캐시에 데이터 저장
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {cacheStats?.redis.sets.toLocaleString() || 0}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">삭제 (DELETE)</p>
                    <p className="text-sm text-muted-foreground">
                      캐시에서 데이터 제거
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {cacheStats?.redis.deletes.toLocaleString() || 0}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">오류</p>
                    <p className="text-sm text-muted-foreground">
                      캐시 작업 중 발생한 오류
                    </p>
                  </div>
                  <Badge variant={cacheStats?.redis.errors ? 'destructive' : 'secondary'}>
                    {cacheStats?.redis.errors.toLocaleString() || 0}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>캐시 관리</CardTitle>
              <CardDescription>캐시 데이터 관리 작업</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">통계 초기화</p>
                  <p className="text-sm text-muted-foreground">
                    모든 캐시 통계를 초기화합니다
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetStats}
                >
                  초기화
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Excel 캐시 비우기</p>
                  <p className="text-sm text-muted-foreground">
                    Excel 분석 캐시만 삭제합니다
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleClearCache('excel-analysis')}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  비우기
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">전체 캐시 비우기</p>
                  <p className="text-sm text-muted-foreground text-red-600">
                    주의: 모든 캐시 데이터가 삭제됩니다
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleClearCache()}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  전체 비우기
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="warming" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>캐시 워밍</CardTitle>
              <CardDescription>
                자주 사용되는 데이터를 미리 캐시에 로드합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {warmingStatus && (
                <>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {warmingStatus.isRunning ? (
                        <div className="p-2 bg-yellow-100 rounded-full animate-pulse">
                          <Flame className="w-5 h-5 text-yellow-600" />
                        </div>
                      ) : (
                        <div className="p-2 bg-gray-100 rounded-full">
                          <Flame className="w-5 h-5 text-gray-600" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">
                          {warmingStatus.isRunning ? '워밍 진행 중' : '워밍 대기 중'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {warmingStatus.isRunning 
                            ? `${warmingStatus.pendingTasks}개 작업 남음`
                            : '캐시 워밍을 시작하려면 버튼을 클릭하세요'
                          }
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={handleStartWarming}
                      disabled={warmingStatus.isRunning}
                      size="sm"
                    >
                      {warmingStatus.isRunning ? (
                        <>
                          <Pause className="w-4 h-4 mr-2" />
                          진행 중
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          시작
                        </>
                      )}
                    </Button>
                  </div>

                  {warmingStatus.stats.totalTasks > 0 && (
                    <>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>진행률</span>
                          <span>
                            {warmingStatus.stats.completedTasks} / {warmingStatus.stats.totalTasks}
                          </span>
                        </div>
                        <Progress 
                          value={(warmingStatus.stats.completedTasks / warmingStatus.stats.totalTasks) * 100}
                          className="h-2"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 border rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <p className="text-sm font-medium">완료</p>
                          </div>
                          <p className="text-2xl font-bold text-green-600">
                            {warmingStatus.stats.completedTasks}
                          </p>
                        </div>

                        <div className="p-4 border rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="w-4 h-4 text-red-600" />
                            <p className="text-sm font-medium">실패</p>
                          </div>
                          <p className="text-2xl font-bold text-red-600">
                            {warmingStatus.stats.failedTasks}
                          </p>
                        </div>
                      </div>

                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">평균 처리 시간</p>
                            <p className="text-sm text-muted-foreground">작업당 소요 시간</p>
                          </div>
                          <Badge variant="secondary">
                            {warmingStatus.stats.averageProcessingTime.toFixed(0)}ms
                          </Badge>
                        </div>
                      </div>

                      {warmingStatus.stats.lastWarmingAt && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          마지막 워밍: {new Date(warmingStatus.stats.lastWarmingAt).toLocaleString()}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Alert>
            <Zap className="h-4 w-4" />
            <AlertDescription>
              캐시 워밍은 자주 사용되는 Excel 생성 프롬프트와 템플릿을 미리 처리하여 
              사용자 응답 속도를 향상시킵니다. 시스템 부하가 적은 시간에 실행하는 것을 권장합니다.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  )
}