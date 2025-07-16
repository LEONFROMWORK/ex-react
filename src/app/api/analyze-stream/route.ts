// 스트리밍 API - 대용량 파일 처리
import { NextRequest } from 'next/server'
import { StreamingProcessor, createStreamingResponse } from '@/lib/performance/streaming-processor'
import { circuitBreakers } from '@/lib/performance/circuit-breaker'
import { analysisCache } from '@/lib/performance/cache-manager'

export const runtime = 'edge' // Edge Runtime 사용

export async function POST(request: NextRequest) {
  // Circuit Breaker 적용
  return circuitBreakers.excelAnalysis.execute(async () => {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400 }
      )
    }
    
    // 파일 크기 체크 (최대 100MB)
    if (file.size > 100 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: 'File too large. Maximum size is 100MB' }),
        { status: 413 }
      )
    }
    
    // 캐시 체크
    const cacheKey = `analysis:${file.name}:${file.size}:${file.lastModified}`
    const cached = await analysisCache.get(cacheKey)
    
    if (cached) {
      return new Response(
        JSON.stringify({ cached: true, results: cached }),
        { 
          status: 200,
          headers: { 'X-Cache': 'HIT' }
        }
      )
    }
    
    // 스트리밍 처리
    const processor = new StreamingProcessor()
    const stream = processor.createWebStream(file)
    
    // 결과 수집 (캐싱용)
    const results: any[] = []
    const teeStream = stream.tee()
    
    // 한 스트림은 응답으로, 다른 스트림은 캐싱용으로
    const cacheStream = teeStream[1]
    const reader = cacheStream.getReader()
    
    // 백그라운드에서 캐시 저장
    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          if (value.type === 'result') {
            results.push(...value.data)
          }
        }
        
        // 분석 완료 시 캐시 저장
        if (results.length > 0) {
          await analysisCache.set(cacheKey, results, { ttl: 3600 })
        }
      } catch (error) {
        console.error('Cache save error:', error)
      }
    })()
    
    // 스트리밍 응답 반환
    return createStreamingResponse(teeStream[0])
  })
}