'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  AlertCircle,
  AlertTriangle,
  Info,
  XCircle,
  CheckCircle,
  Copy,
  Download,
  RefreshCw,
  HelpCircle,
  Clock,
  TrendingUp,
  FileText,
  Bug,
  Lightbulb,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { EnhancedError } from '@/Services/Error/BusinessContextAnalyzer'

interface ErrorVisualizationProps {
  error: EnhancedError
  onRetry?: () => void
  onDismiss?: () => void
  showTechnicalDetails?: boolean
}

export function ErrorVisualization({
  error,
  onRetry,
  onDismiss,
  showTechnicalDetails = false,
}: ErrorVisualizationProps) {
  const [copiedCode, setCopiedCode] = useState(false)
  const [showFullStack, setShowFullStack] = useState(false)

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="w-5 h-5" />
      case 'high':
        return <AlertTriangle className="w-5 h-5" />
      case 'medium':
        return <AlertCircle className="w-5 h-5" />
      case 'low':
        return <Info className="w-5 h-5" />
      default:
        return <AlertCircle className="w-5 h-5" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-100 border-red-200'
      case 'high':
        return 'text-orange-600 bg-orange-100 border-orange-200'
      case 'medium':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200'
      case 'low':
        return 'text-blue-600 bg-blue-100 border-blue-200'
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'user':
        return <HelpCircle className="w-4 h-4" />
      case 'system':
        return <Bug className="w-4 h-4" />
      case 'data':
        return <FileText className="w-4 h-4" />
      case 'network':
        return <TrendingUp className="w-4 h-4" />
      case 'permission':
        return <XCircle className="w-4 h-4" />
      default:
        return <AlertCircle className="w-4 h-4" />
    }
  }

  const copyErrorCode = () => {
    navigator.clipboard.writeText(error.errorCode)
    setCopiedCode(true)
    toast.success('오류 코드가 복사되었습니다')
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const downloadErrorReport = () => {
    const report = generateDetailedReport(error)
    const blob = new Blob([report], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `error_report_${error.errorCode}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('오류 보고서가 다운로드되었습니다')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      {/* 메인 오류 카드 */}
      <Card className={`border-2 ${getSeverityColor(error.severity).split(' ')[2]}`}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${getSeverityColor(error.severity)}`}>
                {getSeverityIcon(error.severity)}
              </div>
              <div>
                <CardTitle className="text-lg">오류가 발생했습니다</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {error.errorCode}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={copyErrorCode}
                    className="h-5 px-1"
                  >
                    {copiedCode ? (
                      <CheckCircle className="w-3 h-3 text-green-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </Button>
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getCategoryIcon(error.errorCategory)}
              <Badge variant="secondary">{error.errorCategory}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 사용자 친화적 메시지 */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>문제 설명</AlertTitle>
            <AlertDescription className="mt-2">
              {error.userFriendlyMessage}
            </AlertDescription>
          </Alert>

          {/* 권장 조치 */}
          {error.suggestedActions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-medium">
                <Lightbulb className="w-4 h-4 text-yellow-600" />
                권장 조치
              </div>
              <ul className="space-y-1 ml-6">
                {error.suggestedActions.map((action, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-muted-foreground">•</span>
                    <span className="text-sm">{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 액션 버튼 */}
          <div className="flex gap-2">
            {onRetry && (
              <Button onClick={onRetry} variant="default" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                다시 시도
              </Button>
            )}
            <Button
              onClick={downloadErrorReport}
              variant="outline"
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              보고서 다운로드
            </Button>
            {onDismiss && (
              <Button
                onClick={onDismiss}
                variant="ghost"
                size="sm"
              >
                닫기
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 상세 정보 탭 */}
      {showTechnicalDetails && (
        <Tabs defaultValue="context" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="context">컨텍스트</TabsTrigger>
            <TabsTrigger value="technical">기술적 세부사항</TabsTrigger>
            <TabsTrigger value="timeline">타임라인</TabsTrigger>
          </TabsList>

          <TabsContent value="context" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">작업 컨텍스트</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">작업</p>
                    <p className="font-medium">{error.businessContext.operation}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">의도</p>
                    <p className="font-medium">{error.businessContext.intent}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">시간</p>
                    <p className="font-medium">
                      {new Date(error.businessContext.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">카테고리</p>
                    <p className="font-medium capitalize">{error.errorCategory}</p>
                  </div>
                </div>

                {error.businessContext.dataContext && 
                 Object.keys(error.businessContext.dataContext).length > 0 && (
                  <Accordion type="single" collapsible>
                    <AccordionItem value="data">
                      <AccordionTrigger>데이터 컨텍스트</AccordionTrigger>
                      <AccordionContent>
                        <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                          {JSON.stringify(error.businessContext.dataContext, null, 2)}
                        </pre>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="technical" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">기술적 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-muted p-3 rounded">
                  <pre className="text-xs overflow-auto whitespace-pre-wrap">
                    {error.technicalDetails}
                  </pre>
                </div>

                {error.stackTrace && (
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFullStack(!showFullStack)}
                    >
                      {showFullStack ? '스택 추적 숨기기' : '스택 추적 보기'}
                    </Button>
                    {showFullStack && (
                      <div className="bg-muted p-3 rounded">
                        <pre className="text-xs overflow-auto">
                          {error.stackTrace}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {error.relatedDocumentation && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">관련 문서</p>
                    <div className="space-y-1">
                      {error.relatedDocumentation.map((doc, index) => (
                        <a
                          key={index}
                          href={doc}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <FileText className="w-3 h-3" />
                          {doc}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">작업 타임라인</CardTitle>
                <CardDescription>오류 발생까지의 단계</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {error.businessContext.previousSteps.map((step, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{step}</p>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-600 text-xs">
                      !
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-600">오류 발생</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </motion.div>
  )
}

// 상세 보고서 생성 함수
function generateDetailedReport(error: EnhancedError): string {
  return `
오류 보고서
===========

오류 코드: ${error.errorCode}
발생 시간: ${new Date(error.businessContext.timestamp).toLocaleString()}
심각도: ${error.severity}
카테고리: ${error.errorCategory}

사용자 메시지
------------
${error.userFriendlyMessage}

권장 조치
--------
${error.suggestedActions.map((action, i) => `${i + 1}. ${action}`).join('\n')}

작업 컨텍스트
-------------
작업: ${error.businessContext.operation}
의도: ${error.businessContext.intent}

이전 단계:
${error.businessContext.previousSteps.map((step, i) => `  ${i + 1}. ${step}`).join('\n')}

기술적 세부사항
--------------
${error.technicalDetails}

${error.stackTrace ? `\n스택 추적\n--------\n${error.stackTrace}` : ''}

데이터 컨텍스트
--------------
${JSON.stringify(error.businessContext.dataContext, null, 2)}
  `.trim()
}