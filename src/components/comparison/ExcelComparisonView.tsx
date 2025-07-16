'use client'

import React, { useState } from 'react'
import { BeforeAfterViewer } from './BeforeAfterViewer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  FileSpreadsheet,
  GitCompare,
  Download,
  RefreshCw,
  Save,
  History,
  ArrowRight,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

interface ExcelComparisonViewProps {
  originalFile?: {
    name: string
    data: any
    metadata?: any
  }
  generatedFile?: {
    name: string
    data: any
    metadata?: any
  }
  changes?: {
    prompt?: string
    modifications?: string[]
    timestamp?: Date
  }
}

export function ExcelComparisonView({
  originalFile,
  generatedFile,
  changes,
}: ExcelComparisonViewProps) {
  const [activeTab, setActiveTab] = useState('comparison')
  const [showHistory, setShowHistory] = useState(false)

  // Mock 데이터 (실제로는 props에서 받음)
  const mockOriginal = originalFile || {
    name: '원본_데이터.xlsx',
    data: {
      headers: ['날짜', '제품', '수량', '가격', '합계'],
      rows: [
        ['2024-01-01', '제품A', 10, 1000, 10000],
        ['2024-01-02', '제품B', 5, 2000, 10000],
        ['2024-01-03', '제품C', 8, 1500, 12000],
      ],
    },
  }

  const mockGenerated = generatedFile || {
    name: 'AI_생성_보고서.xlsx',
    data: {
      headers: ['날짜', '제품', '수량', '가격', '합계', '누적합계', '성장률'],
      rows: [
        ['2024-01-01', '제품A', 10, 1000, 10000, 10000, '0%'],
        ['2024-01-02', '제품B', 5, 2000, 10000, 20000, '0%'],
        ['2024-01-03', '제품C', 8, 1500, 12000, 32000, '20%'],
        ['2024-01-04', '제품D', 12, 1800, 21600, 53600, '80%'],
      ],
      changes: {
        '3-0': true, // 새로운 행
        '0-5': true, // 새로운 열
        '0-6': true, // 새로운 열
      },
    },
  }

  const handleExport = (format: 'pdf' | 'image' | 'excel') => {
    toast.success(`${format.toUpperCase()} 형식으로 내보내기를 시작합니다`)
    // 실제 내보내기 로직
  }

  const handleSaveChanges = () => {
    toast.success('변경사항이 저장되었습니다')
    // 실제 저장 로직
  }

  const handleRegenerate = () => {
    toast.info('AI가 다시 생성하고 있습니다...')
    // 재생성 로직
  }

  return (
    <div className="space-y-6">
      {/* 헤더 정보 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <FileSpreadsheet className="w-8 h-8 text-primary" />
              <div>
                <CardTitle>Excel 파일 비교</CardTitle>
                <CardDescription>
                  AI가 생성한 파일과 원본 파일의 차이점을 확인하세요
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleRegenerate}>
                <RefreshCw className="w-4 h-4 mr-2" />
                재생성
              </Button>
              <Button size="sm" onClick={handleSaveChanges}>
                <Save className="w-4 h-4 mr-2" />
                저장
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 원본 파일 정보 */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">원본 파일</h4>
                <Badge variant="secondary">Before</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{mockOriginal.name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {mockOriginal.data.rows.length}행 × {mockOriginal.data.headers.length}열
              </p>
            </div>

            {/* 변환 정보 */}
            <div className="p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <ArrowRight className="w-8 h-8 mx-auto text-primary mb-2" />
                  <p className="text-sm font-medium">AI 변환</p>
                  {changes?.prompt && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      "{changes.prompt}"
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 생성된 파일 정보 */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">생성된 파일</h4>
                <Badge variant="default">After</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{mockGenerated.name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {mockGenerated.data.rows.length}행 × {mockGenerated.data.headers.length}열
              </p>
            </div>
          </div>

          {/* 변경 사항 요약 */}
          {changes?.modifications && changes.modifications.length > 0 && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <h4 className="text-sm font-medium mb-2">주요 변경사항</h4>
              <ul className="space-y-1">
                {changes.modifications.map((mod, index) => (
                  <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span>•</span>
                    <span>{mod}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 비교 뷰어 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="comparison">
            <GitCompare className="w-4 h-4 mr-2" />
            비교 보기
          </TabsTrigger>
          <TabsTrigger value="original">
            원본 파일
          </TabsTrigger>
          <TabsTrigger value="generated">
            생성된 파일
          </TabsTrigger>
        </TabsList>

        <TabsContent value="comparison" className="mt-4">
          <BeforeAfterViewer
            data={{
              before: {
                title: mockOriginal.name,
                content: mockOriginal.data,
              },
              after: {
                title: mockGenerated.name,
                content: mockGenerated.data,
              },
            }}
            type="excel"
            onExport={handleExport}
          />
        </TabsContent>

        <TabsContent value="original" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{mockOriginal.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {mockOriginal.data.headers.map((header: string, index: number) => (
                        <th key={index} className="border p-2 bg-muted font-medium text-left">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {mockOriginal.data.rows.map((row: any[], rowIndex: number) => (
                      <tr key={rowIndex}>
                        {row.map((cell: any, cellIndex: number) => (
                          <td key={cellIndex} className="border p-2">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="generated" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{mockGenerated.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {mockGenerated.data.headers.map((header: string, index: number) => (
                        <th key={index} className="border p-2 bg-muted font-medium text-left">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {mockGenerated.data.rows.map((row: any[], rowIndex: number) => (
                      <tr key={rowIndex}>
                        {row.map((cell: any, cellIndex: number) => (
                          <td 
                            key={cellIndex} 
                            className={`border p-2 ${
                              mockGenerated.data.changes?.[`${rowIndex}-${cellIndex}`]
                                ? 'bg-green-100'
                                : ''
                            }`}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 변경 이력 */}
      <Card>
        <CardHeader>
          <Button
            variant="ghost"
            className="w-full justify-between"
            onClick={() => setShowHistory(!showHistory)}
          >
            <div className="flex items-center gap-2">
              <History className="w-4 h-4" />
              <span>변경 이력</span>
            </div>
            <Badge variant="secondary">3</Badge>
          </Button>
        </CardHeader>
        {showHistory && (
          <CardContent className="pt-0">
            <div className="space-y-3">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 border rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">누적 합계 열 추가</p>
                  <p className="text-xs text-muted-foreground">5분 전</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  프롬프트: "누적 합계를 보여주는 열을 추가해줘"
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="p-3 border rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">성장률 계산 추가</p>
                  <p className="text-xs text-muted-foreground">10분 전</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  프롬프트: "전일 대비 성장률을 계산해서 추가해줘"
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="p-3 border rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">초기 생성</p>
                  <p className="text-xs text-muted-foreground">15분 전</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  프롬프트: "이 데이터로 판매 보고서를 만들어줘"
                </p>
              </motion.div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}