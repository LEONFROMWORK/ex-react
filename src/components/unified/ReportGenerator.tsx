'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { 
  FileText, 
  FileSpreadsheet, 
  Download, 
  Loader2,
  FileCheck,
  AlertCircle
} from 'lucide-react'
import { ReportService } from '@/lib/services/report.service'
import { useFileStore } from '@/lib/stores/fileStore'
import { TokenService, TOKEN_COSTS } from '@/lib/services/token.service'

type ReportFormat = 'pdf' | 'excel'

interface ReportGeneratorProps {
  fileId: string
  fileName: string
  fileSize: number
}

export function ReportGenerator({ fileId, fileName, fileSize }: ReportGeneratorProps) {
  const { toast } = useToast()
  const analysisResults = useFileStore((state) => state.analysisResults)
  const [format, setFormat] = useState<ReportFormat>('pdf')
  const [isGenerating, setIsGenerating] = useState(false)
  const [reportService] = useState(() => new ReportService())
  
  const handleGenerateReport = async () => {
    // 토큰 확인
    const tokenService = TokenService.getInstance()
    const cost = TOKEN_COSTS.GENERATE_REPORT
    
    if (!tokenService.canAfford(cost)) {
      toast({
        title: '토큰 부족',
        description: `리포트 생성에 ${cost} 토큰이 필요합니다.`,
        variant: 'destructive'
      })
      return
    }
    
    setIsGenerating(true)
    
    try {
      // 토큰 차감
      const tokenUsed = await tokenService.useTokens(cost, '분석 리포트 생성')
      if (!tokenUsed) {
        throw new Error('토큰 차감 실패')
      }
      
      // 리포트 데이터 준비
      const reportData = reportService.prepareReportData(
        { name: fileName, size: fileSize },
        analysisResults
      )
      
      // 리포트 생성
      let blob: Blob
      let filename: string
      
      if (format === 'pdf') {
        blob = await reportService.generatePDFReport(reportData)
        filename = `${fileName.replace(/\.[^/.]+$/, '')}_분석리포트.pdf`
      } else {
        blob = await reportService.generateExcelReport(reportData)
        filename = `${fileName.replace(/\.[^/.]+$/, '')}_분석리포트.xlsx`
      }
      
      // 다운로드
      reportService.downloadReport(blob, filename)
      
      toast({
        title: '리포트 생성 완료',
        description: `${format.toUpperCase()} 형식으로 리포트가 생성되었습니다. (${cost} 토큰 사용)`
      })
    } catch (error) {
      console.error('Report generation error:', error)
      toast({
        title: '리포트 생성 실패',
        description: '리포트 생성 중 오류가 발생했습니다.',
        variant: 'destructive'
      })
    } finally {
      setIsGenerating(false)
    }
  }
  
  if (analysisResults.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-3">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">
              분석 결과가 없어 리포트를 생성할 수 없습니다.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck className="h-5 w-5" />
          분석 리포트 생성
        </CardTitle>
        <CardDescription>
          분석 결과를 PDF 또는 Excel 형식으로 다운로드할 수 있습니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <Label>리포트 형식 선택</Label>
          <RadioGroup value={format} onValueChange={(v) => setFormat(v as ReportFormat)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="pdf" id="pdf" />
              <Label htmlFor="pdf" className="flex items-center gap-2 cursor-pointer">
                <FileText className="h-4 w-4" />
                PDF 리포트
                <span className="text-xs text-muted-foreground">
                  (인쇄 및 공유용)
                </span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="excel" id="excel" />
              <Label htmlFor="excel" className="flex items-center gap-2 cursor-pointer">
                <FileSpreadsheet className="h-4 w-4" />
                Excel 리포트
                <span className="text-xs text-muted-foreground">
                  (상세 분석용)
                </span>
              </Label>
            </div>
          </RadioGroup>
        </div>
        
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <h4 className="font-medium text-sm">리포트 내용</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• 파일 정보 및 분석 요약</li>
            <li>• {analysisResults.length}개 문제의 상세 분석</li>
            <li>• 문제별 해결 방안</li>
            <li>• 종합 권장사항</li>
          </ul>
        </div>
        
        <Button 
          onClick={handleGenerateReport}
          disabled={isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              리포트 생성 중...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              리포트 생성 ({TOKEN_COSTS.GENERATE_REPORT} 토큰)
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}