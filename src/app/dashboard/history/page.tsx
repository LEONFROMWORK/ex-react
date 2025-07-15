import { getServerSession } from "@/lib/auth-helper"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  FileSpreadsheet, 
  Download, 
  Eye, 
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  Sparkles
} from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { ko } from "date-fns/locale"

export default async function HistoryPage() {
  const session = await getServerSession()

  if (!session) {
    redirect("/auth/login")
  }

  // Get user's files with analyses
  const files = await prisma.file.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      analyses: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  })

  // Get user's AI usage stats
  const aiStats = await prisma.aIUsageStats.findUnique({
    where: { userId: session.user.id },
  })

  const totalFiles = files.length
  const completedFiles = files.filter(f => f.status === "COMPLETED").length
  const totalErrors = files.reduce((sum, file) => {
    const analysis = file.analyses[0]
    return sum + ((analysis?.report as any)?.totalErrors || 0)
  }, 0)
  const totalCorrected = files.reduce((sum, file) => {
    const analysis = file.analyses[0]
    return sum + ((analysis?.report as any)?.correctedErrors || 0)
  }, 0)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">처리 내역</h1>
        <p className="text-gray-600 mt-2">
          지금까지 처리한 모든 Excel 파일을 확인하세요
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 파일</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFiles}</div>
            <p className="text-xs text-muted-foreground">
              처리 완료: {completedFiles}개
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">발견된 오류</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalErrors}</div>
            <p className="text-xs text-muted-foreground">
              총 누적
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">수정된 오류</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCorrected}</div>
            <p className="text-xs text-muted-foreground">
              자동 수정
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI 사용량</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(aiStats?.tier1Tokens || 0) + (aiStats?.tier2Tokens || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              토큰 사용
            </p>
          </CardContent>
        </Card>
      </div>

      {/* File List */}
      <Card>
        <CardHeader>
          <CardTitle>파일 목록</CardTitle>
          <CardDescription>
            최근 처리한 파일부터 표시됩니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <div className="text-center py-12">
              <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">아직 처리한 파일이 없습니다</p>
              <Link href="/dashboard/upload">
                <Button className="mt-4">첫 파일 업로드하기</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {files.map((file) => {
                const analysis = file.analyses[0]
                const report = analysis?.report as any

                return (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start space-x-4">
                      <FileSpreadsheet className="h-10 w-10 text-green-600 mt-1" />
                      <div>
                        <h3 className="font-medium">{file.originalName}</h3>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                          <span className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {format(new Date(file.createdAt), "yyyy년 MM월 dd일", { locale: ko })}
                          </span>
                          <span>{(file.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                        </div>
                        {analysis && (
                          <div className="flex items-center space-x-2 mt-2">
                            {file.status === "COMPLETED" && (
                              <>
                                <Badge variant="outline" className="text-xs">
                                  오류 {report?.totalErrors || 0}개
                                </Badge>
                                <Badge variant="default" className="text-xs">
                                  수정 {report?.correctedErrors || 0}개
                                </Badge>
                                {analysis.aiTier === "TIER2" && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Sparkles className="h-3 w-3 mr-1" />
                                    고급 AI
                                  </Badge>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {file.status === "COMPLETED" ? (
                        <>
                          <Link href={`/dashboard/analysis/${file.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              보기
                            </Button>
                          </Link>
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-1" />
                            다운로드
                          </Button>
                        </>
                      ) : file.status === "PROCESSING" ? (
                        <Badge variant="secondary">처리 중</Badge>
                      ) : file.status === "FAILED" ? (
                        <Badge variant="destructive">실패</Badge>
                      ) : (
                        <Badge variant="outline">대기 중</Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Usage Summary */}
      {aiStats && (aiStats.tier1Calls > 0 || aiStats.tier2Calls > 0) && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>AI 사용 통계</CardTitle>
            <CardDescription>
              비용 효율적인 AI 사용 현황
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-lg font-semibold">기본 AI (Tier 1)</div>
                <div className="text-2xl font-bold text-blue-600">
                  {aiStats.tier1Calls}회
                </div>
                <div className="text-sm text-gray-600">
                  {aiStats.tier1Tokens.toLocaleString()} 토큰
                </div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-lg font-semibold">고급 AI (Tier 2)</div>
                <div className="text-2xl font-bold text-purple-600">
                  {aiStats.tier2Calls}회
                </div>
                <div className="text-sm text-gray-600">
                  {aiStats.tier2Tokens.toLocaleString()} 토큰
                </div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-lg font-semibold">절약 효과</div>
                <div className="text-2xl font-bold text-green-600">
                  ₩{Math.round(aiStats.costSaved * 1300).toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">
                  {aiStats.tokensSaved.toLocaleString()} 토큰 절약
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}