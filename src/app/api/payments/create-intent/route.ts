import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from '@/lib/auth/session'
import { CreatePaymentIntentValidator, CreatePaymentIntentHandler } from "@/Features/Payment/CreatePaymentIntent/CreatePaymentIntent"
import { createAIRateLimit } from "@/Host/Middleware/RateLimitMiddleware"

const rateLimiter = createAIRateLimit()

export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimiter.handle(req)
    if (rateLimitResult) {
      return rateLimitResult
    }

    // Check authentication
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await req.json()
    
    // Add userId from session
    const request = {
      ...body,
      userId: session.user.id,
    }

    // Validate request
    const validation = CreatePaymentIntentValidator.validate(request)
    if (!validation.isSuccess) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    // Handle request
    const handler = new CreatePaymentIntentHandler()
    const result = await handler.handle(validation.value)

    if (!result.isSuccess) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json(result.value)
  } catch (error) {
    console.error("Payment intent creation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}