import { NextRequest, NextResponse } from "next/server"
import { getMockSession } from "@/lib/auth/mock-session"

// Mock analysis data store
const mockAnalyses = new Map<string, any>()

export async function GET(
  req: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const session = await getMockSession()
    
    if (!session) {
      return NextResponse.json(
        { success: false, message: "인증이 필요합니다." },
        { status: 401 }
      )
    }

    const { fileId } = params

    // Check if we have a mock analysis for this file
    let analysis = mockAnalyses.get(fileId)
    
    // If no analysis exists, create one in PROCESSING state
    if (!analysis) {
      analysis = {
        id: `analysis-${fileId}`,
        fileId,
        status: "PROCESSING",
        progress: 50,
        errors: [],
        startedAt: new Date().toISOString(),
      }
      mockAnalyses.set(fileId, analysis)
      
      // Simulate analysis completion after 3 seconds
      setTimeout(() => {
        const updatedAnalysis = {
          ...analysis,
          status: "COMPLETED",
          progress: 100,
          completedAt: new Date().toISOString(),
          errors: [
            {
              id: "err-1",
              type: "FORMULA_ERROR",
              severity: "HIGH",
              message: "순환 참조 오류",
              location: "Sheet1!A1:A5",
              suggestion: "순환 참조를 제거하세요"
            },
            {
              id: "err-2",
              type: "DATA_TYPE_ERROR",
              severity: "MEDIUM",
              message: "잘못된 데이터 타입",
              location: "Sheet1!B10",
              suggestion: "숫자 형식으로 변경하세요"
            }
          ],
          summary: {
            totalErrors: 2,
            criticalErrors: 1,
            warnings: 1,
            suggestions: 2
          }
        }
        mockAnalyses.set(fileId, updatedAnalysis)
      }, 3000)
    }

    return NextResponse.json({
      success: true,
      status: analysis.status,
      progress: analysis.progress,
      errors: analysis.errors || [],
      summary: analysis.summary,
      startedAt: analysis.startedAt,
      completedAt: analysis.completedAt
    })
  } catch (error) {
    console.error("Status check error:", error)
    return NextResponse.json(
      { success: false, message: "상태 확인 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}