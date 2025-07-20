'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  PieChart as ChartPie,
  Code2,
  AlertTriangle,
  CheckCircle,
  Info,
  TrendingUp,
  Shield,
  Zap,
  Wrench,
  FileCode,
  BarChart3,
  ChevronRight,
} from 'lucide-react'
import { motion } from 'framer-motion'
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

interface VBAAnalysisReportProps {
  analysis: {
    analysisId: string
    analyzedAt: Date
    moduleAnalysis: Array<{
      moduleName: string
      moduleType: string
      analysis: {
        complexity: {
          cyclomaticComplexity: number
          linesOfCode: number
          commentLines: number
          emptyLines: number
          functions: number
          subroutines: number
          variables: number
        }
        quality: {
          score: number
          issues: Array<{
            type: string
            severity: string
            line: number
            message: string
            suggestion?: string
          }>
        }
        dependencies: {
          externalReferences: string[]
          apiCalls: string[]
          fileOperations: string[]
          registryAccess: string[]
        }
        metrics: {
          readabilityIndex: number
          maintainabilityIndex: number
          testabilityIndex: number
        }
      }
    }>
    summary: {
      totalModules: number
      avgComplexity: number
      avgQualityScore: number
      totalIssues: number
      criticalIssues: number
      totalDependencies: number
    }
    recommendations: Array<{
      category: string
      priority: string
      title: string
      description: string
      modules: string[]
    }>
  }
}

