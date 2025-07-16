import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { GenerateFromPromptHandler } from '@/Features/ExcelGeneration/GenerateFromPrompt/GenerateFromPrompt'
import { ExcelStreamBuilderService } from '@/Services/Stream/ExcelStreamBuilderService'
import { getProgressService } from '@/Services/WebSocket/WebSocketProgressService'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: '로그인이 필요합니다' },
        { status: 401 }
      )
    }

    // 요청 데이터 파싱
    const body = await request.json()
    const { prompt, useStreaming = true } = body

    // 작업 ID 생성
    const taskId = `excel_gen_${uuidv4()}`

    // WebSocket 진행률 서비스
    const progressService = getProgressService()
    progressService.startTask(taskId, session.user.id, 'excel-generation')

    // 스트리밍 여부에 따른 처리
    if (useStreaming) {
      // 스트리밍 빌더 서비스
      const streamBuilder = new ExcelStreamBuilderService()
      
      // 진행률 콜백 생성
      const progressCallback = progressService.createStreamProgressCallback(taskId)

      // Excel 구조 생성 (AI 사용)
      progressService.sendProgress({
        taskId,
        taskType: 'excel-generation',
        phase: 'initializing',
        progress: { current: 10, total: 100, percentage: 10 },
        message: 'AI가 Excel 구조를 분석하고 있습니다...',
        timestamp: Date.now(),
      })

      // 여기서는 mock 구조 사용 (실제로는 AI 서비스 호출)
      const structure = {
        sheets: [{
          name: 'Sheet1',
          columns: [
            { header: '날짜', key: 'date', width: 15 },
            { header: '매출', key: 'revenue', width: 20 },
            { header: '비용', key: 'expense', width: 20 },
            { header: '이익', key: 'profit', width: 20 },
          ],
          rows: generateMockData(1000), // 대용량 데이터 시뮬레이션
          formulas: [
            { cell: 'D2', formula: '=B2-C2' },
          ],
        }],
      }

      // 스트리밍으로 Excel 생성
      const streamResult = await streamBuilder.buildStream(structure, {
        chunkSize: 100,
        progressCallback,
        errorCallback: (error) => {
          progressService.completeTask(taskId, 'error', error.message)
        },
      })

      if (!streamResult.isSuccess) {
        progressService.completeTask(taskId, 'error', streamResult.error.message)
        return NextResponse.json(
          { error: streamResult.error.message },
          { status: 500 }
        )
      }

      // 스트림 응답 반환
      const stream = streamResult.value
      const response = new Response(stream as any, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="generated_${Date.now()}.xlsx"`,
          'X-Task-Id': taskId,
        },
      })

      // 스트림 완료 시 작업 완료 처리
      stream.on('end', () => {
        progressService.completeTask(taskId, 'completed', 'Excel 파일 생성이 완료되었습니다')
      })

      return response
    } else {
      // 일반 생성 (비스트리밍)
      const handler = new GenerateFromPromptHandler()
      const result = await handler.handle({
        prompt,
        userId: session.user.id,
        options: body.options,
      })

      if (!result.isSuccess) {
        progressService.completeTask(taskId, 'error', result.error.message)
        return NextResponse.json(
          { error: result.error.message },
          { status: 500 }
        )
      }

      progressService.completeTask(taskId, 'completed')

      return NextResponse.json({
        success: true,
        data: {
          ...result.value,
          taskId,
        },
      })
    }
  } catch (error) {
    console.error('Excel 스트림 생성 API 오류:', error)
    return NextResponse.json(
      { error: 'Excel 생성 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

// Mock 데이터 생성 함수
function generateMockData(count: number) {
  const rows = []
  const startDate = new Date('2024-01-01')
  
  for (let i = 0; i < count; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    
    const revenue = Math.floor(Math.random() * 100000) + 50000
    const expense = Math.floor(Math.random() * 70000) + 30000
    
    rows.push({
      date: date.toISOString().split('T')[0],
      revenue,
      expense,
      profit: revenue - expense,
    })
  }
  
  return rows
}