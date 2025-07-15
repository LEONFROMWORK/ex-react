"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { AlertTriangle, X } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

interface UsageLimitAlertProps {
  feature: string
  usage: {
    daily: number
    weekly: number
    monthly: number
    remaining: number
  }
  limits: {
    daily: number
    weekly: number
    monthly: number
  }
  onDismiss?: () => void
}

const FEATURE_NAMES = {
  excel_analysis: "엑셀 분석",
  ai_chat: "AI 채팅",
  file_optimization: "파일 최적화",
  report_generation: "리포트 생성",
}

export function UsageLimitAlert({ 
  feature, 
  usage, 
  limits, 
  onDismiss 
}: UsageLimitAlertProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const featureName = FEATURE_NAMES[feature as keyof typeof FEATURE_NAMES] || feature

  // Calculate which limit is closest to being exceeded
  const dailyPercentage = limits.daily > 0 ? (usage.daily / limits.daily) * 100 : 0
  const weeklyPercentage = limits.weekly > 0 ? (usage.weekly / limits.weekly) * 100 : 0
  const monthlyPercentage = limits.monthly > 0 ? (usage.monthly / limits.monthly) * 100 : 0

  const maxPercentage = Math.max(dailyPercentage, weeklyPercentage, monthlyPercentage)
  const isExceeded = maxPercentage >= 100
  const isWarning = maxPercentage >= 80

  if (!isWarning && !isExceeded) return null

  const handleDismiss = () => {
    setDismissed(true)
    onDismiss?.()
  }

  return (
    <Alert variant={isExceeded ? "destructive" : "default"} className="relative">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>
        {isExceeded ? "사용 한도 초과" : "사용 한도 임박"}
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <p>
          {featureName} 기능의 사용량이 {isExceeded ? "한도를 초과했습니다" : "한도에 근접했습니다"}.
        </p>
        
        <div className="space-y-2">
          {dailyPercentage > 0 && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>일일 한도</span>
                <span>{usage.daily} / {limits.daily === -1 ? "무제한" : limits.daily}</span>
              </div>
              {limits.daily !== -1 && (
                <Progress value={Math.min(dailyPercentage, 100)} className="h-2" />
              )}
            </div>
          )}
          
          {weeklyPercentage > 0 && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>주간 한도</span>
                <span>{usage.weekly} / {limits.weekly === -1 ? "무제한" : limits.weekly}</span>
              </div>
              {limits.weekly !== -1 && (
                <Progress value={Math.min(weeklyPercentage, 100)} className="h-2" />
              )}
            </div>
          )}
          
          {monthlyPercentage > 0 && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>월간 한도</span>
                <span>{usage.monthly} / {limits.monthly === -1 ? "무제한" : limits.monthly}</span>
              </div>
              {limits.monthly !== -1 && (
                <Progress value={Math.min(monthlyPercentage, 100)} className="h-2" />
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button asChild size="sm">
            <Link href="/pricing">
              플랜 업그레이드
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/usage/details">
              사용량 상세보기
            </Link>
          </Button>
        </div>
      </AlertDescription>
      
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6"
        onClick={handleDismiss}
      >
        <X className="h-4 w-4" />
      </Button>
    </Alert>
  )
}