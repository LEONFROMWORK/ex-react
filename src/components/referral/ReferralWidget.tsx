"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Users, 
  Gift, 
  Copy, 
  Check,
  TrendingUp,
  Crown,
  Share2
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface ReferralStats {
  referralCode: string
  referralUrl: string
  stats: {
    totalReferrals: number
    pendingReferrals: number
    completedReferrals: number
    totalEarnings: number
    totalTokensEarned: number
  }
  leaderboard: {
    rank: number
    totalUsers: number
  }
}

export function ReferralWidget() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchReferralStats()
  }, [])

  const fetchReferralStats = async () => {
    try {
      const response = await fetch("/api/referral/stats")
      if (!response.ok) {
        // If no referral code exists, create one
        if (response.status === 404) {
          const createResponse = await fetch("/api/referral/create", {
            method: "POST",
          })
          if (createResponse.ok) {
            const data = await createResponse.json()
            setStats({
              referralCode: data.referralCode,
              referralUrl: data.referralUrl,
              stats: {
                totalReferrals: 0,
                pendingReferrals: 0,
                completedReferrals: 0,
                totalEarnings: 0,
                totalTokensEarned: 0,
              },
              leaderboard: {
                rank: 0,
                totalUsers: 0,
              },
            })
          }
        }
        return
      }
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error("Failed to fetch referral stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast({
        title: "복사 완료",
        description: "클립보드에 복사되었습니다.",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast({
        title: "복사 실패",
        description: "클립보드 복사에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const shareOnSocial = (platform: "twitter" | "facebook" | "kakaotalk") => {
    if (!stats) return

    const text = "엑셀 오류 자동 수정 서비스 Exhell을 소개합니다! 제 추천 코드로 가입하면 200 토큰을 무료로 받을 수 있어요!"
    const url = stats.referralUrl

    switch (platform) {
      case "twitter":
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`)
        break
      case "facebook":
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`)
        break
      case "kakaotalk":
        // KakaoTalk sharing requires SDK integration
        toast({
          title: "준비 중",
          description: "카카오톡 공유 기능은 준비 중입니다.",
        })
        break
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

  if (!stats) {
    return (
      <Alert>
        <AlertDescription>
          추천 정보를 불러올 수 없습니다.
        </AlertDescription>
      </Alert>
    )
  }

  const nextMilestone = Math.ceil(stats.stats.totalReferrals / 10) * 10 || 10
  const progressToMilestone = (stats.stats.totalReferrals % 10) * 10

  return (
    <div className="space-y-6">
      {/* Referral Code Card */}
      <Card>
        <CardHeader>
          <CardTitle>내 추천 코드</CardTitle>
          <CardDescription>
            친구에게 공유하고 보상을 받으세요
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              value={stats.referralCode}
              readOnly
              className="font-mono text-lg"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyToClipboard(stats.referralCode)}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Input
              value={stats.referralUrl}
              readOnly
              className="text-sm"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyToClipboard(stats.referralUrl)}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => shareOnSocial("twitter")}
            >
              <Share2 className="mr-2 h-4 w-4" />
              트위터
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => shareOnSocial("facebook")}
            >
              <Share2 className="mr-2 h-4 w-4" />
              페이스북
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => shareOnSocial("kakaotalk")}
            >
              <Share2 className="mr-2 h-4 w-4" />
              카카오톡
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>총 추천</CardDescription>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.stats.totalReferrals}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>완료된 추천</CardDescription>
              <Check className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.stats.completedReferrals}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>획득 토큰</CardDescription>
              <Gift className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.stats.totalTokensEarned.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>현금 보상</CardDescription>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₩{stats.stats.totalEarnings.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Progress to Next Milestone */}
      <Card>
        <CardHeader>
          <CardTitle>다음 마일스톤</CardTitle>
          <CardDescription>
            {nextMilestone}명 추천 시 추가 보너스
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progressToMilestone} className="h-3" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{stats.stats.totalReferrals}명 추천 완료</span>
            <span>{nextMilestone - stats.stats.totalReferrals}명 남음</span>
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard Position */}
      {stats.leaderboard.rank > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>추천 순위</CardTitle>
              <Crown className="h-5 w-5 text-yellow-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">
                {stats.leaderboard.rank}위
              </div>
              <p className="text-muted-foreground">
                전체 {stats.leaderboard.totalUsers}명 중
              </p>
            </div>
            {stats.leaderboard.rank <= 10 && (
              <Alert className="mt-4">
                <AlertDescription>
                  상위 10위 안에 들어있습니다! 계속해서 추천하면 특별 보상을 받을 수 있어요.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}