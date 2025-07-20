// 스트리밍 처리 - 대용량 파일 최적화
import { Readable, Transform, pipeline } from 'stream'
import { promisify } from 'util'

const pipelineAsync = promisify(pipeline)

export interface StreamingResult {
  type: 'progress' | 'result' | 'error' | 'complete'
  data: any
  progress?: number
}

export class StreamingProcessor {
  private chunkSize = 1024 * 1024 // 1MB chunks
  private processed = 0
  private errors: any[] = []
  
  // Excel 파일 스트리밍 분석
  async* processExcelStream(
    file: File,
    onProgress?: (progress: number) => void
  ): AsyncGenerator<StreamingResult> {
    const totalSize = file.size
    let offset = 0
    
    while (offset < totalSize) {
      const chunk = file.slice(offset, Math.min(offset + this.chunkSize, totalSize))
      const buffer = await chunk.arrayBuffer()
      
      try {
        // 청크 분석
        const result = await this.analyzeChunk(buffer, offset, totalSize)
        
        // 진행률 계산
        offset += chunk.size
        this.processed = offset
        const progress = Math.round((offset / totalSize) * 100)
        
        if (onProgress) {
          onProgress(progress)
        }
        
        yield {
          type: 'progress',
          data: result,
          progress
        }
        
        // 결과가 있으면 즉시 반환
        if (result.issues?.length > 0) {
          yield {
            type: 'result',
            data: result.issues
          }
        }
        
      } catch (error) {
        this.errors.push({ offset, error })
        yield {
          type: 'error',
          data: { offset, error: error.message }
        }
      }
    }
    
    // 완료
    yield {
      type: 'complete',
      data: {
        processed: this.processed,
        errors: this.errors,
        totalSize
      }
    }
  }
  
  private async analyzeChunk(
    buffer: ArrayBuffer,
    offset: number,
    totalSize: number
  ): Promise<any> {
    // 청크 분석 로직
    // 실제로는 ExcelJS의 스트리밍 API 사용
    const uint8Array = new Uint8Array(buffer)
    
    return {
      offset,
      size: buffer.byteLength,
      issues: this.scanForIssues(uint8Array)
    }
  }
  
  private scanForIssues(data: Uint8Array): any[] {
    const issues = []
    
    // 간단한 패턴 매칭 (예시)
    // 실제로는 더 복잡한 Excel 구조 분석
    
    // 순환 참조 패턴 찾기
    if (this.containsCircularPattern(data)) {
      issues.push({
        type: 'circular_reference',
        severity: 'high',
        message: '순환 참조 가능성 감지'
      })
    }
    
    return issues
  }
  
  private containsCircularPattern(data: Uint8Array): boolean {
    // 실제 구현은 더 복잡
    return false
  }
  
  // 웹 스트림 API 사용 (브라우저 호환)
  createWebStream(file: File): ReadableStream<StreamingResult> {
    const processor = this
    let offset = 0
    
    return new ReadableStream({
      async start(controller) {
        // 초기화
      },
      
      async pull(controller) {
        if (offset >= file.size) {
          controller.close()
          return
        }
        
        const chunk = file.slice(offset, offset + processor.chunkSize)
        const buffer = await chunk.arrayBuffer()
        
        const result = await processor.analyzeChunk(buffer, offset, file.size)
        offset += chunk.size
        
        controller.enqueue({
          type: 'progress',
          data: result,
          progress: Math.round((offset / file.size) * 100)
        })
      },
      
      cancel() {
        // 정리 작업
      }
    })
  }
  
  // Transform 스트림 - 파이프라인 처리
  createTransformStream(): TransformStream<Uint8Array, StreamingResult> {
    const processor = this
    
    return new TransformStream({
      async transform(chunk, controller) {
        const buffer = chunk instanceof ArrayBuffer ? chunk : 
                       chunk.buffer instanceof ArrayBuffer ? chunk.buffer : 
                       Buffer.from(chunk).buffer
        const result = await processor.analyzeChunk(buffer, 0, 0)
        
        controller.enqueue({
          type: 'result',
          data: result
        })
      }
    })
  }
}

// 스트리밍 응답 헬퍼
export function createStreamingResponse(
  stream: ReadableStream<StreamingResult>
): Response {
  const encoder = new TextEncoder()
  
  const transformedStream = stream.pipeThrough(
    new TransformStream({
      transform(chunk, controller) {
        // NDJSON 형식으로 변환
        const json = JSON.stringify(chunk)
        controller.enqueue(encoder.encode(json + '\n'))
      }
    })
  )
  
  return new Response(transformedStream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff'
    }
  })
}

// 클라이언트 스트리밍 리더
export async function* readStreamingResponse(
  response: Response
): AsyncGenerator<StreamingResult> {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  
  try {
    while (true) {
      const { done, value } = await reader.read()
      
      if (done) break
      
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      
      // 마지막 줄은 불완전할 수 있으므로 버퍼에 유지
      buffer = lines.pop() || ''
      
      for (const line of lines) {
        if (line.trim()) {
          yield JSON.parse(line)
        }
      }
    }
    
    // 남은 버퍼 처리
    if (buffer.trim()) {
      yield JSON.parse(buffer)
    }
  } finally {
    reader.releaseLock()
  }
}