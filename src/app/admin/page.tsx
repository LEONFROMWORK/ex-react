"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatsCard } from "@/components/admin/StatsCard"
import { Loader2, Users, FileText, DollarSign, Activity, Cpu, TrendingUp, AlertCircle } from "lucide-react"
import { GetDashboardStatsResponse } from "@/Features/Admin/Statistics/GetDashboardStats"

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<GetDashboardStatsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardStats()
    // Refresh every 30 seconds
    const interval = setInterval(fetchDashboardStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch("/api/admin/stats")
      if (!response.ok) {
        throw new Error("Failed to fetch stats")
      }
      const data = await response.json()
      setStats(data)
      setError(null)
    } catch (err) {
      setError("통계를 불러오는 중 오류가 발생했습니다")
      console.error("Error fetching stats:", err)
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

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  return (
    <div className="space-y-8">
      {/* Real-time Stats */}
      <div>
        <h2 className="text-xl font-semibold mb-4">실시간 현황</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatsCard
            title="활성 사용자"
            value={stats.realtime.activeUsers}
            icon={Users}
            trend="neutral"
          />
          <StatsCard
            title="처리 중인 파일"
            value={stats.realtime.processingFiles}
            icon={FileText}
            trend="neutral"
          />
          <StatsCard
            title="API 호출"
            value={stats.realtime.apiCalls}
            icon={Activity}
            trend="neutral"
          />
          <StatsCard
            title="Tier 1 AI"
            value={stats.realtime.aiTier1Calls}
            icon={Cpu}
            trend="neutral"
            description="오늘"
          />
          <StatsCard
            title="Tier 2 AI"
            value={stats.realtime.aiTier2Calls}
            icon={Cpu}
            trend="neutral"
            description="오늘"
          />
        </div>
      </div>

      {/* Daily Stats */}
      <div>
        <h2 className="text-xl font-semibold mb-4">일일 통계</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatsCard
            title="신규 가입"
            value={stats.daily.newUsers}
            icon={Users}
            trend={stats.daily.newUsers > 0 ? "up" : "neutral"}
            description="명"
          />
          <StatsCard
            title="매출"
            value={`₩${stats.daily.revenue.toLocaleString()}`}
            icon={DollarSign}
            trend={stats.daily.revenue > 0 ? "up" : "neutral"}
          />
          <StatsCard
            title="처리 완료 파일"
            value={stats.daily.filesProcessed}
            icon={FileText}
            trend="neutral"
            description="개"
          />
          <StatsCard
            title="오류 발생"
            value={stats.daily.errors}
            icon={AlertCircle}
            trend={stats.daily.errors > 0 ? "down" : "neutral"}
            description="건"
          />
          <StatsCard
            title="절약된 토큰"
            value={stats.daily.tokensSaved.toLocaleString()}
            icon={TrendingUp}
            trend={stats.daily.tokensSaved > 0 ? "up" : "neutral"}
            description="개"
          />
          <StatsCard
            title="비용 절감"
            value={`$${stats.daily.aiCostOptimization.toFixed(2)}`}
            icon={DollarSign}
            trend={stats.daily.aiCostOptimization > 0 ? "up" : "neutral"}
          />
        </div>
      </div>

      {/* Summary */}
      <div>
        <h2 className="text-xl font-semibold mb-4">전체 요약</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">총 사용자</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.summary.totalUsers.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">총 파일</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.summary.totalFiles.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">총 매출</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">₩{stats.summary.totalRevenue.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">평균 처리 시간</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {stats.summary.avgProcessingTime > 0 
                  ? `${stats.summary.avgProcessingTime}초`
                  : "N/A"
                }
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}