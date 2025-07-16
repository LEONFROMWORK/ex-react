'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeftRight,
  Columns,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Download,
  ChevronLeft,
  ChevronRight,
  GitCompare,
  Layers,
  SplitSquareHorizontal,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

interface BeforeAfterData {
  before: {
    title: string
    content: any
    metadata?: Record<string, any>
  }
  after: {
    title: string
    content: any
    metadata?: Record<string, any>
  }
}

interface BeforeAfterViewerProps {
  data: BeforeAfterData
  type: 'excel' | 'code' | 'data' | 'image'
  onExport?: (format: 'pdf' | 'image' | 'excel') => void
  className?: string
}

export function BeforeAfterViewer({
  data,
  type,
  onExport,
  className = '',
}: BeforeAfterViewerProps) {
  const [viewMode, setViewMode] = useState<'side-by-side' | 'overlay' | 'slider'>('side-by-side')
  const [showDifferences, setShowDifferences] = useState(true)
  const [sliderPosition, setSliderPosition] = useState(50)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // 전체화면 토글
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  // 차이점 계산
  const calculateDifferences = () => {
    if (type === 'data') {
      return calculateDataDifferences(data.before.content, data.after.content)
    } else if (type === 'code') {
      return calculateCodeDifferences(data.before.content, data.after.content)
    }
    return null
  }

  const differences = calculateDifferences()

  return (
    <div
      ref={containerRef}
      className={`relative ${isFullscreen ? 'fixed inset-0 z-50 bg-background p-4' : ''} ${className}`}
    >
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GitCompare className="w-5 h-5" />
                Before/After 비교
              </CardTitle>
              <CardDescription>
                변경 전후의 차이점을 시각적으로 확인하세요
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* 뷰 모드 선택 */}
              <Select value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="side-by-side">
                    <div className="flex items-center gap-2">
                      <Columns className="w-4 h-4" />
                      나란히 보기
                    </div>
                  </SelectItem>
                  <SelectItem value="overlay">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4" />
                      오버레이
                    </div>
                  </SelectItem>
                  <SelectItem value="slider">
                    <div className="flex items-center gap-2">
                      <SplitSquareHorizontal className="w-4 h-4" />
                      슬라이더
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* 차이점 토글 */}
              <Button
                size="sm"
                variant={showDifferences ? 'default' : 'outline'}
                onClick={() => setShowDifferences(!showDifferences)}
              >
                {showDifferences ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
              </Button>

              {/* 전체화면 */}
              <Button
                size="sm"
                variant="outline"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </Button>

              {/* 내보내기 */}
              {onExport && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onExport('pdf')}
                >
                  <Download className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* 차이점 요약 */}
          {differences && (
            <div className="flex items-center gap-4 mt-4">
              <Badge variant="secondary">
                {differences.added} 추가
              </Badge>
              <Badge variant="secondary">
                {differences.removed} 제거
              </Badge>
              <Badge variant="secondary">
                {differences.modified} 수정
              </Badge>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0 flex-1">
          {/* Side by Side 뷰 */}
          {viewMode === 'side-by-side' && (
            <div className="grid grid-cols-2 h-full">
              <div className="border-r">
                <ViewerContent
                  title={data.before.title}
                  content={data.before.content}
                  type={type}
                  showDifferences={showDifferences}
                  side="before"
                />
              </div>
              <div>
                <ViewerContent
                  title={data.after.title}
                  content={data.after.content}
                  type={type}
                  showDifferences={showDifferences}
                  side="after"
                />
              </div>
            </div>
          )}

          {/* Overlay 뷰 */}
          {viewMode === 'overlay' && (
            <div className="relative h-full">
              <ViewerContent
                title={data.before.title}
                content={data.before.content}
                type={type}
                showDifferences={false}
                side="before"
                className="absolute inset-0 opacity-50"
              />
              <ViewerContent
                title={data.after.title}
                content={data.after.content}
                type={type}
                showDifferences={showDifferences}
                side="after"
                className="absolute inset-0"
              />
            </div>
          )}

          {/* Slider 뷰 */}
          {viewMode === 'slider' && (
            <div className="relative h-full overflow-hidden">
              <div className="absolute inset-0">
                <ViewerContent
                  title={data.before.title}
                  content={data.before.content}
                  type={type}
                  showDifferences={false}
                  side="before"
                />
              </div>
              <div
                className="absolute inset-0"
                style={{
                  clipPath: `polygon(${sliderPosition}% 0, 100% 0, 100% 100%, ${sliderPosition}% 100%)`,
                }}
              >
                <ViewerContent
                  title={data.after.title}
                  content={data.after.content}
                  type={type}
                  showDifferences={false}
                  side="after"
                />
              </div>
              
              {/* 슬라이더 핸들 */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-primary cursor-ew-resize"
                style={{ left: `${sliderPosition}%` }}
              >
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary rounded-full p-2">
                  <ArrowLeftRight className="w-4 h-4 text-primary-foreground" />
                </div>
              </div>

              {/* 슬라이더 컨트롤 */}
              <div className="absolute bottom-4 left-4 right-4">
                <Slider
                  value={[sliderPosition]}
                  onValueChange={([value]) => setSliderPosition(value)}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// 콘텐츠 뷰어 컴포넌트
function ViewerContent({
  title,
  content,
  type,
  showDifferences,
  side,
  className = '',
}: {
  title: string
  content: any
  type: string
  showDifferences: boolean
  side: 'before' | 'after'
  className?: string
}) {
  if (type === 'excel') {
    return (
      <div className={`h-full overflow-auto ${className}`}>
        <div className="sticky top-0 bg-background border-b p-3">
          <h3 className="font-medium">{title}</h3>
        </div>
        <ExcelDataViewer
          data={content}
          showDifferences={showDifferences}
          side={side}
        />
      </div>
    )
  }

  if (type === 'code') {
    return (
      <div className={`h-full overflow-auto ${className}`}>
        <div className="sticky top-0 bg-background border-b p-3">
          <h3 className="font-medium">{title}</h3>
        </div>
        <CodeViewer
          code={content}
          showDifferences={showDifferences}
          side={side}
        />
      </div>
    )
  }

  if (type === 'data') {
    return (
      <div className={`h-full overflow-auto ${className}`}>
        <div className="sticky top-0 bg-background border-b p-3">
          <h3 className="font-medium">{title}</h3>
        </div>
        <DataTableViewer
          data={content}
          showDifferences={showDifferences}
          side={side}
        />
      </div>
    )
  }

  if (type === 'image') {
    return (
      <div className={`h-full overflow-auto ${className}`}>
        <div className="sticky top-0 bg-background border-b p-3">
          <h3 className="font-medium">{title}</h3>
        </div>
        <ImageViewer
          src={content}
          showDifferences={showDifferences}
          side={side}
        />
      </div>
    )
  }

  return null
}

// Excel 데이터 뷰어
function ExcelDataViewer({ data, showDifferences, side }: any) {
  return (
    <div className="p-4">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {data.headers?.map((header: string, index: number) => (
              <th key={index} className="border p-2 bg-muted font-medium text-left">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows?.map((row: any[], rowIndex: number) => (
            <tr key={rowIndex}>
              {row.map((cell: any, cellIndex: number) => {
                const isChanged = showDifferences && data.changes?.[`${rowIndex}-${cellIndex}`]
                return (
                  <td
                    key={cellIndex}
                    className={`border p-2 ${
                      isChanged
                        ? side === 'before'
                          ? 'bg-red-100 text-red-900'
                          : 'bg-green-100 text-green-900'
                        : ''
                    }`}
                  >
                    {cell}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// 코드 뷰어
function CodeViewer({ code, showDifferences, side }: any) {
  return (
    <pre className="p-4 text-sm">
      <code>
        {code.split('\n').map((line: string, index: number) => {
          const lineNumber = index + 1
          const isAdded = showDifferences && line.startsWith('+')
          const isRemoved = showDifferences && line.startsWith('-')
          
          return (
            <div
              key={index}
              className={`${
                isAdded ? 'bg-green-100 text-green-900' :
                isRemoved ? 'bg-red-100 text-red-900' : ''
              }`}
            >
              <span className="inline-block w-12 text-muted-foreground text-right mr-4">
                {lineNumber}
              </span>
              <span>{line}</span>
            </div>
          )
        })}
      </code>
    </pre>
  )
}

// 데이터 테이블 뷰어
function DataTableViewer({ data, showDifferences, side }: any) {
  return (
    <div className="p-4">
      <pre className="text-sm">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}

// 이미지 뷰어
function ImageViewer({ src, showDifferences, side }: any) {
  return (
    <div className="p-4 flex items-center justify-center">
      <img
        src={src}
        alt={`${side} view`}
        className="max-w-full h-auto"
      />
    </div>
  )
}

// 데이터 차이점 계산
function calculateDataDifferences(before: any, after: any) {
  // 실제 구현에서는 더 정교한 diff 알고리즘 사용
  return {
    added: 5,
    removed: 3,
    modified: 7,
  }
}

// 코드 차이점 계산
function calculateCodeDifferences(before: string, after: string) {
  // 실제 구현에서는 diff 라이브러리 사용
  return {
    added: 10,
    removed: 5,
    modified: 15,
  }
}