export function VBAAnalysisReport({ analysis }: VBAAnalysisReportProps) {
  const [selectedModule, setSelectedModule] = useState(
    analysis.moduleAnalysis[0]?.moduleName || ''
  )

  const selectedModuleData = analysis.moduleAnalysis.find(
    m => m.moduleName === selectedModule
  )

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBadge = (score: number) => {
    if (score >= 80) return 'default'
    if (score >= 60) return 'secondary'
    return 'destructive'
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      case 'warning':
        return <Info className="w-4 h-4 text-yellow-500" />
      default:
        return <Info className="w-4 h-4 text-blue-500" />
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'refactoring':
        return <Wrench className="w-4 h-4" />
      case 'security':
        return <Shield className="w-4 h-4" />
      case 'performance':
        return <Zap className="w-4 h-4" />
      case 'maintainability':
        return <TrendingUp className="w-4 h-4" />
      default:
        return <Info className="w-4 h-4" />
    }
  }

  // 차트 데이터 준비
  const radarData = selectedModuleData ? [
    {
      metric: '가독성',
      value: selectedModuleData.analysis.metrics.readabilityIndex,
    },
    {
      metric: '유지보수성',
      value: selectedModuleData.analysis.metrics.maintainabilityIndex,
    },
    {
      metric: '테스트 가능성',
      value: selectedModuleData.analysis.metrics.testabilityIndex,
    },
    {
      metric: '품질 점수',
      value: selectedModuleData.analysis.quality.score,
    },
    {
      metric: '복잡도',
      value: Math.max(0, 100 - selectedModuleData.analysis.complexity.cyclomaticComplexity * 5),
    },
  ] : []

  const barData = analysis.moduleAnalysis.map(m => ({
    name: m.moduleName,
    복잡도: m.analysis.complexity.cyclomaticComplexity,
    품질점수: m.analysis.quality.score,
    코드줄수: Math.round(m.analysis.complexity.linesOfCode / 10), // 스케일 조정
  }))

  return (
    <div className="space-y-6">
      {/* 요약 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">평균 품질 점수</p>
                <p className={`text-2xl font-bold ${getScoreColor(analysis.summary.avgQualityScore)}`}>
                  {analysis.summary.avgQualityScore}
                </p>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <ChartPie className="w-6 h-6 text-primary" />
              </div>
            </div>
            <Progress 
              value={analysis.summary.avgQualityScore} 
              className="mt-3 h-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">평균 복잡도</p>
                <p className="text-2xl font-bold">{analysis.summary.avgComplexity}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {analysis.summary.avgComplexity <= 10 ? '양호' : 
               analysis.summary.avgComplexity <= 20 ? '보통' : '높음'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">총 이슈</p>
                <p className="text-2xl font-bold">{analysis.summary.totalIssues}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              치명적: {analysis.summary.criticalIssues}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">외부 의존성</p>
                <p className="text-2xl font-bold">{analysis.summary.totalDependencies}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {analysis.summary.totalDependencies === 0 ? '없음' :
               analysis.summary.totalDependencies <= 5 ? '적음' : '많음'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 모듈별 상세 분석 */}
      <Card>
        <CardHeader>
          <CardTitle>모듈별 상세 분석</CardTitle>
          <CardDescription>
            각 모듈의 품질 메트릭과 이슈를 확인하세요
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs value={selectedModule} onValueChange={setSelectedModule}>
            <TabsList className="w-full justify-start rounded-none border-b bg-muted/50 p-0 h-auto">
              {analysis.moduleAnalysis.map((module) => (
                <TabsTrigger
                  key={module.moduleName}
                  value={module.moduleName}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                >
                  <div className="flex items-center gap-2 px-1">
                    <FileCode className="w-4 h-4" />
                    <span>{module.moduleName}</span>
                    <Badge variant={getScoreBadge(module.analysis.quality.score)}>
                      {module.analysis.quality.score}
                    </Badge>
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>

            {analysis.moduleAnalysis.map((module) => (
              <TabsContent key={module.moduleName} value={module.moduleName} className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 메트릭 레이더 차트 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">품질 메트릭</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <RadarChart data={radarData}>
                          <PolarGrid stroke="#e5e7eb" />
                          <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
                          <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                          <Radar
                            name="메트릭"
                            dataKey="value"
                            stroke="#3b82f6"
                            fill="#3b82f6"
                            fillOpacity={0.6}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* 복잡도 분석 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">복잡도 분석</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">순환 복잡도</span>
                        <Badge variant={module.analysis.complexity.cyclomaticComplexity > 10 ? 'destructive' : 'default'}>
                          {module.analysis.complexity.cyclomaticComplexity}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">코드 줄 수</span>
                        <span className="font-medium">{module.analysis.complexity.linesOfCode}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">주석 줄 수</span>
                        <span className="font-medium">{module.analysis.complexity.commentLines}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">함수 수</span>
                        <span className="font-medium">{module.analysis.complexity.functions}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">서브루틴 수</span>
                        <span className="font-medium">{module.analysis.complexity.subroutines}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">변수 수</span>
                        <span className="font-medium">{module.analysis.complexity.variables}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 이슈 목록 */}
                {module.analysis.quality.issues.length > 0 && (
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle className="text-base">발견된 이슈</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {module.analysis.quality.issues.map((issue, index) => (
                        <div key={index} className="p-3 border rounded-lg space-y-2">
                          <div className="flex items-center gap-2">
                            {getSeverityIcon(issue.severity)}
                            <Badge variant={issue.severity === 'error' ? 'destructive' : 'secondary'}>
                              {issue.type}
                            </Badge>
                            <span className="text-sm text-muted-foreground">줄 {issue.line}</span>
                          </div>
                          <p className="text-sm">{issue.message}</p>
                          {issue.suggestion && (
                            <p className="text-xs text-muted-foreground">
                              💡 {issue.suggestion}
                            </p>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* 의존성 */}
                {(module.analysis.dependencies.externalReferences.length > 0 ||
                  module.analysis.dependencies.apiCalls.length > 0 ||
                  module.analysis.dependencies.fileOperations.length > 0 ||
                  module.analysis.dependencies.registryAccess.length > 0) && (
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle className="text-base">외부 의존성</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {module.analysis.dependencies.externalReferences.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-2">외부 참조</h4>
                          <div className="flex flex-wrap gap-2">
                            {module.analysis.dependencies.externalReferences.map((ref, i) => (
                              <Badge key={i} variant="outline">{ref}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {module.analysis.dependencies.apiCalls.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-2">API 호출</h4>
                          <div className="flex flex-wrap gap-2">
                            {module.analysis.dependencies.apiCalls.map((api, i) => (
                              <Badge key={i} variant="outline">{api}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {module.analysis.dependencies.fileOperations.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-2">파일 작업</h4>
                          <div className="flex flex-wrap gap-2">
                            {module.analysis.dependencies.fileOperations.map((op, i) => (
                              <Badge key={i} variant="outline">{op}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {module.analysis.dependencies.registryAccess.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-2">레지스트리 접근</h4>
                          <div className="flex flex-wrap gap-2">
                            {module.analysis.dependencies.registryAccess.map((reg, i) => (
                              <Badge key={i} variant="destructive">{reg}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* 모듈 비교 차트 */}
      {analysis.moduleAnalysis.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>모듈 비교</CardTitle>
            <CardDescription>모든 모듈의 주요 메트릭 비교</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="복잡도" fill="#ef4444" />
                <Bar dataKey="품질점수" fill="#22c55e" />
                <Bar dataKey="코드줄수" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* 권장사항 */}
      {analysis.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>개선 권장사항</CardTitle>
            <CardDescription>
              코드 품질과 보안을 향상시키기 위한 권장사항입니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {analysis.recommendations.map((rec, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 border rounded-lg space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getCategoryIcon(rec.category)}
                    <h4 className="font-medium">{rec.title}</h4>
                  </div>
                  <Badge
                    variant={
                      rec.priority === 'high' ? 'destructive' :
                      rec.priority === 'medium' ? 'destructive' : 'secondary'
                    }
                  >
                    {rec.priority === 'high' ? '높음' :
                     rec.priority === 'medium' ? '중간' : '낮음'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{rec.description}</p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">해당 모듈:</span>
                  <div className="flex flex-wrap gap-1">
                    {rec.modules.map((mod, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {mod}
                      </Badge>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}