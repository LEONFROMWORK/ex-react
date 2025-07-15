import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-helper"
import { SendChatMessageHandler, SendChatMessageValidator } from "@/Features/AIChat/SendChatMessage"
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

    // Validate request
    const validationResult = SendChatMessageValidator.validate({
      ...body,
      userId: session.user.id,
    })

    if (validationResult.isFailure) {
      return NextResponse.json(
        { success: false, message: validationResult.error.message },
        { status: 400 }
      )
    }

    // Handle chat message
    const handler = new SendChatMessageHandler()
    const result = await handler.handle(validationResult.value)

    if (result.isFailure) {
      return NextResponse.json(
        { success: false, message: result.error.message },
        { status: 500 }
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