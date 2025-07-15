"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { formatDistanceToNow } from "date-fns"
import { ko } from "date-fns/locale"
import { Clock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"

interface Referral {
  id: string
  refereeEmail: string
  status: "PENDING" | "COMPLETED" | "EXPIRED"
  rewardAmount: number
  createdAt: string
  completedAt: string | null
}

interface ReferralListProps {
  limit?: number
}

const STATUS_CONFIG = {
  PENDING: {
    label: "대기 중",
    variant: "secondary" as const,
    icon: Clock,
  },
  COMPLETED: {
    label: "완료",
    variant: "success" as const,
    icon: CheckCircle2,
  },
  EXPIRED: {
    label: "만료",
    variant: "destructive" as const,
    icon: AlertCircle,
  },
}

export function ReferralList({ limit = 10 }: ReferralListProps) {
  const [loading, setLoading] = useState(true)
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchReferrals()
  }, [])

  const fetchReferrals = async () => {
    try {
      const response = await fetch("/api/referral/stats")
      if (!response.ok) {
        throw new Error("Failed to fetch referrals")
      }
      const data = await response.json()
      setReferrals(data.referrals.slice(0, limit))
    } catch (err) {
      setError("추천 내역을 불러올 수 없습니다.")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const maskEmail = (email: string) => {
    const [localPart, domain] = email.split("@")
    if (localPart.length <= 3) {
      return `${localPart[0]}**@${domain}`
    }
    return `${localPart.slice(0, 3)}***@${domain}`
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (referrals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>추천 내역</CardTitle>
          <CardDescription>
            아직 추천한 사용자가 없습니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              친구를 추천하고 보너스 토큰을 받아보세요!
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>추천 내역</CardTitle>
        <CardDescription>
          최근 {limit}명의 추천 내역입니다
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {referrals.map((referral) => {
            const config = STATUS_CONFIG[referral.status]
            const Icon = config.icon

            return (
              <div
                key={referral.id}
                className="flex items-center justify-between py-3 border-b last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-full">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium">{maskEmail(referral.refereeEmail)}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(referral.createdAt), {
                        addSuffix: true,
                        locale: ko,
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={config.variant}>
                    {config.label}
                  </Badge>
                  {referral.status === "COMPLETED" && (
                    <div className="text-right">
                      <p className="font-medium">+{(referral.rewardAmount / 100).toLocaleString()}원</p>
                      <p className="text-sm text-muted-foreground">+500 토큰</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}