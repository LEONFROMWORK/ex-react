"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Coins, 
  TrendingUp, 
  TrendingDown, 
  Info,
  Sparkles,
  AlertCircle
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import Link from "next/link"

interface TokenUsageData {
  currentTokens: number
  monthlyLimit: number
  usedThisMonth: number
  savedThisMonth: number
  recentUsage: Array<{
    id: string
    feature: string
    amount: number
    savedAmount?: number
    timestamp: Date
    metadata?: {
      successRate?: number
      partialSuccess?: boolean
      discount?: string
    }
  }>
}

export function TokenUsageWidget() {
  const [usage, setUsage] = useState<TokenUsageData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUsageData()
  }, [])

  const fetchUsageData = async () => {
    try {
      const response = await fetch("/api/user/token-usage")
      if (!response.ok) throw new Error("Failed to fetch usage data")
      const data = await response.json()
      setUsage(data)
    } catch (error) {
      console.error("Error fetching token usage:", error)
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

  if (!usage) return null

  const usagePercentage = usage.monthlyLimit > 0 
    ? Math.round((usage.usedThisMonth / usage.monthlyLimit) * 100)
    : 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              토큰 사용 현황
            </CardTitle>
            <CardDescription>
              이번 달 토큰 사용량과 절약된 토큰
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/billing">
              토큰 충전
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Balance */}
        <div className="p-4 bg-primary/5 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">현재 보유 토큰</span>
            <span className="text-2xl font-bold">{usage.currentTokens.toLocaleString()}</span>
          </div>
          {usage.savedThisMonth > 0 && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <TrendingDown className="h-4 w-4" />
              <span>이번 달 {usage.savedThisMonth.toLocaleString()} 토큰 절약</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3" />
                  </TooltipTrigger>
                  <TooltipContent>
                    부분 성공 할인과 캐시 활용으로 절약된 토큰입니다
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>

        {/* Monthly Usage Progress */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>월간 사용량</span>
            <span className="font-medium">
              {usage.usedThisMonth.toLocaleString()} / {usage.monthlyLimit.toLocaleString()}
            </span>
          </div>
          <Progress value={usagePercentage} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {usagePercentage}% 사용
          </p>
        </div>

        {/* Recent Usage */}
        <div>
          <h4 className="font-medium mb-3">최근 사용 내역</h4>
          <div className="space-y-2">
            {usage.recentUsage.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-full">
                    {item.feature === "excel_correction" && <Sparkles className="h-4 w-4 text-blue-600" />}
                    {item.feature === "chat" && <AlertCircle className="h-4 w-4 text-purple-600" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {item.feature === "excel_correction" && "Excel 수정"}
                      {item.feature === "chat" && "AI 채팅"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.timestamp).toLocaleString("ko-KR")}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">-{item.amount.toLocaleString()}</p>
                  {item.savedAmount && item.savedAmount > 0 && (
                    <p className="text-xs text-green-600">
                      {item.savedAmount.toLocaleString()} 절약
                    </p>
                  )}
                  {item.metadata?.partialSuccess && (
                    <Badge variant="secondary" className="text-xs mt-1">
                      {item.metadata.successRate}% 성공
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info Box */}
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-900">
            <strong>💡 Tip:</strong> 부분 성공 시 50% 할인이 자동 적용됩니다.
            AI가 파일의 일부만 수정할 수 있는 경우, 사용된 토큰의 절반만 차감됩니다.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}