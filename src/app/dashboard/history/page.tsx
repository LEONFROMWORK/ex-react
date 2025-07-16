'use client'

import { useState, useEffect } from "react"
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

// Mock data for demonstration
const mockFiles = [
  {
    id: "1",
    originalName: "월간_매출_보고서_2024.xlsx",
    fileSize: 2048000,
    status: "COMPLETED",
    createdAt: new Date("2024-01-15T10:30:00"),
    analyses: [{
      id: "a1",
      report: {
        totalErrors: 15,
        correctedErrors: 12,
      },
      aiTier: "TIER1"
    }]
  },
  {
    id: "2",
    originalName: "재고관리_데이터.xlsx",
    fileSize: 5242880,
    status: "COMPLETED",
    createdAt: new Date("2024-01-14T14:20:00"),
    analyses: [{
      id: "a2",
      report: {
        totalErrors: 8,
        correctedErrors: 8,
      },
      aiTier: "TIER2"
    }]
  },
  {
    id: "3",
    originalName: "고객_데이터베이스.xlsx",
    fileSize: 3145728,
    status: "PROCESSING",
    createdAt: new Date("2024-01-16T09:15:00"),
    analyses: []
  }
]

const mockAiStats = {
  tier1Calls: 24,
  tier1Tokens: 125000,
  tier2Calls: 3,
  tier2Tokens: 45000,
  costSaved: 12.5,
  tokensSaved: 80000
}

export default function HistoryPage() {
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  const handleDownload = (file: any) => {
    // Mock 다운로드 시뮬레이션
    const link = document.createElement("a")
    link.href = "#"
    link.download = `corrected_${file.originalName}`
    link.click()
    
    // 실제로는 서버에서 파일을 다운로드하는 로직이 필요
    alert(`다운로드 시작: corrected_${file.originalName}`)
  }
  
  useEffect(() => {
    // localStorage에서 파일 정보 가져오기
    const uploadedFiles = JSON.parse(localStorage.getItem('uploadedFiles') || '[]')
    
    // 파일 정보를 history 페이지에 맞게 변환
    const formattedFiles = uploadedFiles.map((file: any) => ({
      id: file.id,
      originalName: file.name,
      fileSize: file.size,
      status: file.status === 'completed' ? 'COMPLETED' : file.status === 'processing' ? 'PROCESSING' : 'PENDING',
      createdAt: new Date(file.uploadedAt),
      analyses: file.result ? [{
        id: `analysis-${file.id}`,
        report: {
          totalErrors: file.result.totalErrors || 0,
          correctedErrors: file.result.fixedErrors || 0,
          confidence: file.result.confidence || 0
        },
        aiTier: "TIER1"
      }] : []
    }))
    
    // 최신 파일이 먼저 오도록 정렬
    formattedFiles.sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime())
    
    setFiles(formattedFiles)
  }, [])
  
  // Calculate statistics
  const totalFiles = files.length
  const completedFiles = files.filter(f => f.status === "COMPLETED").length
  const totalErrors = files.reduce((sum, file) => {
    const analysis = file.analyses[0]
    return sum + (analysis?.report?.totalErrors || 0)
  }, 0)
  const totalCorrected = files.reduce((sum, file) => {
    const analysis = file.analyses[0]
    return sum + (analysis?.report?.correctedErrors || 0)
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
              {mockAiStats.tier1Tokens + mockAiStats.tier2Tokens}
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
                const report = analysis?.report

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
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDownload(file)}
                          >
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
                {mockAiStats.tier1Calls}회
              </div>
              <div className="text-sm text-gray-600">
                {mockAiStats.tier1Tokens.toLocaleString()} 토큰
              </div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-lg font-semibold">고급 AI (Tier 2)</div>
              <div className="text-2xl font-bold text-purple-600">
                {mockAiStats.tier2Calls}회
              </div>
              <div className="text-sm text-gray-600">
                {mockAiStats.tier2Tokens.toLocaleString()} 토큰
              </div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-lg font-semibold">절약 효과</div>
              <div className="text-2xl font-bold text-green-600">
                ₩{Math.round(mockAiStats.costSaved * 1300).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">
                {mockAiStats.tokensSaved.toLocaleString()} 토큰 절약
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}