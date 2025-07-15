"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Copy, 
  Link2, 
  Users, 
  DollarSign, 
  TrendingUp,
  Gift,
  Award,
  Coins,
  ExternalLink,
  Check
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface ReferralData {
  referralCode: string
  referralLink: string
  totalReferrals: number
  totalTokensEarned: number
  totalCashEarned: number
  pendingRewards: number
  recentRewards: Array<{
    id: string
    type: string
    amount: number
    date: Date
    refereeEmail: string
  }>
}

export function ReferralWidgetV2() {
  const { toast } = useToast()
  const [referralData, setReferralData] = useState<ReferralData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  useEffect(() => {
    fetchReferralData()
  }, [])

  const fetchReferralData = async () => {
    try {
      const response = await fetch("/api/referral/dashboard")
      if (!response.ok) throw new Error("Failed to fetch referral data")
      const data = await response.json()
      setReferralData(data)
    } catch (error) {
      console.error("Error fetching referral data:", error)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string, type: "code" | "link") => {
    try {
      await navigator.clipboard.writeText(text)
      if (type === "code") {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } else {
        setCopiedLink(true)
        setTimeout(() => setCopiedLink(false), 2000)
      }
      toast({
        title: "복사 완료",
        description: `${type === "code" ? "추천 코드" : "추천 링크"}가 클립보드에 복사되었습니다.`,
      })
    } catch (error) {
      toast({
        title: "복사 실패",
        description: "클립보드 복사에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    )
  }

  if (!referralData) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* 메인 추천 카드 */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">내 추천 프로그램</CardTitle>
              <CardDescription>
                친구를 추천하고 첫 결제 시 토큰을 받으세요
              </CardDescription>
            </div>
            <Gift className="h-8 w-8 text-primary" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 추천 링크 */}
          <div className="space-y-3">
            <label className="text-sm font-medium">내 추천 링크</label>
            <div className="flex gap-2">
              <Input
                value={referralData.referralLink}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(referralData.referralLink, "link")}
              >
                {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="icon" asChild>
                <a href={referralData.referralLink} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>

          {/* 추천 코드 */}
          <div className="space-y-3">
            <label className="text-sm font-medium">추천 코드</label>
            <div className="flex gap-2">
              <Input
                value={referralData.referralCode}
                readOnly
                className="font-mono text-lg font-bold text-center"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(referralData.referralCode, "code")}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* 통계 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-background rounded-lg">
              <Users className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-2xl font-bold">{referralData.totalReferrals}</p>
              <p className="text-xs text-muted-foreground">총 추천</p>
            </div>
            <div className="text-center p-4 bg-background rounded-lg">
              <Coins className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-2xl font-bold">{referralData.totalTokensEarned}</p>
              <p className="text-xs text-muted-foreground">획득 토큰</p>
            </div>
            <div className="text-center p-4 bg-background rounded-lg">
              <DollarSign className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-2xl font-bold">₩{referralData.totalCashEarned.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">현금 보상</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 보상 내역 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            보상 내역
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="recent">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="recent">최근 보상</TabsTrigger>
              <TabsTrigger value="pending">대기 중 ({referralData.pendingRewards})</TabsTrigger>
            </TabsList>
            <TabsContent value="recent" className="space-y-3">
              {referralData.recentRewards.length > 0 ? (
                referralData.recentRewards.map((reward) => (
                  <div key={reward.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <TrendingUp className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{reward.refereeEmail}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(reward.date).toLocaleDateString("ko-KR")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">+{reward.amount} 토큰</p>
                      <Badge variant="outline" className="text-xs">
                        {reward.type === "FIRST_PAYMENT" ? "첫 결제" : "가입"}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  아직 보상 내역이 없습니다
                </p>
              )}
            </TabsContent>
            <TabsContent value="pending" className="space-y-3">
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {referralData.pendingRewards > 0
                    ? `${referralData.pendingRewards}개의 보상이 처리 대기 중입니다`
                    : "대기 중인 보상이 없습니다"}
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 추천 방법 안내 */}
      <Card>
        <CardHeader>
          <CardTitle>추천 방법</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-sm font-bold text-primary">1</span>
            </div>
            <div>
              <p className="font-medium">추천 링크 공유</p>
              <p className="text-sm text-muted-foreground">
                위의 추천 링크를 친구에게 공유하세요
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-sm font-bold text-primary">2</span>
            </div>
            <div>
              <p className="font-medium">친구의 회원가입</p>
              <p className="text-sm text-muted-foreground">
                친구가 링크를 통해 회원가입을 완료합니다
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-sm font-bold text-primary">3</span>
            </div>
            <div>
              <p className="font-medium">첫 결제 완료</p>
              <p className="text-sm text-muted-foreground">
                친구가 첫 결제를 완료하면 보상이 지급됩니다
              </p>
            </div>
          </div>
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>보상 안내:</strong> 추천받은 친구가 첫 결제를 완료하면 100 토큰이 즉시 지급됩니다.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}