'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  ChevronDown, 
  ChevronUp,
  Eye,
  Lightbulb,
  CheckCircle
} from 'lucide-react'
import { useState } from 'react'
import { useFileStore } from '@/lib/stores/fileStore'
import { AnalysisResult } from '@/lib/services/interfaces'

interface AnalysisResultsListProps {
  results: AnalysisResult[]
}

export function AnalysisResultsList({ results }: AnalysisResultsListProps) {
  const { selectedFixes, toggleFix, selectAllFixes, deselectAllFixes } = useFileStore()
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [previewItem, setPreviewItem] = useState<string | null>(null)
  
  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedItems)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setExpandedItems(newSet)
  }
  
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'medium':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      default:
        return <Info className="h-5 w-5 text-blue-500" />
    }
  }
  
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return <Badge variant="destructive">높음</Badge>
      case 'medium':
        return <Badge variant="warning">중간</Badge>
      default:
        return <Badge variant="secondary">낮음</Badge>
    }
  }
  
  const autoFixableResults = results.filter(r => r.canAutoFix)
  const allSelected = autoFixableResults.length > 0 && 
    autoFixableResults.every(r => selectedFixes.has(r.id))
  
  return (
    <div className="space-y-4">
      {/* Header with select all */}
      {autoFixableResults.length > 0 && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={allSelected}
              onCheckedChange={(checked) => {
                if (checked) {
                  selectAllFixes()
                } else {
                  deselectAllFixes()
                }
              }}
            />
            <label className="text-sm font-medium">
              모두 선택 ({autoFixableResults.length}개 자동 수정 가능)
            </label>
          </div>
        </div>
      )}
      
      {/* Results list */}
      {results.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">문제가 발견되지 않았습니다</h3>
            <p className="text-muted-foreground">
              파일이 깨끗한 상태입니다!
            </p>
          </CardContent>
        </Card>
      ) : (
        results.map((result) => (
          <Card key={result.id} className="transition-all hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {result.canAutoFix && (
                    <Checkbox
                      checked={selectedFixes.has(result.id)}
                      onCheckedChange={() => toggleFix(result.id)}
                      className="mt-1"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getSeverityIcon(result.severity)}
                      <CardTitle className="text-base">{result.location}</CardTitle>
                      {getSeverityBadge(result.severity)}
                      {result.canAutoFix && (
                        <Badge variant="outline" className="text-green-600">
                          자동 수정 가능
                        </Badge>
                      )}
                    </div>
                    <CardDescription>{result.description}</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpand(result.id)}
                  >
                    {expandedItems.has(result.id) ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            {expandedItems.has(result.id) && (
              <CardContent className="pt-0">
                <div className="space-y-3 ml-7">
                  {result.suggestion && (
                    <div className="flex items-start space-x-2">
                      <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">제안 사항</p>
                        <p className="text-sm text-muted-foreground">{result.suggestion}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewItem(result.id)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      수정 미리보기
                    </Button>
                    {!result.canAutoFix && (
                      <Button variant="outline" size="sm">
                        수정 가이드 보기
                      </Button>
                    )}
                  </div>
                  
                  {previewItem === result.id && (
                    <div className="mt-3 p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-2">수정 전후 비교</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="p-2 bg-red-50 dark:bg-red-950 rounded">
                          <p className="font-mono">수정 전 코드</p>
                        </div>
                        <div className="p-2 bg-green-50 dark:bg-green-950 rounded">
                          <p className="font-mono">수정 후 코드</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        ))
      )}
    </div>
  )
}