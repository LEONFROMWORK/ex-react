'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Code, Shield, AlertTriangle, Bug, CheckCircle } from 'lucide-react'
import { AnalysisResult } from '@/lib/services/interfaces'
import { useVBAService } from '@/lib/services/container'

interface VBAAnalyzerProps {
  results: AnalysisResult[]
}

export function VBAAnalyzer({ results }: VBAAnalyzerProps) {
  const [activeTab, setActiveTab] = useState('errors')
  const [vbaAnalysis, setVbaAnalysis] = useState<any>(null)
  const vbaService = useVBAService()
  
  // Mock VBA analysis data
  const mockVbaAnalysis = {
    modules: [
      {
        name: 'Module1',
        type: 'standard',
        lineCount: 156,
        complexity: 'medium',
        issues: 3
      },
      {
        name: 'ThisWorkbook',
        type: 'workbook',
        lineCount: 45,
        complexity: 'low',
        issues: 1
      }
    ],
    security: [
      {
        severity: 'high',
        type: 'External Data Access',
        description: 'Code accesses external files without validation',
        line: 'Module1:45'
      },
      {
        severity: 'medium',
        type: 'No Error Handling',
        description: 'Missing error handling in critical functions',
        line: 'Module1:78-92'
      }
    ],
    performance: [
      {
        issue: 'Inefficient Loop',
        location: 'Module1:120-135',
        impact: 'high',
        suggestion: 'Use array operations instead of cell-by-cell iteration'
      }
    ]
  }
  
  return (
    <div className="space-y-4">
      {/* VBA Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            VBA 코드 분석
          </CardTitle>
          <CardDescription>
            매크로 및 VBA 코드의 문제점을 분석합니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold">{mockVbaAnalysis.modules.length}</p>
              <p className="text-sm text-muted-foreground">모듈</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">
                {mockVbaAnalysis.modules.reduce((sum, m) => sum + m.issues, 0)}
              </p>
              <p className="text-sm text-muted-foreground">발견된 문제</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-red-600">
                {mockVbaAnalysis.security.filter(s => s.severity === 'high').length}
              </p>
              <p className="text-sm text-muted-foreground">보안 위험</p>
            </div>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="errors">오류 및 버그</TabsTrigger>
              <TabsTrigger value="security">보안 문제</TabsTrigger>
              <TabsTrigger value="performance">성능 개선</TabsTrigger>
            </TabsList>
            
            <TabsContent value="errors" className="mt-4 space-y-3">
              {results.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p>VBA 코드에 오류가 없습니다</p>
                </div>
              ) : (
                results.map((result) => (
                  <div key={result.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Bug className="h-4 w-4 text-red-500" />
                        <span className="font-medium">{result.location}</span>
                      </div>
                      <Badge variant="destructive">오류</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {result.description}
                    </p>
                    {result.suggestion && (
                      <div className="bg-muted p-3 rounded text-sm">
                        <p className="font-medium mb-1">수정 방법:</p>
                        <p>{result.suggestion}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </TabsContent>
            
            <TabsContent value="security" className="mt-4 space-y-3">
              {mockVbaAnalysis.security.map((issue, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-yellow-500" />
                      <span className="font-medium">{issue.type}</span>
                    </div>
                    <Badge 
                      variant={issue.severity === 'high' ? 'destructive' : 'warning'}
                    >
                      {issue.severity === 'high' ? '높음' : '중간'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {issue.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    위치: {issue.line}
                  </p>
                </div>
              ))}
            </TabsContent>
            
            <TabsContent value="performance" className="mt-4 space-y-3">
              {mockVbaAnalysis.performance.map((issue, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">{issue.issue}</span>
                    </div>
                    <Badge variant="secondary">
                      {issue.impact === 'high' ? '높은 영향' : '중간 영향'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    위치: {issue.location}
                  </p>
                  <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded text-sm">
                    <p className="font-medium mb-1">개선 제안:</p>
                    <p>{issue.suggestion}</p>
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
          
          <div className="mt-4 flex gap-2">
            <Button className="flex-1">
              모든 VBA 문제 수정
            </Button>
            <Button variant="outline" className="flex-1">
              VBA 코드 보기
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}