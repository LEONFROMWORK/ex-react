"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Gift,
  MoreHorizontal,
  Search,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  Coins
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface ReferralData {
  id: string
  userId: string
  userName: string
  userEmail: string
  referralCode: string
  referralCount: number
  totalCreditsEarned: number
  totalEarned: number
  rewardType: string
  createdAt: Date
}

interface ReferralReward {
  id: string
  referrerId: string
  referrerName: string
  refereeId: string
  refereeName: string
  refereeEmail: string
  rewardType: string
  creditsAwarded: number
  cashAwarded: number
  status: string
  triggerEvent: string
  createdAt: Date
  completedAt?: Date
}

export default function AdminReferralsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [searchQuery, setSearchQuery] = useState("")
  const [referrals, setReferrals] = useState<ReferralData[]>([])
  const [rewards, setRewards] = useState<ReferralReward[]>([])
  const [stats, setStats] = useState({
    totalReferrals: 0,
    activeReferrers: 0,
    totalTokensAwarded: 0,
    totalCashAwarded: 0,
    pendingRewards: 0,
    conversionRate: 0
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [referralsRes, rewardsRes, statsRes] = await Promise.all([
        fetch("/api/admin/referrals"),
        fetch("/api/admin/referrals/rewards"),
        fetch("/api/admin/referrals/stats")
      ])

      if (!referralsRes.ok || !rewardsRes.ok || !statsRes.ok) {
        throw new Error("Failed to fetch referral data")
      }

      const [referralsData, rewardsData, statsData] = await Promise.all([
        referralsRes.json(),
        rewardsRes.json(),
        statsRes.json()
      ])

      setReferrals(referralsData)
      setRewards(rewardsData)
      setStats(statsData)
    } catch (error) {
      console.error("Error fetching referral data:", error)
      toast({
        title: "오류",
        description: "데이터를 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleApproveReward = async (rewardId: string) => {
    try {
      const response = await fetch(`/api/admin/referrals/rewards/${rewardId}/approve`, {
        method: "POST",
      })

      if (!response.ok) throw new Error("Failed to approve reward")

      toast({
        title: "승인 완료",
        description: "보상이 승인되었습니다.",
      })

      fetchData()
    } catch (error) {
      toast({
        title: "오류",
        description: "보상 승인 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleRejectReward = async (rewardId: string) => {
    try {
      const response = await fetch(`/api/admin/referrals/rewards/${rewardId}/reject`, {
        method: "POST",
      })

      if (!response.ok) throw new Error("Failed to reject reward")

      toast({
        title: "거부 완료",
        description: "보상이 거부되었습니다.",
      })

      fetchData()
    } catch (error) {
      toast({
        title: "오류",
        description: "보상 거부 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  const exportData = async (type: "csv" | "json") => {
    try {
      const response = await fetch(`/api/admin/referrals/export?format=${type}`)
      if (!response.ok) throw new Error("Export failed")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `referrals_${new Date().toISOString().split("T")[0]}.${type}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      toast({
        title: "오류",
        description: "데이터 내보내기에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const filteredReferrals = referrals.filter(referral =>
    referral.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
    referral.referralCode.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredRewards = rewards.filter(reward =>
    reward.referrerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    reward.refereeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    reward.refereeEmail.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">추천 관리</h1>
          <p className="text-muted-foreground mt-1">
            추천 프로그램 및 보상 관리
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportData("csv")}>
            <Download className="h-4 w-4 mr-2" />
            CSV 내보내기
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportData("json")}>
            <Download className="h-4 w-4 mr-2" />
            JSON 내보내기
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">총 추천 수</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalReferrals.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">전체 추천</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">활성 추천인</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.activeReferrers}</p>
            <p className="text-xs text-muted-foreground">추천 활동 중</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">지급 토큰</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalTokensAwarded.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">총 토큰</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">현금 보상</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">₩{stats.totalCashAwarded.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">총 지급액</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">대기 중</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.pendingRewards}</p>
            <p className="text-xs text-muted-foreground">미처리 보상</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">전환율</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.conversionRate.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">추천→결제</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="이메일 또는 추천 코드로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">추천인 현황</TabsTrigger>
          <TabsTrigger value="rewards">보상 내역</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>추천인 목록</CardTitle>
              <CardDescription>
                활성 추천인과 추천 실적
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>사용자</TableHead>
                    <TableHead>추천 코드</TableHead>
                    <TableHead className="text-center">추천 수</TableHead>
                    <TableHead className="text-center">획득 토큰</TableHead>
                    <TableHead className="text-right">현금 보상</TableHead>
                    <TableHead>보상 방식</TableHead>
                    <TableHead>가입일</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReferrals.map((referral) => (
                    <TableRow key={referral.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{referral.userName}</p>
                          <p className="text-sm text-muted-foreground">{referral.userEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {referral.referralCode}
                        </code>
                      </TableCell>
                      <TableCell className="text-center">
                        {referral.referralCount}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Coins className="h-4 w-4 text-yellow-500" />
                          {referral.totalCreditsEarned}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        ₩{referral.totalEarned.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={referral.rewardType === "PAYMENT_BASED" ? "default" : "secondary"}>
                          {referral.rewardType === "PAYMENT_BASED" ? "결제 기반" : "가입 기반"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(referral.createdAt).toLocaleDateString("ko-KR")}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>상세 보기</DropdownMenuItem>
                            <DropdownMenuItem>보상 내역</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rewards" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>보상 지급 내역</CardTitle>
              <CardDescription>
                추천 보상 지급 현황
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>추천인</TableHead>
                    <TableHead>피추천인</TableHead>
                    <TableHead>보상 유형</TableHead>
                    <TableHead className="text-center">토큰</TableHead>
                    <TableHead className="text-right">현금</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>지급일</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRewards.map((reward) => (
                    <TableRow key={reward.id}>
                      <TableCell>
                        <p className="font-medium">{reward.referrerName}</p>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{reward.refereeName}</p>
                          <p className="text-sm text-muted-foreground">{reward.refereeEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {reward.rewardType === "FIRST_PAYMENT" ? "첫 결제" : reward.rewardType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Coins className="h-4 w-4 text-yellow-500" />
                          {reward.creditsAwarded}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        ₩{reward.cashAwarded.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {reward.status === "COMPLETED" && (
                          <Badge variant="default" className="bg-green-500">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            완료
                          </Badge>
                        )}
                        {reward.status === "PENDING" && (
                          <Badge variant="secondary">
                            <Clock className="h-3 w-3 mr-1" />
                            대기중
                          </Badge>
                        )}
                        {reward.status === "FAILED" && (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            실패
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {reward.completedAt 
                          ? new Date(reward.completedAt).toLocaleDateString("ko-KR")
                          : "-"
                        }
                      </TableCell>
                      <TableCell>
                        {reward.status === "PENDING" && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleApproveReward(reward.id)}>
                                승인
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleRejectReward(reward.id)}>
                                거부
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}