import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-helper"
import { container } from "@/Infrastructure/DependencyInjection/Container"
import { createAIChatLimit } from "@/Features/UsageTracking/Middleware/UsageLimitMiddleware"

const usageLimiter = createAIChatLimit()

export async function POST(req: NextRequest) {
  try {
    // Apply usage limit
    const usageLimitResult = await usageLimiter.handle(req)
    if (usageLimitResult) {
      return usageLimitResult
    }

    const session = await getServerSession()
    
    if (!session) {
      return NextResponse.json(
        { success: false, message: "인증이 필요합니다." },
        { status: 401 }
      )
    }

    const body = await req.json()

    // Handle chat message using new architecture
    const handler = container.getSendMessageHandler()
    const result = await handler.handle()

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "채팅 기능은 현재 비활성화되어 있습니다.",
    })
  } catch (error) {
    console.error("Chat error:", error)
    return NextResponse.json(
      { success: false, message: "채팅 처리 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}