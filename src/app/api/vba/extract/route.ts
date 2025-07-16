import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ExtractVBACodeHandler, ExtractVBACodeValidator } from '@/Features/VBAProcessing/ExtractVBACode/ExtractVBACode'

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

    // multipart/form-data 처리
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const includeSecurityScan = formData.get('includeSecurityScan') === 'true'

    if (!file) {
      return NextResponse.json(
        { error: '파일을 업로드해주세요' },
        { status: 400 }
      )
    }

    // 파일 버퍼 읽기
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)

    // 유효성 검사
    const validator = new ExtractVBACodeValidator()
    const validationResult = validator.validate({
      fileBuffer,
      fileName: file.name,
      userId: session.user.id,
      includeSecurityScan,
    })

    if (!validationResult.isSuccess) {
      return NextResponse.json(
        { error: validationResult.error.message },
        { status: 400 }
      )
    }

    // VBA 추출 처리
    const handler = new ExtractVBACodeHandler()
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
    console.error('VBA 추출 API 오류:', error)
    return NextResponse.json(
      { error: 'VBA 코드 추출 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

// GET: 이전 추출 결과 조회
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: '로그인이 필요합니다' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const extractionId = searchParams.get('id')

    if (!extractionId) {
      return NextResponse.json(
        { error: '추출 ID가 필요합니다' },
        { status: 400 }
      )
    }

    // TODO: 데이터베이스에서 추출 결과 조회
    // 현재는 mock 데이터 반환
    return NextResponse.json({
      success: true,
      data: {
        extractionId,
        fileName: 'sample.xlsm',
        extractedAt: new Date(),
        vbaModules: [
          {
            name: 'Module1',
            type: 'Standard',
            code: 'Sub HelloWorld()\n    MsgBox "Hello, World!"\nEnd Sub',
            lineCount: 3,
          },
        ],
        metadata: {
          hasVBA: true,
          totalModules: 1,
          totalLines: 3,
          extractionTime: 150,
        },
      },
    })
  } catch (error) {
    console.error('VBA 추출 결과 조회 오류:', error)
    return NextResponse.json(
      { error: '추출 결과 조회 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}