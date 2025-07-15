import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-helper"
import { CheckAnalysisStatusHandler, CheckAnalysisStatusValidator } from "@/Features/ExcelAnalysis/CheckAnalysisStatus/CheckAnalysisStatus"

export async function GET(
  req: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const session = await getServerSession()
    
    if (!session) {
      return NextResponse.json(
        { success: false, message: "인증이 필요합니다." },
        { status: 401 }
      )
    }

    // Validate request
    const validationResult = CheckAnalysisStatusValidator.validate({
      fileId: params.fileId,
      userId: session.user.id,
    })

    if (validationResult.isFailure) {
      return NextResponse.json(
        { success: false, message: validationResult.error.message },
        { status: 400 }
      )
    }

    // Handle status check
    const handler = new CheckAnalysisStatusHandler()
    const result = await handler.handle(validationResult.value)

    if (result.isFailure) {
      return NextResponse.json(
        { success: false, message: result.error.message },
        { status: result.error.code === "FILE_NOT_FOUND" ? 404 : 500 }
      )
    }

    return NextResponse.json({
      success: true,
      ...result.value,
    })
  } catch (error) {
    console.error("Status check error:", error)
    return NextResponse.json(
      { success: false, message: "상태 확인 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}