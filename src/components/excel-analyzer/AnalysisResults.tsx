'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'

interface AnalysisResult {
  fileAnalysis: Array<{
    type: 'error' | 'warning' | 'suggestion'
    severity: 'high' | 'medium' | 'low'
    location: string
    message: string
    suggestion?: string
  }>
  vbaAnalysis: any
  report: string
  summary: {
    totalIssues: number
    errors: number
    warnings: number
    suggestions: number
    hasVBA: boolean
    vbaRiskLevel: string
  }
}

interface AnalysisResultsProps {
  results: AnalysisResult
}

export function AnalysisResults({ results }: AnalysisResultsProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive'
      case 'medium': return 'default'
      case 'low': return 'secondary'
      default: return 'outline'
    }
  }
  
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'error': return '❌'
      case 'warning': return '⚠️'
      case 'suggestion': return '💡'
      default: return '📌'
    }
  }
  
  return (
    <div className="space-y-6">
      {/* 요약 카드 */}
      <Card>
        <CardHeader>
          <CardTitle>분석 요약</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{results.summary.errors}</div>
              <div className="text-sm text-gray-600">오류</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{results.summary.warnings}</div>
              <div className="text-sm text-gray-600">경고</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{results.summary.suggestions}</div>
              <div className="text-sm text-gray-600">제안</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{results.summary.totalIssues}</div>
              <div className="text-sm text-gray-600">전체</div>
            </div>
          </div>
          
          {results.summary.hasVBA && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">VBA 코드 포함</span>
                <Badge variant={results.summary.vbaRiskLevel === 'high' ? 'destructive' : 'secondary'}>
                  위험도: {results.summary.vbaRiskLevel}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* 상세 분석 결과 */}
      <Card>
        <CardHeader>
          <CardTitle>상세 분석 결과</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="all">전체 ({results.summary.totalIssues})</TabsTrigger>
              <TabsTrigger value="errors">오류 ({results.summary.errors})</TabsTrigger>
              <TabsTrigger value="warnings">경고 ({results.summary.warnings})</TabsTrigger>
              <TabsTrigger value="suggestions">제안 ({results.summary.suggestions})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all">
              <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                {results.fileAnalysis.map((issue, index) => (
                  <IssueCard key={index} issue={issue} />
                ))}
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="errors">
              <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                {results.fileAnalysis
                  .filter(issue => issue.type === 'error')
                  .map((issue, index) => (
                    <IssueCard key={index} issue={issue} />
                  ))}
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="warnings">
              <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                {results.fileAnalysis
                  .filter(issue => issue.type === 'warning')
                  .map((issue, index) => (
                    <IssueCard key={index} issue={issue} />
                  ))}
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="suggestions">
              <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                {results.fileAnalysis
                  .filter(issue => issue.type === 'suggestion')
                  .map((issue, index) => (
                    <IssueCard key={index} issue={issue} />
                  ))}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* VBA 분석 결과 */}
      {results.vbaAnalysis && !results.vbaAnalysis.error && (
        <Card>
          <CardHeader>
            <CardTitle>VBA 코드 분석</CardTitle>
          </CardHeader>
          <CardContent>
            <VBAAnalysisResults analysis={results.vbaAnalysis} />
          </CardContent>
        </Card>
      )}
      
      {/* AI 분석 보고서 */}
      {results.report && (
        <Card>
          <CardHeader>
            <CardTitle>종합 분석 보고서</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-sm">{results.report}</pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function IssueCard({ issue }: { issue: any }) {
  return (
    <Alert className="mb-4">
      <AlertTitle className="flex items-center gap-2">
        <span>{getTypeIcon(issue.type)}</span>
        <span>{issue.location}</span>
        <Badge variant={getSeverityColor(issue.severity)}>
          {issue.severity}
        </Badge>
      </AlertTitle>
      <AlertDescription>
        <p className="mb-2">{issue.message}</p>
        {issue.suggestion && (
          <p className="text-sm text-blue-600">💡 {issue.suggestion}</p>
        )}
      </AlertDescription>
    </Alert>
  )
}

function VBAAnalysisResults({ analysis }: { analysis: any }) {
  return (
    <div className="space-y-4">
      {/* VBA 모듈 정보 */}
      <div>
        <h4 className="font-medium mb-2">VBA 모듈 ({analysis.modules?.length || 0}개)</h4>
        <div className="space-y-2">
          {analysis.modules?.map((module: any, index: number) => (
            <div key={index} className="p-2 bg-gray-50 rounded">
              <div className="flex items-center justify-between">
                <span className="font-medium">{module.name}</span>
                <Badge variant="outline">{module.type}</Badge>
              </div>
              <span className="text-sm text-gray-600">{module.lineCount}줄</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* 보안 위험 */}
      {analysis.securityRisks?.length > 0 && (
        <div>
          <h4 className="font-medium mb-2 text-red-600">보안 위험</h4>
          <div className="space-y-2">
            {analysis.securityRisks.map((risk: any, index: number) => (
              <Alert key={index} variant="destructive">
                <AlertTitle>{risk.description}</AlertTitle>
                <AlertDescription>
                  <p>모듈: {risk.module} (줄 {risk.line})</p>
                  <p className="text-sm mt-1">{risk.suggestion}</p>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </div>
      )}
      
      {/* 성능 문제 */}
      {analysis.performanceIssues?.length > 0 && (
        <div>
          <h4 className="font-medium mb-2 text-yellow-600">성능 개선 사항</h4>
          <div className="space-y-2">
            {analysis.performanceIssues.map((issue: any, index: number) => (
              <Alert key={index}>
                <AlertTitle>{issue.description}</AlertTitle>
                <AlertDescription>
                  <p>모듈: {issue.module}</p>
                  <p className="text-sm mt-1">{issue.suggestion}</p>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </div>
      )}
      
      {/* AI 인사이트 */}
      {analysis.aiInsights?.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">AI 분석 인사이트</h4>
          <div className="space-y-2">
            {analysis.aiInsights.map((insight: string, index: number) => (
              <div key={index} className="p-3 bg-blue-50 rounded">
                <p className="text-sm">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'error': return '❌'
    case 'warning': return '⚠️'
    case 'suggestion': return '💡'
    default: return '📌'
  }
}

function getSeverityColor(severity: string) {
  switch (severity) {
    case 'high': return 'destructive'
    case 'medium': return 'default'
    case 'low': return 'secondary'
    default: return 'outline'
  }
}