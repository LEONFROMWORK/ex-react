'use client'

import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useProgressWebSocket } from '@/hooks/useProgressWebSocket'
import { RealTimeProgressIndicator, ProgressData } from './RealTimeProgressIndicator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Activity,
  WifiOff,
  Wifi,
  RefreshCw,
  X,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

interface WebSocketProgressIndicatorProps {
  taskId?: string
  onComplete?: (result: any) => void
  showConnectionStatus?: boolean
  showAllTasks?: boolean
}

export function WebSocketProgressIndicator({
  taskId,
  onComplete,
  showConnectionStatus = true,
  showAllTasks = false,
}: WebSocketProgressIndicatorProps) {
  const { data: session } = useSession()
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(taskId || null)
  const [dismissedTasks, setDismissedTasks] = useState<Set<string>>(new Set())

  const {
    isConnected,
    activeTasks,
    subscribeToTask,
    unsubscribeFromTask,
    pauseTask,
    resumeTask,
    cancelTask,
    reconnect,
  } = useProgressWebSocket({
    userId: session?.user?.id || '',
    onProgress: (data: ProgressData) => {
      // 진행률 업데이트 시 처리
      if (data.phase === 'completed' && !dismissedTasks.has(data.taskId)) {
        toast.success(`작업 완료: ${data.message}`)
      } else if (data.phase === 'error' && !dismissedTasks.has(data.taskId)) {
        toast.error(`작업 실패: ${data.error || '알 수 없는 오류'}`)
      }
    },
    onComplete: (completedTaskId: string, result: any) => {
      if (completedTaskId === taskId && onComplete) {
        onComplete(result)
      }
    },
    onError: (errorTaskId: string, error: string) => {
      if (errorTaskId === taskId) {
        toast.error(error)
      }
    },
  })

  // 특정 작업 구독
  useEffect(() => {
    if (taskId && isConnected) {
      subscribeToTask(taskId)
      setSelectedTaskId(taskId)

      return () => {
        unsubscribeFromTask(taskId)
      }
    }
  }, [taskId, isConnected, subscribeToTask, unsubscribeFromTask])

  const handleTaskCancel = (cancelTaskId: string) => {
    cancelTask(cancelTaskId)
    toast.info('작업이 취소되었습니다')
  }

  const handleTaskDismiss = (dismissTaskId: string) => {
    setDismissedTasks(prev => new Set(prev).add(dismissTaskId))
    if (dismissTaskId === selectedTaskId) {
      setSelectedTaskId(null)
    }
  }

  const visibleTasks = activeTasks.filter(task => !dismissedTasks.has(task.taskId))

  // 연결 상태 표시
  if (showConnectionStatus && !isConnected) {
    return (
      <Alert className="border-yellow-200 bg-yellow-50">
        <WifiOff className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="flex items-center justify-between">
          <span>실시간 업데이트 연결이 끊어졌습니다</span>
          <Button
            size="sm"
            variant="outline"
            onClick={reconnect}
            className="ml-4"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            재연결
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  // 단일 작업 표시
  if (taskId && !showAllTasks) {
    const task = visibleTasks.find(t => t.taskId === taskId)
    if (!task) return null

    return (
      <RealTimeProgressIndicator
        taskId={task.taskId}
        onCancel={() => handleTaskCancel(task.taskId)}
        onComplete={onComplete}
      />
    )
  }

  // 모든 활성 작업 표시
  if (showAllTasks) {
    return (
      <div className="space-y-4">
        {/* 연결 상태 헤더 */}
        {showConnectionStatus && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-medium">활성 작업</h3>
              <Badge variant="secondary">{visibleTasks.length}</Badge>
            </div>
            {isConnected && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Wifi className="w-4 h-4" />
                연결됨
              </div>
            )}
          </div>
        )}

        {/* 작업 목록 */}
        <AnimatePresence>
          {visibleTasks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Card className="border-dashed">
                <CardContent className="py-8 text-center">
                  <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">진행 중인 작업이 없습니다</p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            visibleTasks.map((task, index) => (
              <motion.div
                key={task.taskId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.05 }}
                className="relative"
              >
                <RealTimeProgressIndicator
                  taskId={task.taskId}
                  onCancel={() => handleTaskCancel(task.taskId)}
                  compact={visibleTasks.length > 2}
                />
                
                {/* 닫기 버튼 */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={() => handleTaskDismiss(task.taskId)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    )
  }

  return null
}

// 전역 진행률 표시기 (앱 레이아웃에 추가)
export function GlobalProgressIndicator() {
  const [isMinimized, setIsMinimized] = useState(false)
  const { activeTasks } = useProgressWebSocket({
    userId: 'global', // 전역 리스너
  })

  const activeCount = activeTasks.filter(t => t.phase === 'processing').length

  if (activeCount === 0) return null

  return (
    <motion.div
      initial={{ x: 300 }}
      animate={{ x: 0 }}
      exit={{ x: 300 }}
      className="fixed bottom-4 right-4 z-50"
    >
      {isMinimized ? (
        <Button
          size="sm"
          onClick={() => setIsMinimized(false)}
          className="shadow-lg"
        >
          <Activity className="w-4 h-4 mr-2 animate-pulse" />
          {activeCount}개 작업 진행 중
        </Button>
      ) : (
        <Card className="w-80 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">진행 중인 작업</CardTitle>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsMinimized(true)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-60 overflow-y-auto">
            {activeTasks
              .filter(t => t.phase === 'processing')
              .slice(0, 3)
              .map(task => (
                <div key={task.taskId} className="space-y-1">
                  <p className="text-xs font-medium truncate">{task.message}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${task.progress.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {task.progress.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            {activeCount > 3 && (
              <p className="text-xs text-muted-foreground text-center">
                +{activeCount - 3}개 더...
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </motion.div>
  )
}