"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CorrectionDetailsModal } from '@/components/analysis/CorrectionDetailsModal'
import { ComparisonModal } from '@/components/analysis/ComparisonModal'
import { useToast } from '@/components/ui/use-toast'
import { 
  FileSpreadsheet, 
  Download, 
  Eye, 
  GitCompare,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  FileText,
  Zap
} from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

// Mock data for demonstration
const mockFileData = {
  id: '1',
  originalName: 'sales_report_2024.xlsx',
  size: 2457600,
  status: 'COMPLETED',
  createdAt: new Date('2024-01-15T10:30:00'),
  completedAt: new Date('2024-01-15T10:32:45'),
  tokensUsed: 150,
  analysis: {
    totalErrors: 45,
    fixedErrors: 42,
    errorTypes: {
      formula: 23,
      data: 12,
      reference: 8,
      format: 2
    },
    corrections: [
      {
        id: '1',
        type: 'formula',
        severity: 'error',
        status: 'fixed',
        location: { sheet: 'Sheet1', cell: 'B5' },
        original: { value: '=SUM(A1:A4)', formula: '=SUM(A1:A4)' },
        corrected: { value: '=SUM(A1:A5)', formula: '=SUM(A1:A5)' },
        description: 'SUM 범위 오류',
        reason: '합계 범위가 데이터 범위와 일치하지 않았습니다.',
        confidence: 0.95
      },
      {
        id: '2',
        type: 'reference',
        severity: 'error',
        status: 'fixed',
        location: { sheet: 'Sheet1', cell: 'D10' },
        original: { value: '=#REF!', formula: '=Sheet2!A1' },
        corrected: { value: '0', formula: '=IFERROR(Sheet2!A1,0)' },
        description: '참조 오류',
        reason: '존재하지 않는 시트를 참조하고 있었습니다.',
        confidence: 0.88
      }
    ]
  }
}

const mockOriginalData = {
  sheets: [
    {
      name: 'Sheet1',
      data: [
        ['상품명', '1월', '2월', '3월', '합계'],
        ['A제품', 100, 120, 150, '=SUM(B2:D2)'],
        ['B제품', 80, 90, 110, '=#REF!'],
        ['C제품', 120, 140, 160, '=SUM(B4:D4)'],
        ['합계', '=SUM(B2:B4)', '=SUM(C2:C4)', '=SUM(D2:D4)', '=SUM(E2:E4)']
      ],
      errors: [
        { cell: 'E3', type: 'reference', message: '참조 오류' },
        { cell: 'E5', type: 'formula', message: '순환 참조' }
      ]
    }
  ]
}

const mockCorrectedData = {
  sheets: [
    {
      name: 'Sheet1',
      data: [
        ['상품명', '1월', '2월', '3월', '합계'],
        ['A제품', 100, 120, 150, 370],
        ['B제품', 80, 90, 110, 280],
        ['C제품', 120, 140, 160, 420],
        ['합계', 300, 350, 420, 1070]
      ],
      corrections: [
        { cell: 'E3', original: '=#REF!', corrected: '280', type: 'reference' },
        { cell: 'E5', original: '=SUM(E2:E4)', corrected: '1070', type: 'formula' }
      ]
    }
  ]
}

