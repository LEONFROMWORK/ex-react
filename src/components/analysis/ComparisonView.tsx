"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  FileSpreadsheet, 
  GitCompare, 
  Eye, 
  EyeOff,
  Download,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  ArrowUpDown
} from 'lucide-react'

interface ComparisonViewProps {
  originalData: {
    sheets: Array<{
      name: string
      data: any[][]
      errors: Array<{
        cell: string
        type: string
        message: string
      }>
    }>
  }
  correctedData: {
    sheets: Array<{
      name: string
      data: any[][]
      corrections: Array<{
        cell: string
        original: any
        corrected: any
        type: string
      }>
    }>
  }
}

export function ComparisonView({ originalData, correctedData }: ComparisonViewProps) {
  const [activeSheet, setActiveSheet] = useState(0)
  const [viewMode, setViewMode] = useState<'side-by-side' | 'overlay' | 'diff'>('side-by-side')
  const [showOnlyChanges, setShowOnlyChanges] = useState(false)
  const [highlightChanges, setHighlightChanges] = useState(true)

  const currentOriginalSheet = originalData.sheets[activeSheet]
  const currentCorrectedSheet = correctedData.sheets[activeSheet]

  // 변경된 셀 추적
  const changedCells = new Set(
    currentCorrectedSheet.corrections.map(c => c.cell)
  )

  // 셀 스타일 결정
  const getCellStyle = (row: number, col: number, isOriginal: boolean) => {
    const cellAddress = `${String.fromCharCode(65 + col)}${row + 1}`
    const hasChange = changedCells.has(cellAddress)

    if (!highlightChanges) return ''

    if (hasChange) {
      if (isOriginal) {
        return 'bg-red-100 dark:bg-red-900/20 border-red-300'
      } else {
        return 'bg-green-100 dark:bg-green-900/20 border-green-300'
      }
    }

    return ''
  }

  // 셀 값 렌더링
  const renderCell = (value: any, row: number, col: number, isOriginal: boolean) => {
    const cellAddress = `${String.fromCharCode(65 + col)}${row + 1}`
    const correction = currentCorrectedSheet.corrections.find(c => c.cell === cellAddress)

    if (showOnlyChanges && !correction) {
      return null
    }

    return (
      <td 
        key={`${row}-${col}`}
        className={`border px-2 py-1 text-sm ${getCellStyle(row, col, isOriginal)}`}
      >
        {value !== null && value !== undefined ? String(value) : ''}
        {correction && !isOriginal && (
          <span className="ml-2 text-xs text-green-600">수정됨</span>
        )}
      </td>
    )
  }

  return (
    <div className="space-y-4">
      {/* 헤더 및 컨트롤 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <GitCompare className="h-5 w-5" />
              원본/수정본 비교
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'side-by-side' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('side-by-side')}
              >
                나란히 보기
              </Button>
              <Button
                variant={viewMode === 'overlay' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('overlay')}
              >
                겹쳐 보기
              </Button>
              <Button
                variant={viewMode === 'diff' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('diff')}
              >
                차이점만
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={highlightChanges}
                  onChange={(e) => setHighlightChanges(e.target.checked)}
                  className="rounded"
                />
                변경사항 강조
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showOnlyChanges}
                  onChange={(e) => setShowOnlyChanges(e.target.checked)}
                  className="rounded"
                />
                변경된 셀만 표시
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-red-100 text-red-700">
                원본
              </Badge>
              <Badge variant="outline" className="bg-green-100 text-green-700">
                수정본
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 시트 탭 */}
      <Tabs value={String(activeSheet)} onValueChange={(v) => setActiveSheet(Number(v))}>
        <TabsList className="grid grid-cols-auto gap-2">
          {originalData.sheets.map((sheet, index) => (
            <TabsTrigger key={index} value={String(index)}>
              {sheet.name}
              {currentCorrectedSheet.corrections.length > 0 && index === activeSheet && (
                <Badge variant="secondary" className="ml-2">
                  {currentCorrectedSheet.corrections.length}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* 비교 뷰 */}
        <TabsContent value={String(activeSheet)}>
          {viewMode === 'side-by-side' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* 원본 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">원본</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <table className="w-full border-collapse">
                      <tbody>
                        {currentOriginalSheet.data.map((row, rowIndex) => (
                          <tr key={rowIndex}>
                            <td className="border px-2 py-1 bg-gray-50 dark:bg-gray-800 font-medium text-xs">
                              {rowIndex + 1}
                            </td>
                            {row.map((cell, colIndex) => 
                              renderCell(cell, rowIndex, colIndex, true)
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* 수정본 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">수정본</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <table className="w-full border-collapse">
                      <tbody>
                        {currentCorrectedSheet.data.map((row, rowIndex) => (
                          <tr key={rowIndex}>
                            <td className="border px-2 py-1 bg-gray-50 dark:bg-gray-800 font-medium text-xs">
                              {rowIndex + 1}
                            </td>
                            {row.map((cell, colIndex) => 
                              renderCell(cell, rowIndex, colIndex, false)
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}

          {viewMode === 'overlay' && (
            <Card>
              <CardContent className="pt-6">
                <ScrollArea className="h-[600px]">
                  <table className="w-full border-collapse">
                    <tbody>
                      {currentCorrectedSheet.data.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          <td className="border px-2 py-1 bg-gray-50 dark:bg-gray-800 font-medium text-xs">
                            {rowIndex + 1}
                          </td>
                          {row.map((cell, colIndex) => {
                            const cellAddress = `${String.fromCharCode(65 + colIndex)}${rowIndex + 1}`
                            const correction = currentCorrectedSheet.corrections.find(c => c.cell === cellAddress)
                            
                            return (
                              <td 
                                key={`${rowIndex}-${colIndex}`}
                                className={`border px-2 py-1 text-sm ${getCellStyle(rowIndex, colIndex, false)}`}
                              >
                                {correction ? (
                                  <div className="space-y-1">
                                    <div className="line-through text-red-600">
                                      {correction.original}
                                    </div>
                                    <div className="text-green-600">
                                      {correction.corrected}
                                    </div>
                                  </div>
                                ) : (
                                  cell
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {viewMode === 'diff' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">변경 사항</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <div className="space-y-3">
                    {currentCorrectedSheet.corrections.map((correction, index) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline">{correction.cell}</Badge>
                          <Badge variant="secondary">{correction.type}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">원본</p>
                            <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded text-sm">
                              {correction.original}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">수정</p>
                            <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded text-sm">
                              {correction.corrected}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}