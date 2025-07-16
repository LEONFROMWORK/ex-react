import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { GenerateFromTemplateHandler, GenerateFromTemplateValidator } from '@/Features/ExcelGeneration/GenerateFromTemplate/GenerateFromTemplate'

export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: '로그인이 필요합니다' },
        { status: 401 }
      )
    }

    // 요청 데이터 파싱
    const body = await request.json()
    
    // 유효성 검사
    const validator = new GenerateFromTemplateValidator()
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

    // 템플릿 기반 Excel 생성 처리
    const handler = new GenerateFromTemplateHandler()
    const result = await handler.handle(validationResult.value)

    if (!result.isSuccess) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      )
    }

    // 성공 응답
    return NextResponse.json({
      success: true,
      data: result.value,
    })
  } catch (error) {
    console.error('템플릿 기반 Excel 생성 API 오류:', error)
    return NextResponse.json(
      { error: '템플릿 기반 Excel 생성 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}