export default function FileDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [fileData, setFileData] = useState<any>(null)
  const [showCorrectionDetails, setShowCorrectionDetails] = useState(false)
  const [showComparison, setShowComparison] = useState(false)

  useEffect(() => {
    // 실제로는 API에서 데이터를 가져와야 함
    setTimeout(() => {
      setFileData(mockFileData)
      setLoading(false)
    }, 1000)
  }, [params.id])

  const handleDownloadOriginal = async () => {
    toast({
      title: "다운로드 시작",
      description: "원본 파일을 다운로드하고 있습니다."
    })
  }

  const handleDownloadCorrected = async () => {
    toast({
      title: "다운로드 시작",
      description: "수정된 파일을 다운로드하고 있습니다."
    })
  }

  const handleDownloadReport = async () => {
    toast({
      title: "리포트 생성 중",
      description: "분석 리포트를 생성하고 있습니다."
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!fileData) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">파일을 찾을 수 없습니다.</p>
      </div>
    )
  }

  const successRate = fileData.analysis.totalErrors > 0 
    ? Math.round((fileData.analysis.fixedErrors / fileData.analysis.totalErrors) * 100)
    : 0

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileSpreadsheet className="h-6 w-6" />
              {fileData.originalName}
            </h1>
            <p className="text-muted-foreground">
              업로드: {format(fileData.createdAt, 'yyyy년 MM월 dd일 HH:mm', { locale: ko })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleDownloadOriginal}>
            <Download className="h-4 w-4 mr-2" />
            원본
          </Button>
          <Button onClick={handleDownloadCorrected}>
            <Download className="h-4 w-4 mr-2" />
            수정본
          </Button>
        </div>
      </div>

      {/* 상태 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">처리 상태</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {fileData.status === 'COMPLETED' ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-green-600">완료</span>
                </>
              ) : fileData.status === 'FAILED' ? (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span className="font-semibold text-red-600">실패</span>
                </>
              ) : (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="font-semibold">처리 중</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">수정 성공률</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{successRate}%</span>
              <Badge variant={successRate >= 80 ? 'default' : 'secondary'}>
                {fileData.analysis.fixedErrors}/{fileData.analysis.totalErrors}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">처리 시간</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span className="font-semibold">2분 45초</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">토큰 사용</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-600" />
              <span className="font-semibold">{fileData.tokensUsed} 토큰</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 상세 정보 탭 */}
      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList>
          <TabsTrigger value="summary">요약</TabsTrigger>
          <TabsTrigger value="details">상세 내역</TabsTrigger>
          <TabsTrigger value="comparison">비교</TabsTrigger>
          <TabsTrigger value="report">리포트</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <CardTitle>오류 수정 요약</CardTitle>
              <CardDescription>
                AI가 발견하고 수정한 오류들의 요약입니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">수식 오류</span>
                  </div>
                  <p className="text-2xl font-bold">{fileData.analysis.errorTypes.formula}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">데이터 오류</span>
                  </div>
                  <p className="text-2xl font-bold">{fileData.analysis.errorTypes.data}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Link className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">참조 오류</span>
                  </div>
                  <p className="text-2xl font-bold">{fileData.analysis.errorTypes.reference}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">형식 오류</span>
                  </div>
                  <p className="text-2xl font-bold">{fileData.analysis.errorTypes.format}</p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t">
                <Button 
                  className="w-full"
                  onClick={() => setShowCorrectionDetails(true)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  수정 내역 상세 보기
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details">
          <Card>
            <CardContent className="pt-6">
              <Button 
                className="w-full"
                onClick={() => setShowCorrectionDetails(true)}
              >
                <Eye className="h-4 w-4 mr-2" />
                수정 내역 상세 보기
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison">
          <Card>
            <CardContent className="pt-6">
              <Button 
                className="w-full"
                onClick={() => setShowComparison(true)}
              >
                <GitCompare className="h-4 w-4 mr-2" />
                원본/수정본 비교 보기
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="report">
          <Card>
            <CardHeader>
              <CardTitle>분석 리포트</CardTitle>
              <CardDescription>
                상세한 분석 리포트를 다운로드할 수 있습니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleDownloadReport}>
                <FileText className="h-4 w-4 mr-2" />
                PDF 리포트 다운로드
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 모달들 */}
      <CorrectionDetailsModal
        open={showCorrectionDetails}
        onClose={() => setShowCorrectionDetails(false)}
        analysisData={{
          fileName: fileData.originalName,
          totalErrors: fileData.analysis.totalErrors,
          fixedErrors: fileData.analysis.fixedErrors,
          corrections: fileData.analysis.corrections
        }}
        onDownloadReport={handleDownloadReport}
      />

      <ComparisonModal
        open={showComparison}
        onClose={() => setShowComparison(false)}
        originalData={mockOriginalData}
        correctedData={mockCorrectedData}
        fileName={fileData.originalName}
        onDownload={handleDownloadReport}
      />
    </div>
  )
}