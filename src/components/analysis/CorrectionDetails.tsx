"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  FileSpreadsheet,
  Hash,
  Type,
  Calendar,
  Calculator,
  Link,
  Code,
  AlertTriangle,
  Info,
  ChevronRight,
  ChevronDown
} from 'lucide-react'

interface CorrectionDetail {
  id: string
  type: 'formula' | 'data' | 'format' | 'reference' | 'vba'
  severity: 'error' | 'warning' | 'info'
  status: 'fixed' | 'partially_fixed' | 'failed' | 'skipped'
  location: {
    sheet: string
    cell?: string
    range?: string
    line?: number
  }
  original: {
    value: string
    formula?: string
    format?: string
  }
  corrected: {
    value: string
    formula?: string
    format?: string
  }
  description: string
  reason: string
  confidence: number
}

interface CorrectionDetailsProps {
  corrections: CorrectionDetail[]
  fileName: string
  totalErrors: number
  fixedErrors: number
}

const errorTypeIcons = {
  formula: Calculator,
  data: Type,
  format: Hash,
  reference: Link,
  vba: Code
}

const severityColors = {
  error: 'destructive',
  warning: 'destructive', 
  info: 'secondary'
} as const

const statusIcons = {
  fixed: CheckCircle2,
  partially_fixed: AlertTriangle,
  failed: XCircle,
  skipped: AlertCircle
}

const statusLabels = {
  fixed: '수정 완료',
  partially_fixed: '부분 수정',
  failed: '수정 실패',
  skipped: '건너뜀'
}

export function CorrectionDetails({ 
  corrections, 
  fileName, 
  totalErrors, 
  fixedErrors 
}: CorrectionDetailsProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedItems(newExpanded)
  }

  // 필터링된 수정 내역
  const filteredCorrections = corrections.filter(correction => {
    if (selectedType !== 'all' && correction.type !== selectedType) return false
    if (selectedStatus !== 'all' && correction.status !== selectedStatus) return false
    return true
  })

  // 통계 계산
  const stats = {
    byType: corrections.reduce((acc, c) => {
      acc[c.type] = (acc[c.type] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    byStatus: corrections.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  return (
    <div className="space-y-6">
      {/* 요약 카드 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                수정 내역 상세
              </CardTitle>
              <CardDescription>{fileName}</CardDescription>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">
                {fixedErrors} / {totalErrors}
              </p>
              <p className="text-sm text-muted-foreground">오류 수정</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">성공률</p>
              <p className="text-xl font-semibold">
                {totalErrors > 0 ? Math.round((fixedErrors / totalErrors) * 100) : 0}%
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">수식 오류</p>
              <p className="text-xl font-semibold">{stats.byType.formula || 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">데이터 오류</p>
              <p className="text-xl font-semibold">{stats.byType.data || 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">참조 오류</p>
              <p className="text-xl font-semibold">{stats.byType.reference || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 필터 및 상세 내역 */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <CardTitle>오류별 수정 내역</CardTitle>
            <div className="flex gap-2">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-1 border rounded-md text-sm"
              >
                <option value="all">모든 유형</option>
                <option value="formula">수식 오류</option>
                <option value="data">데이터 오류</option>
                <option value="format">형식 오류</option>
                <option value="reference">참조 오류</option>
                <option value="vba">VBA 오류</option>
              </select>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-1 border rounded-md text-sm"
              >
                <option value="all">모든 상태</option>
                <option value="fixed">수정 완료</option>
                <option value="partially_fixed">부분 수정</option>
                <option value="failed">수정 실패</option>
                <option value="skipped">건너뜀</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-3">
              {filteredCorrections.map((correction) => {
                const TypeIcon = errorTypeIcons[correction.type]
                const StatusIcon = statusIcons[correction.status]
                const isExpanded = expandedItems.has(correction.id)

                return (
                  <div 
                    key={correction.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div 
                      className="flex items-start justify-between cursor-pointer"
                      onClick={() => toggleExpanded(correction.id)}
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <TypeIcon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={severityColors[correction.severity]}>
                              {correction.severity === 'error' ? '오류' : 
                               correction.severity === 'warning' ? '경고' : '정보'}
                            </Badge>
                            <Badge variant="outline">
                              {correction.location.sheet}
                              {correction.location.cell && ` - ${correction.location.cell}`}
                              {correction.location.range && ` - ${correction.location.range}`}
                            </Badge>
                            <div className="flex items-center gap-1">
                              <StatusIcon className={`h-4 w-4 ${
                                correction.status === 'fixed' ? 'text-green-600' :
                                correction.status === 'partially_fixed' ? 'text-yellow-600' :
                                correction.status === 'failed' ? 'text-red-600' :
                                'text-gray-600'
                              }`} />
                              <span className="text-sm">
                                {statusLabels[correction.status]}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm font-medium">{correction.description}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {correction.reason}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon">
                        {isExpanded ? 
                          <ChevronDown className="h-4 w-4" /> : 
                          <ChevronRight className="h-4 w-4" />
                        }
                      </Button>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 pl-8 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* 원본 */}
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-red-600">원본</h4>
                            <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-md">
                              <code className="text-sm">
                                {correction.original.value}
                              </code>
                              {correction.original.formula && (
                                <div className="mt-2 pt-2 border-t">
                                  <p className="text-xs text-muted-foreground">수식:</p>
                                  <code className="text-xs">{correction.original.formula}</code>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 수정본 */}
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-green-600">수정본</h4>
                            <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-md">
                              <code className="text-sm">
                                {correction.corrected.value}
                              </code>
                              {correction.corrected.formula && (
                                <div className="mt-2 pt-2 border-t">
                                  <p className="text-xs text-muted-foreground">수식:</p>
                                  <code className="text-xs">{correction.corrected.formula}</code>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 신뢰도 */}
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">신뢰도:</span>
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 max-w-xs">
                            <div 
                              className={`h-2 rounded-full ${
                                correction.confidence >= 0.8 ? 'bg-green-500' :
                                correction.confidence >= 0.6 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${correction.confidence * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">
                            {Math.round(correction.confidence * 100)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {filteredCorrections.length === 0 && (
                <div className="text-center py-8">
                  <Info className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    선택한 조건에 해당하는 수정 내역이 없습니다.
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}