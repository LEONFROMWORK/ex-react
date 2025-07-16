import { EventEmitter } from 'events'
import { Server as HTTPServer } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'
import { Result } from '@/Common/Result'

export interface ProgressUpdate {
  taskId: string
  taskType: string
  phase: string
  progress: {
    current: number
    total: number
    percentage: number
  }
  details?: any
  message?: string
  error?: string
  timestamp: number
}

export interface ProgressTask {
  taskId: string
  userId: string
  startTime: number
  lastUpdate: number
  status: 'active' | 'paused' | 'completed' | 'error'
  updates: ProgressUpdate[]
}

export class WebSocketProgressService extends EventEmitter {
  private io: SocketIOServer | null = null
  private activeTasks: Map<string, ProgressTask> = new Map()
  private userSockets: Map<string, Set<string>> = new Map() // userId -> socketIds

  // Socket.IO 서버 초기화
  initializeSocketServer(httpServer: HTTPServer): void {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
      },
      path: '/socket.io/',
    })

    this.setupSocketHandlers()
    console.log('WebSocket 서버가 초기화되었습니다')
  }

  // Socket 핸들러 설정
  private setupSocketHandlers(): void {
    if (!this.io) return

    this.io.on('connection', (socket: Socket) => {
      console.log('새 WebSocket 연결:', socket.id)

      // 사용자 인증
      socket.on('authenticate', ({ userId }) => {
        if (!userId) {
          socket.emit('error', { message: '인증 실패' })
          return
        }

        // 사용자별 소켓 관리
        if (!this.userSockets.has(userId)) {
          this.userSockets.set(userId, new Set())
        }
        this.userSockets.get(userId)!.add(socket.id)

        // 사용자의 활성 작업 전송
        const userTasks = Array.from(this.activeTasks.values())
          .filter(task => task.userId === userId && task.status === 'active')

        socket.emit('active-tasks', userTasks)
        socket.join(`user:${userId}`)
      })

      // 작업 구독
      socket.on('subscribe-task', ({ taskId }) => {
        socket.join(`task:${taskId}`)
        
        // 현재 작업 상태 전송
        const task = this.activeTasks.get(taskId)
        if (task && task.updates.length > 0) {
          socket.emit('task-update', task.updates[task.updates.length - 1])
        }
      })

      // 작업 구독 취소
      socket.on('unsubscribe-task', ({ taskId }) => {
        socket.leave(`task:${taskId}`)
      })

      // 작업 일시정지
      socket.on('pause-task', ({ taskId }) => {
        const task = this.activeTasks.get(taskId)
        if (task) {
          task.status = 'paused'
          this.emit('task-paused', taskId)
        }
      })

      // 작업 재개
      socket.on('resume-task', ({ taskId }) => {
        const task = this.activeTasks.get(taskId)
        if (task) {
          task.status = 'active'
          this.emit('task-resumed', taskId)
        }
      })

      // 작업 취소
      socket.on('cancel-task', ({ taskId }) => {
        const task = this.activeTasks.get(taskId)
        if (task) {
          task.status = 'error'
          this.emit('task-cancelled', taskId)
          this.completeTask(taskId, 'error', '사용자가 작업을 취소했습니다')
        }
      })

      // 연결 해제
      socket.on('disconnect', () => {
        console.log('WebSocket 연결 해제:', socket.id)
        
        // 사용자 소켓 목록에서 제거
        for (const [userId, sockets] of this.userSockets.entries()) {
          sockets.delete(socket.id)
          if (sockets.size === 0) {
            this.userSockets.delete(userId)
          }
        }
      })
    })
  }

  // 새 작업 시작
  startTask(taskId: string, userId: string, taskType: string): Result<void> {
    if (this.activeTasks.has(taskId)) {
      return Result.failure({
        code: 'PROGRESS.TASK_EXISTS',
        message: '이미 존재하는 작업 ID입니다',
      })
    }

    const task: ProgressTask = {
      taskId,
      userId,
      startTime: Date.now(),
      lastUpdate: Date.now(),
      status: 'active',
      updates: [],
    }

    this.activeTasks.set(taskId, task)

    // 초기 진행률 전송
    this.sendProgress({
      taskId,
      taskType,
      phase: 'initializing',
      progress: { current: 0, total: 100, percentage: 0 },
      message: '작업을 시작하고 있습니다...',
      timestamp: Date.now(),
    })

    return Result.success(undefined)
  }

  // 진행률 업데이트 전송
  sendProgress(update: ProgressUpdate): void {
    const task = this.activeTasks.get(update.taskId)
    if (!task) return

    // 일시정지 상태면 업데이트 무시
    if (task.status === 'paused') return

    task.lastUpdate = Date.now()
    task.updates.push(update)

    // 최근 100개 업데이트만 유지 (메모리 관리)
    if (task.updates.length > 100) {
      task.updates = task.updates.slice(-100)
    }

    // Socket.IO로 전송
    if (this.io) {
      // 작업 구독자에게 전송
      this.io.to(`task:${update.taskId}`).emit('task-update', update)
      
      // 사용자에게도 전송
      this.io.to(`user:${task.userId}`).emit('task-update', update)
    }

    // 이벤트 발생 (로컬 리스너용)
    this.emit('progress', update)
  }

  // 작업 완료
  completeTask(taskId: string, status: 'completed' | 'error' = 'completed', message?: string): void {
    const task = this.activeTasks.get(taskId)
    if (!task) return

    task.status = status

    const finalUpdate: ProgressUpdate = {
      taskId,
      taskType: '',
      phase: status,
      progress: {
        current: status === 'completed' ? 100 : task.updates[task.updates.length - 1]?.progress.current || 0,
        total: 100,
        percentage: status === 'completed' ? 100 : task.updates[task.updates.length - 1]?.progress.percentage || 0,
      },
      message: message || (status === 'completed' ? '작업이 완료되었습니다' : '작업 중 오류가 발생했습니다'),
      timestamp: Date.now(),
    }

    this.sendProgress(finalUpdate)

    // 5초 후 작업 정리
    setTimeout(() => {
      this.activeTasks.delete(taskId)
    }, 5000)
  }

  // 작업 상태 조회
  getTaskStatus(taskId: string): ProgressTask | null {
    return this.activeTasks.get(taskId) || null
  }

  // 사용자의 활성 작업 조회
  getUserActiveTasks(userId: string): ProgressTask[] {
    return Array.from(this.activeTasks.values())
      .filter(task => task.userId === userId && task.status === 'active')
  }

  // 스트리밍 진행률 헬퍼
  createStreamProgressCallback(taskId: string) {
    return (progress: any) => {
      this.sendProgress({
        taskId,
        taskType: 'excel-generation',
        phase: progress.phase,
        progress: {
          current: progress.percentage,
          total: 100,
          percentage: progress.percentage,
        },
        details: {
          currentSheet: progress.currentSheet,
          totalSheets: progress.totalSheets,
          currentRow: progress.currentRow,
          totalRows: progress.totalRows,
          bytesProcessed: progress.bytesProcessed,
          estimatedTimeRemaining: progress.estimatedTimeRemaining,
        },
        timestamp: Date.now(),
      })
    }
  }

  // 메모리 사용량 브로드캐스트
  broadcastMemoryUsage(usage: any): void {
    if (this.io) {
      this.io.emit('memory-usage', {
        ...usage,
        timestamp: Date.now(),
      })
    }
  }

  // 정리
  cleanup(): void {
    if (this.io) {
      this.io.close()
      this.io = null
    }
    this.activeTasks.clear()
    this.userSockets.clear()
    this.removeAllListeners()
  }
}

// Singleton 인스턴스
let progressServiceInstance: WebSocketProgressService | null = null

export function getProgressService(): WebSocketProgressService {
  if (!progressServiceInstance) {
    progressServiceInstance = new WebSocketProgressService()
  }
  return progressServiceInstance
}