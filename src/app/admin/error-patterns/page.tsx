"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ErrorPatternChart } from "@/components/admin/charts/ErrorPatternChart"
import { ErrorPatternTable } from "@/components/admin/ErrorPatternTable"
import { 
  Download, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  TrendingUp,
  BarChart3,
  FileWarning,
  Loader2
} from "lucide-react"
import { GetErrorPatternStatsResponse } from "@/Features/Admin/ErrorPatterns/GetErrorPatternStats"

export default function AdminErrorPatternsPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<GetErrorPatternStatsResponse | null>(null)
  const [dateRange, setDateRange] = useState("all")
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    fetchErrorPatternStats()
  }, [dateRange])

  const fetchErrorPatternStats = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      if (dateRange !== "all") {
        const endDate = new Date()
        const startDate = new Date()
        
        switch (dateRange) {
          case "today":
            startDate.setHours(0, 0, 0, 0)
            break
          case "week":
            startDate.setDate(startDate.getDate() - 7)
            break
          case "month":
            startDate.setMonth(startDate.getMonth() - 1)
            break
        }
        
        params.append("startDate", startDate.toISOString())
        params.append("endDate", endDate.toISOString())
      }

      const response = await fetch(`/api/admin/error-patterns/stats?${params}`)
      if (!response.ok) {
        throw new Error("Failed to fetch error pattern stats")
      }
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error("Error fetching error pattern stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (format: "csv" | "json") => {
    try {
      setDownloading(true)
      const response = await fetch(`/api/admin/error-patterns/export?format=${format}`)
      if (!response.ok) {
        throw new Error("Failed to export data")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `error_patterns_${new Date().toISOString().split("T")[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Error downloading error patterns:", error)
    } finally {
      setDownloading(false)
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
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>오류 패턴 통계를 불러올 수 없습니다.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">오류 패턴 분석</h1>
          <p className="text-muted-foreground">시스템 성능 향상을 위한 오류 패턴 데이터베이스</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleDownload("csv")}
            disabled={downloading}
          >
            <Download className="mr-2 h-4 w-4" />
            CSV 다운로드
          </Button>
          <Button
            variant="outline"
            onClick={() => handleDownload("json")}
            disabled={downloading}
          >
            <Download className="mr-2 h-4 w-4" />
            JSON 다운로드
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <Tabs value={dateRange} onValueChange={setDateRange}>
        <TabsList>
          <TabsTrigger value="all">전체</TabsTrigger>
          <TabsTrigger value="today">오늘</TabsTrigger>
          <TabsTrigger value="week">1주일</TabsTrigger>
          <TabsTrigger value="month">1개월</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">총 오류 패턴</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.overview.totalPatterns.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">수집된 패턴</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              해결된 오류
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {stats.overview.resolvedPatterns.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              해결률: {stats.overview.resolutionRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              해결 실패
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {stats.overview.failedResolutions.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">미해결 케이스</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">평균 해결 시간</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {Math.round(stats.overview.avgResolutionTime / 60)}분
            </p>
            <p className="text-xs text-muted-foreground">
              {stats.overview.avgResolutionTime}초
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">심각도 분포</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-red-600">HIGH</span>
                <span>{stats.bySeverity.HIGH}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-yellow-600">MEDIUM</span>
                <span>{stats.bySeverity.MEDIUM}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-green-600">LOW</span>
                <span>{stats.bySeverity.LOW}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analysis Tabs */}
      <Tabs defaultValue="category" className="space-y-4">
        <TabsList>
          <TabsTrigger value="category">카테고리별 분석</TabsTrigger>
          <TabsTrigger value="patterns">상위 오류 패턴</TabsTrigger>
          <TabsTrigger value="trends">추세 분석</TabsTrigger>
        </TabsList>

        <TabsContent value="category" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>카테고리별 오류 분포</CardTitle>
              <CardDescription>오류 유형별 발생 빈도 및 해결률</CardDescription>
            </CardHeader>
            <CardContent>
              <ErrorPatternChart data={stats.byCategory} type="category" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>상위 오류 패턴</CardTitle>
              <CardDescription>가장 빈번하게 발생하는 오류 패턴</CardDescription>
            </CardHeader>
            <CardContent>
              <ErrorPatternTable patterns={stats.topErrors} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI 모델 성능 분석</CardTitle>
              <CardDescription>오류 유형별 AI 신뢰도 및 해결 성능</CardDescription>
            </CardHeader>
            <CardContent>
              <ErrorPatternChart data={stats.byType} type="confidence" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            개선 인사이트
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.byCategory.filter(cat => cat.resolutionRate < 50).length > 0 && (
              <Alert>
                <FileWarning className="h-4 w-4" />
                <AlertDescription>
                  <strong>낮은 해결률 카테고리:</strong>{" "}
                  {stats.byCategory
                    .filter(cat => cat.resolutionRate < 50)
                    .map(cat => `${cat.category} (${cat.resolutionRate.toFixed(1)}%)`)
                    .join(", ")}
                  에 대한 개선이 필요합니다.
                </AlertDescription>
              </Alert>
            )}
            
            {stats.topErrors.filter(err => err.frequency > 100).length > 0 && (
              <Alert>
                <BarChart3 className="h-4 w-4" />
                <AlertDescription>
                  <strong>고빈도 오류:</strong> {stats.topErrors[0].errorType}이(가) 
                  {stats.topErrors[0].frequency}회 발생했습니다. 
                  우선적인 해결책 개발이 권장됩니다.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}