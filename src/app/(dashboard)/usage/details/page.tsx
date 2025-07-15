"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { CalendarIcon, Download, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  LineChart,
  Line,
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
} from "recharts"

interface UsageReportData {
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
  timeline: Array<{
    date: string
    usage: Record<string, number>
  }>
  subscription: {
    plan: string
    tokensRemaining: number
    monthlyTokens: number
    renewalDate: string | null
  }
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"]

const FEATURE_NAMES = {
  excel_analysis: "엑셀 분석",
  ai_chat: "AI 채팅",
  file_optimization: "파일 최적화",
  report_generation: "리포트 생성",
}

export default function UsageDetailsPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<UsageReportData | null>(null)
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly" | "all">("monthly")
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined
    to: Date | undefined
  }>({
    from: undefined,
    to: undefined,
  })

  useEffect(() => {
    fetchUsageData()
  }, [period, dateRange])

  const fetchUsageData = async () => {
    try {
      setLoading(true)
      let url = `/api/usage/report?period=${period}`
      
      if (dateRange.from) {
        url += `&startDate=${dateRange.from.toISOString()}`
      }
      if (dateRange.to) {
        url += `&endDate=${dateRange.to.toISOString()}`
      }

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error("Failed to fetch usage data")
      }
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error("Error fetching usage data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = () => {
    if (!data) return

    // Prepare CSV data
    const csvContent = [
      ["날짜", "기능", "사용횟수"],
      ...data.timeline.flatMap(item =>
        Object.entries(item.usage).map(([feature, count]) => [
          item.date,
          FEATURE_NAMES[feature as keyof typeof FEATURE_NAMES] || feature,
          count.toString(),
        ])
      ),
    ]
      .map(row => row.join(","))
      .join("\n")

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `usage_report_${format(new Date(), "yyyy-MM-dd")}.csv`
    link.click()
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="container mx-auto py-10">
        <Alert variant="destructive">
          <AlertDescription>
            사용량 데이터를 불러올 수 없습니다.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Prepare chart data
  const pieData = data.breakdown.map(item => ({
    name: FEATURE_NAMES[item.feature as keyof typeof FEATURE_NAMES] || item.feature,
    value: item.count,
  }))

  const lineData = data.timeline.map(item => {
    const datum: any = { date: format(new Date(item.date), "MM/dd", { locale: ko }) }
    Object.entries(item.usage).forEach(([feature, count]) => {
      datum[FEATURE_NAMES[feature as keyof typeof FEATURE_NAMES] || feature] = count
    })
    return datum
  })

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">사용량 상세 분석</h1>
          <p className="text-muted-foreground mt-2">
            서비스 사용 패턴과 통계를 확인하세요
          </p>
        </div>
        <Button onClick={handleExportCSV}>
          <Download className="mr-2 h-4 w-4" />
          CSV 내보내기
        </Button>
      </div>

      {/* Controls */}
      <div className="flex gap-4 mb-6">
        <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="기간 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">일간</SelectItem>
            <SelectItem value="weekly">주간</SelectItem>
            <SelectItem value="monthly">월간</SelectItem>
            <SelectItem value="all">전체</SelectItem>
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal",
                !dateRange.from && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "PPP", { locale: ko })} -{" "}
                    {format(dateRange.to, "PPP", { locale: ko })}
                  </>
                ) : (
                  format(dateRange.from, "PPP", { locale: ko })
                )
              ) : (
                <span>날짜 범위 선택</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={setDateRange as any}
              locale={ko}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>총 사용량</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalUsage}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>소비 토큰</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.tokensConsumed.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>남은 토큰</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.tokensRemaining.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>일 평균 사용량</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.averageDailyUsage}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline">시간별 추이</TabsTrigger>
          <TabsTrigger value="breakdown">기능별 분석</TabsTrigger>
          <TabsTrigger value="comparison">토큰 사용량</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>사용량 추이</CardTitle>
              <CardDescription>
                시간에 따른 각 기능의 사용량 변화
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {Object.keys(FEATURE_NAMES).map((feature, index) => (
                    <Line
                      key={feature}
                      type="monotone"
                      dataKey={FEATURE_NAMES[feature as keyof typeof FEATURE_NAMES]}
                      stroke={COLORS[index % COLORS.length]}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>기능별 사용 비율</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name} (${entry.value})`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>기능별 토큰 사용량</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.breakdown.map(item => ({
                    feature: FEATURE_NAMES[item.feature as keyof typeof FEATURE_NAMES] || item.feature,
                    tokens: item.tokensUsed,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="feature" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="tokens" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="comparison">
          <Card>
            <CardHeader>
              <CardTitle>토큰 사용 분석</CardTitle>
              <CardDescription>
                각 기능별 토큰 사용량과 효율성
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {data.breakdown.map((item) => {
                  const avgTokensPerUse = item.tokensUsed / item.count || 0
                  return (
                    <div key={item.feature} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">
                          {FEATURE_NAMES[item.feature as keyof typeof FEATURE_NAMES] || item.feature}
                        </h4>
                        <span className="text-muted-foreground">
                          평균 {avgTokensPerUse.toFixed(1)} 토큰/사용
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">사용 횟수</p>
                          <p className="font-medium">{item.count}회</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">총 토큰</p>
                          <p className="font-medium">{item.tokensUsed.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">비율</p>
                          <p className="font-medium">{item.percentage}%</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}