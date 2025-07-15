"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatsCard } from "@/components/admin/StatsCard"
import { AIUsageChart } from "@/components/admin/charts/AIUsageChart"
import { CostAnalysisChart } from "@/components/admin/charts/CostAnalysisChart"
import { Loader2, Brain, DollarSign, TrendingUp, Zap } from "lucide-react"

interface AIStats {
  overview: {
    totalRequests: number
    tier1Requests: number
    tier2Requests: number
    totalTokens: number
    totalCost: number
    savedTokens: number
    savedCost: number
    cacheHitRate: number
  }
  daily: {
    date: string
    tier1: number
    tier2: number
    tokens: number
    cost: number
  }[]
  models: {
    model: string
    requests: number
    tokens: number
    avgTokensPerRequest: number
    cost: number
  }[]
  performance: {
    avgConfidence: number
    tier2TriggerRate: number
    avgResponseTime: number
    errorRate: number
  }
}

export default function AdminAIStatsPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<AIStats | null>(null)
  const [period, setPeriod] = useState("week")

  useEffect(() => {
    fetchAIStats()
  }, [period])

  const fetchAIStats = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/ai-stats?period=${period}`)
      if (!response.ok) {
        throw new Error("Failed to fetch AI stats")
      }
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error("Error fetching AI stats:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">통계를 불러올 수 없습니다</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">AI 사용 통계</h1>
        <Tabs value={period} onValueChange={setPeriod}>
          <TabsList>
            <TabsTrigger value="today">오늘</TabsTrigger>
            <TabsTrigger value="week">1주일</TabsTrigger>
            <TabsTrigger value="month">1개월</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="총 AI 요청"
          value={stats.overview.totalRequests.toLocaleString()}
          icon={Brain}
          description="건"
          trend="neutral"
        />
        <StatsCard
          title="총 토큰 사용"
          value={stats.overview.totalTokens.toLocaleString()}
          icon={Zap}
          description="개"
          trend="neutral"
        />
        <StatsCard
          title="총 비용"
          value={`$${stats.overview.totalCost.toFixed(2)}`}
          icon={DollarSign}
          trend={stats.overview.totalCost > 0 ? "down" : "neutral"}
        />
        <StatsCard
          title="캐시 적중률"
          value={`${(stats.overview.cacheHitRate * 100).toFixed(1)}%`}
          icon={TrendingUp}
          trend={stats.overview.cacheHitRate > 0.5 ? "up" : "down"}
        />
      </div>

      {/* Tier Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>AI 티어 사용 분포</CardTitle>
            <CardDescription>Tier 1 vs Tier 2 사용 비율</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Tier 1 (GPT-3.5)</span>
                  <span className="text-sm text-gray-500">
                    {stats.overview.tier1Requests.toLocaleString()} 요청
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-500 h-3 rounded-full"
                    style={{
                      width: `${(stats.overview.tier1Requests / stats.overview.totalRequests) * 100}%`
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Tier 2 (GPT-4)</span>
                  <span className="text-sm text-gray-500">
                    {stats.overview.tier2Requests.toLocaleString()} 요청
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-purple-500 h-3 rounded-full"
                    style={{
                      width: `${(stats.overview.tier2Requests / stats.overview.totalRequests) * 100}%`
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>비용 절감 효과</CardTitle>
            <CardDescription>캐싱을 통한 비용 절감</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">절약된 토큰</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.overview.savedTokens.toLocaleString()}
                  </p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">절약된 비용</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${stats.overview.savedCost.toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="text-center text-sm text-gray-500">
                캐시 적중률: {(stats.overview.cacheHitRate * 100).toFixed(1)}%
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="usage" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="usage">사용량 추이</TabsTrigger>
          <TabsTrigger value="cost">비용 분석</TabsTrigger>
          <TabsTrigger value="performance">성능 지표</TabsTrigger>
        </TabsList>

        <TabsContent value="usage">
          <Card>
            <CardHeader>
              <CardTitle>일별 AI 사용량</CardTitle>
              <CardDescription>Tier별 요청 수 추이</CardDescription>
            </CardHeader>
            <CardContent>
              <AIUsageChart data={stats.daily} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cost">
          <Card>
            <CardHeader>
              <CardTitle>비용 분석</CardTitle>
              <CardDescription>모델별 비용 분포</CardDescription>
            </CardHeader>
            <CardContent>
              <CostAnalysisChart data={stats.models} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>성능 지표</CardTitle>
              <CardDescription>AI 시스템 성능 메트릭</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">평균 신뢰도</p>
                    <p className="text-2xl font-bold">
                      {(stats.performance.avgConfidence * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tier 2 전환율</p>
                    <p className="text-2xl font-bold">
                      {(stats.performance.tier2TriggerRate * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">평균 응답 시간</p>
                    <p className="text-2xl font-bold">
                      {stats.performance.avgResponseTime.toFixed(2)}초
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">오류율</p>
                    <p className="text-2xl font-bold">
                      {(stats.performance.errorRate * 100).toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}