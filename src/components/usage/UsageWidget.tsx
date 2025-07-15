"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Activity, 
  BarChart3, 
  FileText, 
  MessageSquare, 
  TrendingUp,
  AlertCircle 
} from "lucide-react"
import Link from "next/link"

interface UsageData {
  summary: {
    totalUsage: number
    tokensConsumed: number
    tokensRemaining: number
    mostUsedFeature: string
    averageDailyUsage: number
  }
  breakdown: Array<{
    feature: string
    count: number
    tokensUsed: number
    percentage: number
  }>
  subscription: {
    plan: string
    tokensRemaining: number
    monthlyTokens: number
    renewalDate: string | null
  }
}

const FEATURE_ICONS = {
  excel_analysis: FileText,
  ai_chat: MessageSquare,
  file_optimization: Activity,
  report_generation: BarChart3,
}

const FEATURE_NAMES = {
  excel_analysis: "엑셀 분석",
  ai_chat: "AI 채팅",
  file_optimization: "파일 최적화",
  report_generation: "리포트 생성",
}

export function UsageWidget() {
  const [loading, setLoading] = useState(true)
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchUsageData()
  }, [])

  const fetchUsageData = async () => {
    try {
      const response = await fetch("/api/usage/report?period=monthly")
      if (!response.ok) {
        throw new Error("Failed to fetch usage data")
      }
      const data = await response.json()
      setUsageData(data)
    } catch (err) {
      setError("사용량 데이터를 불러올 수 없습니다.")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    )
  }

  if (error || !usageData) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  const tokenUsagePercentage = Math.round(
    ((usageData.subscription.monthlyTokens - usageData.subscription.tokensRemaining) / 
     usageData.subscription.monthlyTokens) * 100
  )

  const isLowOnTokens = tokenUsagePercentage > 80

  return (
    <div className="space-y-6">
      {/* Token Usage Overview */}
      <Card>
        <CardHeader>
          <CardTitle>토큰 사용량</CardTitle>
          <CardDescription>
            이번 달 토큰 사용 현황
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>
                  {usageData.subscription.tokensRemaining.toLocaleString()} / {usageData.subscription.monthlyTokens.toLocaleString()} 토큰 남음
                </span>
                <span>{tokenUsagePercentage}%</span>
              </div>
              <Progress value={tokenUsagePercentage} className="h-3" />
            </div>

            {isLowOnTokens && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  토큰이 얼마 남지 않았습니다. 추가 토큰 구매를 고려해보세요.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{usageData.summary.averageDailyUsage}</p>
                <p className="text-sm text-muted-foreground">일 평균 사용량</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{usageData.summary.totalUsage}</p>
                <p className="text-sm text-muted-foreground">이번 달 총 사용량</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>기능별 사용량</CardTitle>
          <CardDescription>
            각 기능의 사용 비율
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {usageData.breakdown.map((item) => {
              const Icon = FEATURE_ICONS[item.feature as keyof typeof FEATURE_ICONS] || Activity
              const name = FEATURE_NAMES[item.feature as keyof typeof FEATURE_NAMES] || item.feature

              return (
                <div key={item.feature} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{name}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {item.count}회 ({item.percentage}%)
                    </div>
                  </div>
                  <Progress value={item.percentage} className="h-2" />
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button asChild className="flex-1">
          <Link href="/pricing">
            <TrendingUp className="mr-2 h-4 w-4" />
            플랜 업그레이드
          </Link>
        </Button>
        <Button asChild variant="outline" className="flex-1">
          <Link href="/usage/details">
            상세 사용량 보기
          </Link>
        </Button>
      </div>
    </div>
  )
}