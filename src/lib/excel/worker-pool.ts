/**
 * HyperFormula Worker Pool Manager
 * 병렬 처리를 위한 워커 풀 관리
 */

import { ProcessChunkRequest, ProcessChunkResult, WorkerMessage, WorkerResponse } from './hyperformula-worker'

interface WorkerInstance {
  id: string
  worker: Worker
  busy: boolean
  taskQueue: Array<{
    resolve: (value: any) => void
    reject: (reason: any) => void
    message: WorkerMessage
  }>
}

export class WorkerPool {
  private workers: WorkerInstance[] = []
  private maxWorkers: number
  private currentIndex: number = 0
  private initPromises: Map<string, Promise<void>> = new Map()

  constructor(maxWorkers?: number) {
    // CPU 코어 수에 따라 워커 수 결정 (최대 4개)
    this.maxWorkers = maxWorkers || Math.min(navigator.hardwareConcurrency || 2, 4)
    console.log(`Worker Pool 생성: ${this.maxWorkers}개 워커`)
  }

  /**
   * Worker Pool 초기화
   */
  async init(): Promise<void> {
    const initPromises: Promise<void>[] = []

    for (let i = 0; i < this.maxWorkers; i++) {
      const workerId = `worker-${i}`
      const worker = new Worker(
        new URL('./hyperformula-worker.ts', import.meta.url),
        { type: 'module' }
      )

      const workerInstance: WorkerInstance = {
        id: workerId,
        worker,
        busy: false,
        taskQueue: []
      }

      this.workers.push(workerInstance)

      // 각 워커 초기화
      const initPromise = this.sendMessage(workerInstance, {
        type: 'INIT',
        id: `init-${workerId}`,
        payload: {
          // 워커별 설정
          useStats: true,
          binarySearchThreshold: 20
        }
      })

      initPromises.push(initPromise)
      this.initPromises.set(workerId, initPromise)
    }

    await Promise.all(initPromises)
    console.log('모든 워커 초기화 완료')
  }

  /**
   * 청크 처리 요청 (자동 로드 밸런싱)
   */
  async processChunk(request: ProcessChunkRequest): Promise<ProcessChunkResult> {
    // 사용 가능한 워커 찾기
    const worker = await this.getAvailableWorker()
    
    try {
      worker.busy = true
      
      const result = await this.sendMessage<ProcessChunkResult>(worker, {
        type: 'PROCESS_CHUNK',
        id: `chunk-${Date.now()}-${Math.random()}`,
        payload: request
      })
      
      return result
      
    } finally {
      worker.busy = false
      this.processQueue(worker)
    }
  }

  /**
   * 여러 청크를 병렬로 처리
   */
  async processChunksParallel(chunks: ProcessChunkRequest[]): Promise<ProcessChunkResult[]> {
    const promises = chunks.map(chunk => this.processChunk(chunk))
    return Promise.all(promises)
  }

  /**
   * 수식 평가 요청
   */
  async evaluateFormula(formula: string, context?: any): Promise<any> {
    const worker = await this.getAvailableWorker()
    
    try {
      worker.busy = true
      
      return await this.sendMessage(worker, {
        type: 'EVALUATE',
        id: `eval-${Date.now()}`,
        payload: { formula, context }
      })
      
    } finally {
      worker.busy = false
      this.processQueue(worker)
    }
  }

  /**
   * Worker Pool 종료
   */
  async destroy(): Promise<void> {
    const destroyPromises = this.workers.map(workerInstance => 
      this.sendMessage(workerInstance, {
        type: 'DESTROY',
        id: `destroy-${workerInstance.id}`
      }).then(() => {
        workerInstance.worker.terminate()
      })
    )

    await Promise.all(destroyPromises)
    this.workers = []
    this.initPromises.clear()
    console.log('Worker Pool 종료됨')
  }

  /**
   * 사용 가능한 워커 가져오기 (라운드 로빈)
   */
  private async getAvailableWorker(): Promise<WorkerInstance> {
    // 모든 워커가 초기화될 때까지 대기
    await Promise.all(this.initPromises.values())

    // 라운드 로빈으로 워커 선택
    let attempts = 0
    while (attempts < this.workers.length * 2) {
      const worker = this.workers[this.currentIndex]
      this.currentIndex = (this.currentIndex + 1) % this.workers.length
      
      if (!worker.busy) {
        return worker
      }
      
      attempts++
    }

    // 모든 워커가 바쁜 경우, 큐가 가장 짧은 워커 선택
    return this.workers.reduce((least, current) => 
      current.taskQueue.length < least.taskQueue.length ? current : least
    )
  }

  /**
   * 워커에 메시지 전송
   */
  private sendMessage<T = any>(
    workerInstance: WorkerInstance, 
    message: WorkerMessage
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const handler = (event: MessageEvent<WorkerResponse>) => {
        if (event.data.id === message.id) {
          workerInstance.worker.removeEventListener('message', handler)
          
          if (event.data.type === 'SUCCESS') {
            resolve(event.data.result as T)
          } else {
            reject(new Error(event.data.error || '워커 처리 실패'))
          }
        }
      }

      workerInstance.worker.addEventListener('message', handler)
      workerInstance.worker.postMessage(message)
    })
  }

  /**
   * 대기 중인 작업 처리
   */
  private processQueue(workerInstance: WorkerInstance): void {
    if (workerInstance.taskQueue.length > 0 && !workerInstance.busy) {
      const task = workerInstance.taskQueue.shift()
      if (task) {
        workerInstance.busy = true
        
        this.sendMessage(workerInstance, task.message)
          .then(result => {
            task.resolve(result)
            workerInstance.busy = false
            this.processQueue(workerInstance) // 재귀적으로 다음 작업 처리
          })
          .catch(error => {
            task.reject(error)
            workerInstance.busy = false
            this.processQueue(workerInstance)
          })
      }
    }
  }

  /**
   * 현재 워커 상태 가져오기
   */
  getStatus(): { total: number; busy: number; queued: number } {
    const busy = this.workers.filter(w => w.busy).length
    const queued = this.workers.reduce((sum, w) => sum + w.taskQueue.length, 0)
    
    return {
      total: this.workers.length,
      busy,
      queued
    }
  }
}

// 전역 워커 풀 인스턴스
let globalWorkerPool: WorkerPool | null = null

/**
 * 전역 워커 풀 가져오기 (싱글톤)
 */
export async function getWorkerPool(): Promise<WorkerPool> {
  if (!globalWorkerPool) {
    globalWorkerPool = new WorkerPool()
    await globalWorkerPool.init()
  }
  return globalWorkerPool
}

/**
 * 전역 워커 풀 정리
 */
export async function destroyWorkerPool(): Promise<void> {
  if (globalWorkerPool) {
    await globalWorkerPool.destroy()
    globalWorkerPool = null
  }
}