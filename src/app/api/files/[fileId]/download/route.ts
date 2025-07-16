import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-helper"
import { DownloadCorrectedFileHandler, DownloadCorrectedFileValidator } from "@/Features/ExcelDownload/DownloadCorrectedFile"
import { EnhancedExcelAnalyzer } from "@/lib/excel/analyzer-enhanced"

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

    const searchParams = req.nextUrl.searchParams
    const type = searchParams.get("type") || "corrected"

    // Validate request
    const validationResult = DownloadCorrectedFileValidator.validate({
      fileId: params.fileId,
      userId: session.user.id,
      type,
    })

    if (validationResult.isFailure) {
      return NextResponse.json(
        { success: false, message: validationResult.error?.message || "Validation failed" },
        { status: 400 }
      )
    }

    // Handle download
    const handler = new DownloadCorrectedFileHandler(new EnhancedExcelAnalyzer())
    const result = await handler.handle(validationResult.value!)

    if (result.isFailure) {
      return NextResponse.json(
        { success: false, message: result.error?.message || "Request failed" },
        { status: result.error?.code === "FILE_NOT_FOUND" ? 404 : 500 }
      )
    }

    const { buffer, filename, contentType } = result.value

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Download error:", error)
    return NextResponse.json(
      { success: false, message: "다운로드 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}