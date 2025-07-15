import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-helper"
import { AnalyzeErrorsHandler } from "@/Features/ExcelAnalysis/AnalyzeErrors/AnalyzeErrors"
import { AuthErrors } from "@/Common/Errors"
import { createExcelAnalysisLimit } from "@/Features/UsageTracking/Middleware/UsageLimitMiddleware"

const usageLimiter = createExcelAnalysisLimit()

export async function POST(
  req: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    // Apply usage limit
    const usageLimitResult = await usageLimiter.handle(req)
    if (usageLimitResult) {
      return usageLimitResult
    }

    const session = await getServerSession()
    
    if (!session) {
      return NextResponse.json(
        { 
          success: false, 
          error: AuthErrors.Unauthorized 
        },
        { status: 401 }
      )
    }

    const fileId = params.fileId
    const body = await req.json()
    const analysisType = body.analysisType || "basic"

    // Use vertical slice handler
    const handler = new AnalyzeErrorsHandler()
    const result = await handler.handle({
      fileId,
      userId: session.user.id,
      analysisType,
    })

    if (result.isFailure) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error 
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.value,
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