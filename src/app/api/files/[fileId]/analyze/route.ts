import { NextRequest, NextResponse } from "next/server"
import { getMockSession } from "@/lib/auth/mock-session"

export async function POST(
  req: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const session = await getMockSession()
    
    if (!session) {
      return NextResponse.json(
        { 
          success: false, 
          message: "인증이 필요합니다."
        },
        { status: 401 }
      )
    }

    const fileId = params.fileId
    const body = await req.json()
    const analysisType = body.analysisType || "basic"

    // Create mock analysis ID
    const analysisId = `analysis-${fileId}`

    // Mock successful analysis start
    console.log(`Starting analysis for file ${fileId} with type ${analysisType}`)

    return NextResponse.json({
      success: true,
      data: {
        analysisId,
        fileId,
        status: "PROCESSING",
        message: "분석이 시작되었습니다.",
        estimatedTime: 5 // seconds
      },
    })
  } catch (error) {
    console.error("Analysis error:", error)
    return NextResponse.json(
      { 
        success: false, 
        message: "파일 분석 중 오류가 발생했습니다." 
      },
      { status: 500 }
    )
  }
}