import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth/auth'

// SSE를 위한 헤더 설정
const headers = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
}

export async function GET(
  req: NextRequest,
  { params }: { params: { fileId: string } }
) {
  // 인증 확인
  const session = await auth()
  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  const { fileId } = params
  
  // ReadableStream을 사용한 SSE 구현
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      
      // 진행 상황 시뮬레이션 (실제로는 분석 작업과 연동)
      const stages = [
        { id: 'upload', name: '파일 업로드', duration: 1000 },
        { id: 'parse', name: '파일 파싱', duration: 2000 },
        { id: 'validate', name: '데이터 검증', duration: 1500 },
        { id: 'errors', name: '오류 분석', duration: 3000 },
        { id: 'performance', name: '성능 분석', duration: 2500 },
        { id: 'vba', name: 'VBA 코드 분석', duration: 2000 },
        { id: 'report', name: '리포트 생성', duration: 1000 }
      ]
      
      try {
        // 초기 연결 메시지
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({
            type: 'connection',
            message: '분석을 시작합니다...'
          })}\n\n`)
        )
        
        // 각 단계별 진행
        for (let i = 0; i < stages.length; i++) {
          const stage = stages[i]
          
          // 단계 시작
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'stage_start',
              stage: stage.id,
              message: `${stage.name} 시작...`
            })}\n\n`)
          )
          
          // 진행률 업데이트 (10% 단위)
          for (let progress = 10; progress <= 100; progress += 10) {
            await new Promise(resolve => setTimeout(resolve, stage.duration / 10))
            
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'progress',
                stage: stage.id,
                progress,
                totalProgress: Math.round(((i + progress / 100) / stages.length) * 100)
              })}\n\n`)
            )
          }
          
          // 단계 완료
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'stage_complete',
              stage: stage.id,
              message: `${stage.name} 완료`
            })}\n\n`)
          )
        }
        
        // 전체 완료
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({
            type: 'complete',
            message: '분석이 완료되었습니다!',
            resultId: `result-${fileId}`
          })}\n\n`)
        )
        
        // 스트림 종료
        controller.close()
      } catch (error) {
        // 에러 발생
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            message: '분석 중 오류가 발생했습니다.'
          })}\n\n`)
        )
        controller.close()
      }
    }
  })
  
  return new Response(stream, { headers })
}