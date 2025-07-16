'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Download, 
  FileSpreadsheet, 
  Calendar,
  Clock,
  Sparkles,
  FileText,
  MoreVertical,
  Trash2,
  Eye
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

interface GeneratedFile {
  id: string
  fileName: string
  fileSize: number
  generatedAt: Date
  type: 'prompt' | 'template'
  source: string
  downloadUrl: string
  tokensUsed?: number
}

export function RecentGenerations() {
  const [recentFiles, setRecentFiles] = useState<GeneratedFile[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchRecentGenerations()
  }, [])

  const fetchRecentGenerations = async () => {
    try {
      // Mock data for demonstration
      const mockData: GeneratedFile[] = [
        {
          id: '1',
          fileName: '2024년_월간_매출_보고서.xlsx',
          fileSize: 245760,
          generatedAt: new Date(Date.now() - 1000 * 60 * 30), // 30분 전
          type: 'prompt',
          source: '2024년 월별 매출 데이터와 성장률을 보여주는...',
          downloadUrl: '#',
          tokensUsed: 156,
        },
        {
          id: '2',
          fileName: '재무_보고서_템플릿.xlsx',
          fileSize: 189440,
          generatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2시간 전
          type: 'template',
          source: '월간 재무 보고서',
          downloadUrl: '#',
        },
        {
          id: '3',
          fileName: '프로젝트_일정_관리.xlsx',
          fileSize: 307200,
          generatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1일 전
          type: 'prompt',
          source: '10개 작업의 프로젝트 일정 관리 Excel을 만들어...',
          downloadUrl: '#',
          tokensUsed: 203,
        },
      ]
      setRecentFiles(mockData)
    } catch (error) {
      toast.error('최근 생성 파일을 불러오는데 실패했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  const formatFileSize = (bytes: number): string => {
    const kb = bytes / 1024
    if (kb < 1024) {
      return `${kb.toFixed(1)} KB`
    }
    return `${(kb / 1024).toFixed(1)} MB`
  }

  const handleDownload = (file: GeneratedFile) => {
    // 실제 다운로드 로직
    toast.success(`${file.fileName} 다운로드를 시작합니다`)
    window.open(file.downloadUrl, '_blank')
  }

  const handleDelete = async (fileId: string) => {
    try {
      // API 호출
      await fetch(`/api/excel/generations/${fileId}`, { method: 'DELETE' })
      
      setRecentFiles(prev => prev.filter(f => f.id !== fileId))
      toast.success('파일이 삭제되었습니다')
    } catch (error) {
      toast.error('파일 삭제에 실패했습니다')
    }
  }

  const handlePreview = (file: GeneratedFile) => {
    toast.info('미리보기 기능은 준비 중입니다')
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>최근 생성된 파일</CardTitle>
          <CardDescription>AI로 생성한 Excel 파일 목록</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center gap-4 p-4 rounded-lg border">
                  <div className="w-10 h-10 bg-muted rounded" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>최근 생성된 파일</CardTitle>
            <CardDescription>AI로 생성한 Excel 파일 목록</CardDescription>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Clock className="w-3 h-3" />
            최근 30일
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {recentFiles.length === 0 ? (
          <div className="text-center py-8">
            <FileSpreadsheet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">아직 생성된 파일이 없습니다</p>
            <p className="text-sm text-muted-foreground mt-1">
              AI 프롬프트나 템플릿을 사용하여 첫 Excel 파일을 만들어보세요
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentFiles.map((file, index) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                  {/* File Icon */}
                  <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate">{file.fileName}</h4>
                      <Badge variant={file.type === 'prompt' ? 'default' : 'secondary'} className="text-xs">
                        {file.type === 'prompt' ? (
                          <>
                            <Sparkles className="w-3 h-3 mr-1" />
                            AI 생성
                          </>
                        ) : (
                          <>
                            <FileText className="w-3 h-3 mr-1" />
                            템플릿
                          </>
                        )}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDistanceToNow(file.generatedAt, { addSuffix: true, locale: ko })}
                      </span>
                      <span>{formatFileSize(file.fileSize)}</span>
                      {file.tokensUsed && (
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          {file.tokensUsed} 토큰
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {file.type === 'prompt' ? '프롬프트: ' : '템플릿: '}
                      {file.source}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(file)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handlePreview(file)}>
                          <Eye className="w-4 h-4 mr-2" />
                          미리보기
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownload(file)}>
                          <Download className="w-4 h-4 mr-2" />
                          다운로드
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(file.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}