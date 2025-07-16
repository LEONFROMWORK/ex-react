import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth/session'
import { GetAvailableTemplatesHandler } from '@/Features/ExcelGeneration/GenerateFromTemplate/GenerateFromTemplate'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // 인증 확인 (테스트를 위해 임시로 비활성화)
    // const session = await getServerSession()
    // if (!session) {
    //   return NextResponse.json(
    //     { error: '로그인이 필요합니다' },
    //     { status: 401 }
    //   )
    // }

    // 쿼리 파라미터 파싱
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || undefined
    const searchQuery = searchParams.get('q') || undefined
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined

    // 템플릿 목록 조회
    const handler = new GetAvailableTemplatesHandler()
    const result = await handler.handle({
      category,
      searchQuery,
      limit,
    })

    if (!result.isSuccess) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      )
    }

    // 성공 응답
    return NextResponse.json({
      success: true,
      templates: result.value.templates,
      total: result.value.total,
    })
  } catch (error) {
    console.error('템플릿 목록 조회 API 오류:', error)
    return NextResponse.json(
      { error: '템플릿 목록을 조회하는 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}