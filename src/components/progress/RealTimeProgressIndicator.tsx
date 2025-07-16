'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Activity,
  CheckCircle,
  Clock,
  FileSpreadsheet,
  Loader2,
  Pause,
  Play,
  X,
  Zap,
  TrendingUp,
  HardDrive,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
// import { formatBytes, formatDuration } from '@/lib/utils'

export interface ProgressData {
  taskId: string
  taskType: 'excel-generation' | 'vba-extraction' | 'vba-analysis' | 'file-processing'
  phase: 'initializing' | 'processing' | 'finalizing' | 'completed' | 'error'
  progress: {
    current: number
    total: number
    percentage: number
  }
  details?: {
    currentSheet?: number
    totalSheets?: number
    currentRow?: number
    totalRows?: number
    bytesProcessed?: number
    estimatedTimeRemaining?: number
  }
  startTime: number
  message?: string
  error?: string
}

interface RealTimeProgressIndicatorProps {
  taskId: string
  onCancel?: () => void
  onComplete?: (result: any) => void
  compact?: boolean
}

export function RealTimeProgressIndicator({
  taskId,
  onCancel,
  onComplete,
  compact = false,
}: RealTimeProgressIndicatorProps) {
  const [progressData, setProgressData] = useState<ProgressData | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [memoryUsage, setMemoryUsage] = useState<any>(null)

  useEffect(() => {
    // WebSocket 연결은 다음 단계에서 구현
    // 여기서는 시뮬레이션으로 진행
    simulateProgress()

    const timer = setInterval(() => {
      if (progressData && progressData.phase !== 'completed' && !isPaused) {
        setElapsedTime(Date.now() - progressData.startTime)
      }
    }, 100)

    return () => {
      clearInterval(timer)
    }
  }, [taskId, isPaused])

  const simulateProgress = () => {
    // 실제로는 WebSocket으로 받을 데이터
    const mockProgress: ProgressData = {
      taskId,
      taskType: 'excel-generation',
      phase: 'processing',
      progress: {
        current: 0,
        total: 100,
        percentage: 0,
      },
      details: {
        currentSheet: 1,
        totalSheets: 3,
        currentRow: 0,
        totalRows: 10000,
        bytesProcessed: 0,
        estimatedTimeRemaining: 60,
      },
      startTime: Date.now(),
      message: 'Excel 파일을 생성하고 있습니다...',
    }

    setProgressData(mockProgress)

    // 진행률 시뮬레이션
    let progress = 0
    const interval = setInterval(() => {
      if (isPaused) return

      progress += Math.random() * 5
      if (progress >= 100) {
        progress = 100
        clearInterval(interval)
        
        setProgressData(prev => ({
          ...prev!,
          phase: 'completed',
          progress: { ...prev!.progress, percentage: 100 },
          message: 'Excel 파일 생성이 완료되었습니다!',
        }))

        if (onComplete) {
          onComplete({ success: true })
        }
      } else {
        setProgressData(prev => ({
          ...prev!,
          progress: {
            current: progress,
            total: 100,
            percentage: Math.round(progress),
          },
          details: {
            ...prev!.details,
            currentRow: Math.round((progress / 100) * 10000),
            bytesProcessed: Math.round((progress / 100) * 5 * 1024 * 1024),
            estimatedTimeRemaining: Math.max(0, 60 - Math.round(progress * 0.6)),
          },
        }))
      }
    }, 500)
  }

  const handlePause = () => {
    setIsPaused(!isPaused)
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    }
  }

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'initializing':
        return <Loader2 className="w-4 h-4 animate-spin" />
      case 'processing':
        return <Activity className="w-4 h-4 animate-pulse" />
      case 'finalizing':
        return <Zap className="w-4 h-4" />
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'error':
        return <X className="w-4 h-4 text-red-600" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'completed':
        return 'text-green-600'
      case 'error':
        return 'text-red-600'
      default:
        return 'text-blue-600'
    }
  }

  if (!progressData) {
    return null
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
        <div className="flex-shrink-0">
          {getPhaseIcon(progressData.phase)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {progressData.message || '처리 중...'}
          </p>
          <Progress value={progressData.progress.percentage} className="h-1 mt-1" />
        </div>
        <Badge variant="secondary" className="flex-shrink-0">
          {progressData.progress.percentage}%
        </Badge>
      </div>
    )
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-primary/10 ${getPhaseColor(progressData.phase)}`}>
                  {getPhaseIcon(progressData.phase)}
                </div>
                <div>
                  <CardTitle className="text-lg">
                    {progressData.taskType === 'excel-generation' && 'Excel 생성'}
                    {progressData.taskType === 'vba-extraction' && 'VBA 추출'}
                    {progressData.taskType === 'vba-analysis' && 'VBA 분석'}
                    {progressData.taskType === 'file-processing' && '파일 처리'}
                  </CardTitle>
                  <CardDescription>{progressData.message}</CardDescription>
                </div>
              </div>
              <div className="flex gap-2">
                {progressData.phase === 'processing' && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handlePause}
                    >
                      {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancel}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* 메인 진행률 바 */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">전체 진행률</span>
                <span className="font-medium">{progressData.progress.percentage}%</span>
              </div>
              <Progress 
                value={progressData.progress.percentage} 
                className="h-3"
              />
            </div>

            {/* 상세 정보 */}
            {progressData.details && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {progressData.details.totalSheets && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">시트</p>
                    <p className="text-sm font-medium">
                      {progressData.details.currentSheet} / {progressData.details.totalSheets}
                    </p>
                  </div>
                )}
                
                {progressData.details.totalRows && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">행</p>
                    <p className="text-sm font-medium">
                      {progressData.details.currentRow?.toLocaleString()} / {progressData.details.totalRows.toLocaleString()}
                    </p>
                  </div>
                )}
                
                {progressData.details.bytesProcessed !== undefined && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">처리된 데이터</p>
                    <p className="text-sm font-medium">
                      {formatBytes(progressData.details.bytesProcessed)}
                    </p>
                  </div>
                )}
                
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">경과 시간</p>
                  <p className="text-sm font-medium">
                    {formatDuration(elapsedTime)}
                  </p>
                </div>
              </div>
            )}

            {/* 예상 시간 */}
            {progressData.details?.estimatedTimeRemaining !== undefined && 
             progressData.phase === 'processing' && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">예상 남은 시간</span>
                </div>
                <span className="text-sm font-medium">
                  {formatDuration(progressData.details.estimatedTimeRemaining * 1000)}
                </span>
              </div>
            )}

            {/* 메모리 사용량 (옵션) */}
            {memoryUsage && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">메모리 사용량</span>
                </div>
                <span className="text-sm font-medium">
                  {memoryUsage.heapUsed} MB / {memoryUsage.heapTotal} MB
                </span>
              </div>
            )}

            {/* 일시정지 상태 */}
            {isPaused && (
              <Alert>
                <Pause className="h-4 w-4" />
                <AlertDescription>
                  작업이 일시정지되었습니다. 계속하려면 재생 버튼을 클릭하세요.
                </AlertDescription>
              </Alert>
            )}

            {/* 완료 상태 */}
            {progressData.phase === 'completed' && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  작업이 성공적으로 완료되었습니다!
                </AlertDescription>
              </Alert>
            )}

            {/* 오류 상태 */}
            {progressData.phase === 'error' && progressData.error && (
              <Alert variant="destructive">
                <X className="h-4 w-4" />
                <AlertDescription>
                  {progressData.error}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}

// 유틸리티 함수들
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  
  if (hours > 0) {
    return `${hours}시간 ${minutes % 60}분`
  } else if (minutes > 0) {
    return `${minutes}분 ${seconds % 60}초`
  } else {
    return `${seconds}초`
  }
}