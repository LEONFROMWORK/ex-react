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
    const result = await handler.handle({
      ...body,
      userId: session.user.id,
      tenantId: 'default' // Default tenant
    })

    if (result.isFailure) {
      return NextResponse.json(
        { success: false, message: result.error!.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      ...result.value,
    })
  } catch (error) {
    console.error("Chat error:", error)
    return NextResponse.json(
      { success: false, message: "채팅 처리 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}