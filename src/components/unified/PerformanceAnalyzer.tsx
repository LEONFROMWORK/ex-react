'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Zap, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'
import { AnalysisResult } from '@/lib/services/interfaces'

interface PerformanceAnalyzerProps {
  results: AnalysisResult[]
}

export function PerformanceAnalyzer({ results }: PerformanceAnalyzerProps) {
  // Mock performance metrics
  const metrics = {
    calculationTime: 2.5,
    memoryUsage: 45,
    fileSize: 12.5,
    formulaComplexity: 78,
    volatileFunctions: 12,
    externalReferences: 3
  }
  
  const getMetricStatus = (value: number, thresholds: { good: number, warning: number }) => {
    if (value <= thresholds.good) return 'good'
    if (value <= thresholds.warning) return 'warning'
    return 'bad'
  }
  
  return (
    <div className="space-y-4">
      {/* Performance Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            성능 개요
          </CardTitle>
          <CardDescription>
            파일의 전반적인 성능 지표입니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>계산 시간</span>
                <span className="font-medium">{metrics.calculationTime}초</span>
              </div>
              <Progress 
                value={Math.min((metrics.calculationTime / 5) * 100, 100)} 
                className="h-2"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>메모리 사용량</span>
                <span className="font-medium">{metrics.memoryUsage}%</span>
              </div>
              <Progress 
                value={metrics.memoryUsage} 
                className="h-2"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>파일 크기</span>
                <span className="font-medium">{metrics.fileSize} MB</span>
              </div>
              <Progress 
                value={Math.min((metrics.fileSize / 50) * 100, 100)} 
                className="h-2"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>수식 복잡도</span>
                <span className="font-medium">{metrics.formulaComplexity}%</span>
              </div>
              <Progress 
                value={metrics.formulaComplexity} 
                className="h-2"
              />
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium">휘발성 함수</span>
            </div>
            <Badge variant="destructive">{metrics.volatileFunctions}개 발견</Badge>
          </div>
        </CardContent>
      </Card>
      
      {/* Optimization Suggestions */}
      {results.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">성능이 최적화되어 있습니다</h3>
            <p className="text-muted-foreground">
              추가 최적화가 필요하지 않습니다.
            </p>
          </CardContent>
        </Card>
      ) : (
        results.map((result) => (
          <Card key={result.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    {result.location}
                  </CardTitle>
                  <CardDescription>{result.description}</CardDescription>
                </div>
                <Badge variant="secondary">
                  {result.severity === 'high' ? '높은 영향' : '중간 영향'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {result.suggestion && (
                <div className="mb-4">
                  <p className="text-sm font-medium mb-2">최적화 제안:</p>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm">{result.suggestion}</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  예상 개선: <span className="font-medium text-green-600">~30% 속도 향상</span>
                </div>
                <Button size="sm">
                  최적화 적용
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}