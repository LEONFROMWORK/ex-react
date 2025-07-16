import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { Container } from "@/Infrastructure/DependencyInjection/Container"
import { TenantContext } from "@/Common/Tenant/TenantContext"
import { PipelineExecutor } from "@/Common/Pipeline/PipelineExecutor"
import { LoggingBehavior } from "@/Common/Pipeline/LoggingBehavior"
import { TenantBehavior } from "@/Common/Pipeline/TenantBehavior"
import { ValidationBehavior } from "@/Common/Pipeline/ValidationBehavior"
import { SendMessageHandler, SendMessageRequestSchema } from "@/Features/AIChat/SendMessage/SendMessage"
import { createAIChatLimit } from "@/Features/UsageTracking/Middleware/UsageLimitMiddleware"

const usageLimiter = createAIChatLimit()

export async function POST(req: NextRequest) {
  try {
    // Apply usage limit
    const usageLimitResult = await usageLimiter.handle(req)
    if (usageLimitResult) {
      return usageLimitResult
    }

    // Get tenant context from headers
    const headersList = headers()
    const tenantId = headersList.get('x-tenant-id') || 'default'
    const userId = headersList.get('x-user-id')

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "인증이 필요합니다." },
        { status: 401 }
      )
    }

    // Initialize container with tenant context
    const tenantContext = new TenantContext()
    tenantContext.setContext(tenantId, userId)
    
    const container = Container.getInstance()

    // Create pipeline
    const pipeline = new PipelineExecutor([
      new LoggingBehavior(console),
      new TenantBehavior(tenantContext),
      new ValidationBehavior(SendMessageRequestSchema),
    ])

    const body = await req.json()
    const request = {
      ...body,
      userId,
      tenantId,
    }

    // Execute through pipeline
    const handler = container.getSendMessageHandler()
    const result = await pipeline.execute(request, (req) => handler.handle(req))

    if (result.isFailure) {
      return NextResponse.json(
        { success: false, message: result.error?.message || 'Request failed' },
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