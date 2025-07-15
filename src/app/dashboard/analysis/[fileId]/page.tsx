"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Download,
  Loader2,
  Sparkles
} from "lucide-react"
import axios from "axios"

interface AnalysisStatus {
  status: "processing" | "completed" | "failed"
  progress: number
  currentStep: string
  errors?: any[]
  report?: any
}

export default function AnalysisPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const fileId = params.fileId as string

  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>({
    status: "processing",
    progress: 0,
    currentStep: "파일 읽기 중...",
  })

  useEffect(() => {
    if (!fileId) return

    // Start analysis
    startAnalysis()

    // Poll for status updates
    const interval = setInterval(checkAnalysisStatus, 2000)

    return () => clearInterval(interval)
  }, [fileId])

  const startAnalysis = async () => {
    try {
      await axios.post(`/api/files/${fileId}/analyze`, {
        options: {
          autoCorrect: true,
          deepAnalysis: true,
          aiTier: "auto",
        },
      })
    } catch (error) {
      toast({
        title: "분석 시작 실패",
        description: "파일 분석을 시작할 수 없습니다.",
        variant: "destructive",
      })
    }
  }

  const checkAnalysisStatus = async () => {
    try {
      const response = await axios.get(`/api/files/${fileId}/analysis-status`)
      const data = response.data

      setAnalysisStatus(data)

      if (data.status === "completed" || data.status === "failed") {
        // Stop polling
        return
      }
    } catch (error) {
      console.error("Status check error:", error)
    }
  }

  const downloadReport = async () => {
    try {
      const response = await axios.get(`/api/files/${fileId}/download`, {
        params: { type: "report" },
        responseType: "blob",
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", `report-${fileId}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      toast({
        title: "다운로드 실패",
        description: "리포트를 다운로드할 수 없습니다.",
        variant: "destructive",
      })
    }
  }

  const downloadCorrectedFile = async () => {
    try {
      const response = await axios.get(`/api/files/${fileId}/download`, {
        params: { type: "corrected" },
        responseType: "blob",
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", `corrected-${fileId}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      toast({
        title: "다운로드 실패",
        description: "수정된 파일을 다운로드할 수 없습니다.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">파일 분석</h1>
        <p className="text-gray-600 mt-2">
          AI가 Excel 파일을 분석하고 있습니다
        </p>
      </div>

      {analysisStatus.status === "processing" && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>분석 진행 중</span>
            </CardTitle>
            <CardDescription>{analysisStatus.currentStep}</CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={analysisStatus.progress} className="mb-4" />
            <div className="text-sm text-gray-600">
              {analysisStatus.progress}% 완료
            </div>
          </CardContent>
        </Card>
      )}

      {analysisStatus.status === "completed" && analysisStatus.report && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>분석 완료</span>
                </span>
                <Badge variant="outline" className="ml-2">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI 분석
                </Badge>
              </CardTitle>
              <CardDescription>
                파일 분석이 성공적으로 완료되었습니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {analysisStatus.report.totalErrors || 0}
                  </div>
                  <div className="text-sm text-gray-600">발견된 오류</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {analysisStatus.report.correctedErrors || 0}
                  </div>
                  <div className="text-sm text-gray-600">수정된 오류</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {analysisStatus.report.confidence || 0}%
                  </div>
                  <div className="text-sm text-gray-600">신뢰도</div>
                </div>
              </div>

              <div className="flex space-x-4">
                <Button onClick={downloadCorrectedFile} className="flex-1">
                  <Download className="mr-2 h-4 w-4" />
                  수정된 파일 다운로드
                </Button>
                <Button onClick={downloadReport} variant="outline" className="flex-1">
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  상세 리포트 보기
                </Button>
              </div>
            </CardContent>
          </Card>

          {analysisStatus.errors && analysisStatus.errors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>오류 상세 내역</CardTitle>
                <CardDescription>
                  발견된 오류와 수정 사항입니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analysisStatus.errors.slice(0, 10).map((error, index) => (
                    <div
                      key={index}
                      className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-medium">{error.location}</div>
                        <div className="text-sm text-gray-600">
                          {error.errorType}: {error.description}
                        </div>
                        {error.suggestion && (
                          <div className="text-sm text-green-600 mt-1">
                            → {error.suggestion}
                          </div>
                        )}
                      </div>
                      <Badge
                        variant={error.status === "corrected" ? "default" : "secondary"}
                      >
                        {error.status === "corrected" ? "수정됨" : "검토 필요"}
                      </Badge>
                    </div>
                  ))}
                </div>
                {analysisStatus.errors.length > 10 && (
                  <div className="mt-4 text-center text-sm text-gray-600">
                    그 외 {analysisStatus.errors.length - 10}개의 오류가 더 있습니다
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {analysisStatus.status === "failed" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-600">
              <XCircle className="h-5 w-5" />
              <span>분석 실패</span>
            </CardTitle>
            <CardDescription>
              파일 분석 중 오류가 발생했습니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/dashboard/upload")}>
              다시 시도
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}