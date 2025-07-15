"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { 
  Sparkles, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Download,
  Coins,
  TrendingDown,
  Info
} from "lucide-react"

interface CorrectionResult {
  totalErrors: number
  correctedErrors: number
  failedCorrections: number
  successRate: number
  tokensUsed: number
  tokensCharged: number
  partialSuccess: boolean
  correctedFileUrl?: string
  report: {
    summary: string
    insights: string
    aiTier: string
    confidence: number
  }
}

interface CorrectionResultCardProps {
  result: CorrectionResult
  onDownload: () => void
}

export function CorrectionResultCard({ result, onDownload }: CorrectionResultCardProps) {
  const tokensSaved = result.tokensUsed - result.tokensCharged
  const discountPercentage = tokensSaved > 0 ? Math.round((tokensSaved / result.tokensUsed) * 100) : 0

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {result.successRate === 100 && (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>수정 완료</span>
                </>
              )}
              {result.partialSuccess && (
                <>
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <span>부분 수정 완료</span>
                </>
              )}
              {result.successRate === 0 && (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span>수정 실패</span>
                </>
              )}
            </CardTitle>
            <CardDescription>{result.report.summary}</CardDescription>
          </div>
          <Badge variant="outline">
            <Sparkles className="h-3 w-3 mr-1" />
            {result.report.aiTier}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Success Rate Progress */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>성공률</span>
            <span className="font-medium">{result.successRate}%</span>
          </div>
          <Progress value={result.successRate} className="h-3" />
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{result.totalErrors}</div>
            <div className="text-xs text-gray-500">전체 오류</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{result.correctedErrors}</div>
            <div className="text-xs text-gray-500">수정됨</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{result.failedCorrections}</div>
            <div className="text-xs text-gray-500">수정 실패</div>
          </div>
        </div>

        {/* Token Usage */}
        <div className="p-4 bg-gray-50 rounded-lg space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Coins className="h-4 w-4" />
            토큰 사용량
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>사용된 토큰</span>
              <span>{result.tokensUsed.toLocaleString()}</span>
            </div>
            {tokensSaved > 0 && (
              <>
                <div className="flex justify-between text-sm text-green-600">
                  <span>할인된 토큰</span>
                  <span>-{tokensSaved.toLocaleString()} ({discountPercentage}%)</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between font-medium">
                    <span>실제 차감 토큰</span>
                    <span>{result.tokensCharged.toLocaleString()}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Partial Success Alert */}
        {result.partialSuccess && result.successRate < 50 && (
          <Alert>
            <TrendingDown className="h-4 w-4" />
            <AlertTitle>부분 성공 할인 적용</AlertTitle>
            <AlertDescription>
              성공률이 50% 미만이므로 토큰의 50%만 차감되었습니다.
              완전한 수정을 위해서는 수동 검토가 필요할 수 있습니다.
            </AlertDescription>
          </Alert>
        )}

        {/* AI Insights */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium flex items-center gap-2 mb-2">
            <Info className="h-4 w-4" />
            AI 분석 인사이트
          </h4>
          <p className="text-sm text-gray-700">{result.report.insights}</p>
          <div className="mt-2 flex items-center gap-4 text-xs text-gray-600">
            <span>신뢰도: {result.report.confidence}%</span>
            <span>AI 모델: {result.report.aiTier}</span>
          </div>
        </div>

        {/* Download Button */}
        {result.correctedFileUrl && (
          <Button 
            onClick={onDownload} 
            className="w-full"
            disabled={result.successRate === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            수정된 파일 다운로드
          </Button>
        )}
      </CardContent>
    </Card>
  )
}