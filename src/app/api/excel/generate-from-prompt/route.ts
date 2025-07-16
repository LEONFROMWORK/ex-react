import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth/session'
import { GenerateFromPromptHandler, GenerateFromPromptValidator } from '@/Features/ExcelGeneration/GenerateFromPrompt/GenerateFromPrompt'

export async function POST(request: NextRequest) {
  try {
    // 인증 확인 (테스트를 위해 임시로 비활성화)
    // const session = await getServerSession()
    // if (!session) {
    //   return NextResponse.json(
    //     { error: '로그인이 필요합니다' },
    //     { status: 401 }
    //   )
    // }
    
    // 테스트용 세션
    const session = { user: { id: 'test-user-id', name: 'Test User' } }

    // 요청 데이터 파싱
    const body = await request.json()
    
    // 유효성 검사
    const validator = new GenerateFromPromptValidator()
    const validationResult = validator.validate({
      ...body,
      userId: session.user.id,
    })

    if (!validationResult.isSuccess) {
      return NextResponse.json(
        { error: validationResult.error.message },
        { status: 400 }
      )
    }

    // Excel 생성 처리
    console.log('Excel 생성 요청:', validationResult.value)
    const handler = new GenerateFromPromptHandler()
    const result = await handler.handle(validationResult.value)

    if (!result.isSuccess) {
      console.error('Excel 생성 실패:', result.error)
      return NextResponse.json(
        { error: result.error.message || 'Excel 생성에 실패했습니다' },
        { status: 500 }
      )
    }

    // 성공 응답
    return NextResponse.json({
      success: true,
      data: result.value,
    })
  } catch (error) {
    console.error('Excel 생성 API 오류:', error)
    return NextResponse.json(
      { error: 'Excel 생성 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}