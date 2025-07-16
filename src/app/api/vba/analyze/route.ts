import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { AnalyzeVBACodeHandler, AnalyzeVBACodeValidator } from '@/Features/VBAProcessing/AnalyzeVBACode/AnalyzeVBACode'

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
    
    // 유효성 검사
    const validator = new AnalyzeVBACodeValidator()
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

    // VBA 분석 처리
    const handler = new AnalyzeVBACodeHandler()
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
    console.error('VBA 분석 API 오류:', error)
    return NextResponse.json(
      { error: 'VBA 코드 분석 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

// GET: 이전 분석 결과 조회
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: '로그인이 필요합니다' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const analysisId = searchParams.get('id')

    if (!analysisId) {
      return NextResponse.json(
        { error: '분석 ID가 필요합니다' },
        { status: 400 }
      )
    }

    // TODO: 데이터베이스에서 분석 결과 조회
    // 현재는 mock 데이터 반환
    return NextResponse.json({
      success: true,
      data: {
        analysisId,
        analyzedAt: new Date(),
        moduleAnalysis: [
          {
            moduleName: 'Module1',
            moduleType: 'Standard',
            analysis: {
              complexity: {
                cyclomaticComplexity: 5,
                linesOfCode: 50,
                commentLines: 10,
                emptyLines: 5,
                functions: 2,
                subroutines: 3,
                variables: 8,
              },
              quality: {
                score: 85,
                issues: [],
              },
              dependencies: {
                externalReferences: [],
                apiCalls: [],
                fileOperations: [],
                registryAccess: [],
              },
              metrics: {
                readabilityIndex: 90,
                maintainabilityIndex: 85,
                testabilityIndex: 80,
              },
            },
          },
        ],
        summary: {
          totalModules: 1,
          avgComplexity: 5,
          avgQualityScore: 85,
          totalIssues: 0,
          criticalIssues: 0,
          totalDependencies: 0,
        },
        recommendations: [],
      },
    })
  } catch (error) {
    console.error('VBA 분석 결과 조회 오류:', error)
    return NextResponse.json(
      { error: '분석 결과 조회 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}