import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { CorrectWithAIHandler } from "@/Features/ExcelCorrection/CorrectWithAI"

export async function POST(
  req: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { analysisId, aiTier = "auto", autoApply = true } = body

    if (!analysisId) {
      return NextResponse.json(
        { error: "Analysis ID is required" },
        { status: 400 }
      )
    }

    const handler = new CorrectWithAIHandler()
    const result = await handler.handle({
      fileId: params.fileId,
      userId: session.user.id,
      analysisId,
      aiTier,
      autoApply
    })

    if (!result.isSuccess) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(result.value)
  } catch (error) {
    console.error("AI correction error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}