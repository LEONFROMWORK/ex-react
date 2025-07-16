'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import io, { Socket } from 'socket.io-client'
import { ProgressData } from '@/components/progress/RealTimeProgressIndicator'

interface UseProgressWebSocketOptions {
  userId: string
  onProgress?: (data: ProgressData) => void
  onComplete?: (taskId: string, result: any) => void
  onError?: (taskId: string, error: string) => void
}

export function useProgressWebSocket({
  userId,
  onProgress,
  onComplete,
  onError,
}: UseProgressWebSocketOptions) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [activeTasks, setActiveTasks] = useState<Map<string, ProgressData>>(new Map())
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const reconnectAttemptsRef = useRef(0)

  // Socket 연결 초기화
  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000'
    
    const newSocket = io(socketUrl, {
      path: '/socket.io/',
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    })

    // 연결 이벤트
    newSocket.on('connect', () => {
      console.log('WebSocket 연결됨')
      setIsConnected(true)
      reconnectAttemptsRef.current = 0
      
      // 사용자 인증
      newSocket.emit('authenticate', { userId })
    })

    // 연결 해제 이벤트
    newSocket.on('disconnect', (reason) => {
      console.log('WebSocket 연결 해제:', reason)
      setIsConnected(false)
      
      // 자동 재연결 시도
      if (reason === 'io server disconnect') {
        // 서버가 연결을 끊은 경우 수동으로 재연결
        newSocket.connect()
      }
    })

    // 연결 오류
    newSocket.on('connect_error', (error) => {
      console.error('WebSocket 연결 오류:', error)
      reconnectAttemptsRef.current++
      
      // 최대 재연결 시도 횟수 초과 시
      if (reconnectAttemptsRef.current > 5) {
        console.error('WebSocket 재연결 실패')
      }
    })

    // 활성 작업 수신
    newSocket.on('active-tasks', (tasks: any[]) => {
      const tasksMap = new Map<string, ProgressData>()
      tasks.forEach(task => {
        const lastUpdate = task.updates[task.updates.length - 1]
        if (lastUpdate) {
          tasksMap.set(task.taskId, {
            taskId: task.taskId,
            taskType: lastUpdate.taskType,
            phase: lastUpdate.phase,
            progress: lastUpdate.progress,
            details: lastUpdate.details,
            startTime: task.startTime,
            message: lastUpdate.message,
          })
        }
      })
      setActiveTasks(tasksMap)
    })

    // 작업 업데이트 수신
    newSocket.on('task-update', (update: any) => {
      const progressData: ProgressData = {
        taskId: update.taskId,
        taskType: update.taskType,
        phase: update.phase,
        progress: update.progress,
        details: update.details,
        startTime: update.timestamp,
        message: update.message,
        error: update.error,
      }

      setActiveTasks(prev => {
        const newMap = new Map(prev)
        newMap.set(update.taskId, progressData)
        return newMap
      })

      // 콜백 호출
      if (onProgress) {
        onProgress(progressData)
      }

      // 완료/오류 처리
      if (update.phase === 'completed' && onComplete) {
        onComplete(update.taskId, { success: true })
        
        // 5초 후 작업 제거
        setTimeout(() => {
          setActiveTasks(prev => {
            const newMap = new Map(prev)
            newMap.delete(update.taskId)
            return newMap
          })
        }, 5000)
      } else if (update.phase === 'error' && onError) {
        onError(update.taskId, update.error || '알 수 없는 오류')
      }
    })

    // 메모리 사용량 수신
    newSocket.on('memory-usage', (usage: any) => {
      // 필요시 메모리 사용량 처리
      console.log('메모리 사용량:', usage)
    })

    // 오류 수신
    newSocket.on('error', (error: any) => {
      console.error('WebSocket 오류:', error)
    })

    setSocket(newSocket)

    // Cleanup
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      newSocket.close()
    }
  }, [userId, onProgress, onComplete, onError])

  // 작업 구독
  const subscribeToTask = useCallback((taskId: string) => {
    if (socket && isConnected) {
      socket.emit('subscribe-task', { taskId })
    }
  }, [socket, isConnected])

  // 작업 구독 취소
  const unsubscribeFromTask = useCallback((taskId: string) => {
    if (socket && isConnected) {
      socket.emit('unsubscribe-task', { taskId })
    }
  }, [socket, isConnected])

  // 작업 일시정지
  const pauseTask = useCallback((taskId: string) => {
    if (socket && isConnected) {
      socket.emit('pause-task', { taskId })
    }
  }, [socket, isConnected])

  // 작업 재개
  const resumeTask = useCallback((taskId: string) => {
    if (socket && isConnected) {
      socket.emit('resume-task', { taskId })
    }
  }, [socket, isConnected])

  // 작업 취소
  const cancelTask = useCallback((taskId: string) => {
    if (socket && isConnected) {
      socket.emit('cancel-task', { taskId })
    }
  }, [socket, isConnected])

  // 수동 재연결
  const reconnect = useCallback(() => {
    if (socket && !isConnected) {
      socket.connect()
    }
  }, [socket, isConnected])

  return {
    isConnected,
    activeTasks: Array.from(activeTasks.values()),
    subscribeToTask,
    unsubscribeFromTask,
    pauseTask,
    resumeTask,
    cancelTask,
    reconnect,
  }
}