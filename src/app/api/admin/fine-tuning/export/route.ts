import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from '@/lib/auth/session'
import { FineTuningExporter } from "@/lib/fine-tuning/exporter"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    
    // Admin 권한 확인
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "권한이 없습니다." },
        { status: 403 }
      )
    }

    const body = await req.json()
    const {
      format = "openai", // openai, alpaca, llama2, vicuna, csv
      minQualityScore = 0.7,
      minRating = 4,
      taskTypes,
      includeEdited = true,
      limit = 10000,
      startDate,
      endDate
    } = body

    // 형식 검증
    const validFormats = ['openai', 'alpaca', 'llama2', 'vicuna', 'csv']
    if (!validFormats.includes(format)) {
      return NextResponse.json(
        { success: false, message: `지원하지 않는 형식입니다. 지원 형식: ${validFormats.join(', ')}` },
        { status: 400 }
      )
    }

    const exporter = new FineTuningExporter()
    
    const exportOptions = {
      minQualityScore,
      minRating,
      taskTypes,
      includeEdited,
      limit,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    }

    // 통합 export 메서드 사용
    const { data, filename, contentType } = await exporter.exportData(
      format as any,
      exportOptions
    )

    // 파일로 다운로드
    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Export error:", error)
    return NextResponse.json(
      { success: false, message: "내보내기 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}

// 내보내기 통계 조회
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession()
    
    // Admin 권한 확인
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "권한이 없습니다." },
        { status: 403 }
      )
    }

    const searchParams = req.nextUrl.searchParams
    const minQualityScore = parseFloat(searchParams.get("minQualityScore") || "0.7")
    const minRating = parseInt(searchParams.get("minRating") || "4")

    const exporter = new FineTuningExporter()
    
    const [stats, validation] = await Promise.all([
      exporter.generateExportStats({ minQualityScore, minRating }),
      exporter.validateDataset({ minQualityScore, minRating })
    ])

    return NextResponse.json({
      success: true,
      stats,
      validation
    })
  } catch (error) {
    console.error("Get export stats error:", error)
    return NextResponse.json(
      { success: false, message: "통계 조회 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}