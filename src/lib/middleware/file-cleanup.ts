import { NextRequest, NextResponse } from 'next/server'
import { container } from '@/Infrastructure/DependencyInjection/Container'
import { IFileStorage } from '@/Infrastructure/DependencyInjection/Container'

export interface FileCleanupJob {
  id: string
  fileKey: string
  scheduledAt: Date
  retryCount: number
  maxRetries: number
  status: 'pending' | 'completed' | 'failed'
}

class FileCleanupManager {
  private static instance: FileCleanupManager
  private cleanupQueue: Map<string, FileCleanupJob> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null
  private fileStorage: IFileStorage

  private constructor() {
    this.fileStorage = container.getFileStorage()
    this.startCleanupWorker()
  }

  static getInstance(): FileCleanupManager {
    if (!FileCleanupManager.instance) {
      FileCleanupManager.instance = new FileCleanupManager()
    }
    return FileCleanupManager.instance
  }

  // 파일 정리 작업 예약
  scheduleCleanup(fileKey: string, delayMs: number = 30 * 60 * 1000): string {
    const jobId = `cleanup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const job: FileCleanupJob = {
      id: jobId,
      fileKey,
      scheduledAt: new Date(Date.now() + delayMs),
      retryCount: 0,
      maxRetries: 3,
      status: 'pending'
    }

    this.cleanupQueue.set(jobId, job)
    console.log(`파일 정리 작업 예약: ${fileKey} (${delayMs}ms 후)`)
    
    return jobId
  }

  // 파일 정리 작업 취소
  cancelCleanup(jobId: string): boolean {
    const job = this.cleanupQueue.get(jobId)
    if (job && job.status === 'pending') {
      this.cleanupQueue.delete(jobId)
      console.log(`파일 정리 작업 취소: ${job.fileKey}`)
      return true
    }
    return false
  }

  // 즉시 파일 정리
  async immediateCleanup(fileKey: string): Promise<boolean> {
    try {
      await this.fileStorage.delete(fileKey)
      console.log(`파일 즉시 정리 완료: ${fileKey}`)
      return true
    } catch (error) {
      console.error(`파일 즉시 정리 실패: ${fileKey}`, error)
      return false
    }
  }

  // 정리 작업 워커 시작
  private startCleanupWorker(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }

    this.cleanupInterval = setInterval(async () => {
      await this.processCleanupQueue()
    }, 60 * 1000) // 1분마다 실행
  }

  // 정리 작업 큐 처리
  private async processCleanupQueue(): Promise<void> {
    const now = new Date()
    const jobsToProcess = Array.from(this.cleanupQueue.values())
      .filter(job => job.status === 'pending' && job.scheduledAt <= now)

    for (const job of jobsToProcess) {
      try {
        await this.fileStorage.delete(job.fileKey)
        job.status = 'completed'
        console.log(`파일 정리 완료: ${job.fileKey}`)
        
        // 완료된 작업 제거
        this.cleanupQueue.delete(job.id)
      } catch (error) {
        console.error(`파일 정리 실패: ${job.fileKey}`, error)
        
        job.retryCount++
        if (job.retryCount >= job.maxRetries) {
          job.status = 'failed'
          console.error(`파일 정리 최대 재시도 초과: ${job.fileKey}`)
          this.cleanupQueue.delete(job.id)
        } else {
          // 재시도 스케줄링 (지수 백오프)
          const retryDelayMs = Math.pow(2, job.retryCount) * 60 * 1000
          job.scheduledAt = new Date(Date.now() + retryDelayMs)
          console.log(`파일 정리 재시도 예약: ${job.fileKey} (${retryDelayMs}ms 후)`)
        }
      }
    }
  }

  // 정리 작업 상태 조회
  getCleanupStatus(): { pending: number; total: number; jobs: FileCleanupJob[] } {
    const jobs = Array.from(this.cleanupQueue.values())
    return {
      pending: jobs.filter(job => job.status === 'pending').length,
      total: jobs.length,
      jobs
    }
  }

  // 정리 작업 중단
  stopCleanupWorker(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }
}

// 싱글톤 인스턴스 export
export const fileCleanupManager = FileCleanupManager.getInstance()

// 미들웨어 함수들
export async function handleFileUploadSuccess(fileKey: string): Promise<string> {
  // 성공적인 업로드 후 30분 후 임시 파일 정리 예약
  const jobId = fileCleanupManager.scheduleCleanup(fileKey, 30 * 60 * 1000)
  return jobId
}

export async function handleFileUploadFailure(fileKey: string): Promise<void> {
  // 실패한 업로드 후 즉시 파일 정리
  await fileCleanupManager.immediateCleanup(fileKey)
}

export async function handleFileProcessingComplete(fileKey: string, cleanupJobId?: string): Promise<void> {
  // 파일 처리 완료 후 정리 작업 취소 (영구 보관)
  if (cleanupJobId) {
    fileCleanupManager.cancelCleanup(cleanupJobId)
  }
}

export async function handleFileProcessingError(fileKey: string): Promise<void> {
  // 파일 처리 오류 시 5분 후 정리
  fileCleanupManager.scheduleCleanup(fileKey, 5 * 60 * 1000)
}

// Next.js 미들웨어 - 정리 작업 상태 API
export async function cleanupStatusHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const status = fileCleanupManager.getCleanupStatus()
    return NextResponse.json(status)
  } catch (error) {
    return NextResponse.json(
      { error: '정리 작업 상태 조회 실패' },
      { status: 500 }
    )
  }
}

// 애플리케이션 종료 시 정리 작업 완료 대기
export async function gracefulShutdown(): Promise<void> {
  console.log('정리 작업 완료 대기 중...')
  
  // 최대 30초 대기
  const maxWaitTime = 30 * 1000
  const startTime = Date.now()
  
  while (Date.now() - startTime < maxWaitTime) {
    const status = fileCleanupManager.getCleanupStatus()
    if (status.pending === 0) {
      console.log('모든 정리 작업 완료')
      break
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  fileCleanupManager.stopCleanupWorker()
  console.log('정리 작업 워커 중단')
}

// 프로세스 종료 시 정리 작업 완료 대기
if (typeof process !== 'undefined') {
  process.on('SIGTERM', gracefulShutdown)
  process.on('SIGINT', gracefulShutdown)
}