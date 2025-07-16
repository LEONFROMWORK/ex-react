import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from '@/lib/auth/session'
import { TrackUsageHandler, TrackUsageValidator } from "../TrackUsage/TrackUsage"
import { ConsumeTokensHandler, ConsumeTokensValidator } from "@/Features/Billing/TokenManagement/ConsumeTokens"

interface UsageLimitConfig {
  feature: "excel_analysis" | "ai_chat" | "file_optimization" | "report_generation"
  consumeTokens?: boolean
  metadata?: Record<string, any>
}

export class UsageLimitMiddleware {
  constructor(private config: UsageLimitConfig) {}

  async handle(req: NextRequest): Promise<NextResponse | null> {
    try {
      // Get user session
      const session = await getServerSession()
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        )
      }

      // Track usage
      const trackRequest = {
        userId: session.user.id,
        feature: this.config.feature,
        metadata: this.config.metadata,
      }

      const trackValidation = TrackUsageValidator.validate(trackRequest)
      if (!trackValidation.isSuccess) {
        return NextResponse.json(
          { error: trackValidation.error },
          { status: 400 }
        )
      }

      const trackHandler = new TrackUsageHandler()
      const trackResult = await trackHandler.handle(trackValidation.value)

      if (!trackResult.isSuccess) {
        return NextResponse.json(
          { error: trackResult.error },
          { status: 400 }
        )
      }

      // Check if usage is allowed
      if (!trackResult.value.allowed) {
        return NextResponse.json(
          {
            error: "USAGE_LIMIT_EXCEEDED",
            message: trackResult.value.reason,
            usage: trackResult.value.usage,
            limits: trackResult.value.limits,
          },
          { status: 429 }
        )
      }

      // Consume tokens if required
      if (this.config.consumeTokens) {
        const consumeRequest = {
          userId: session.user.id,
          amount: 1,
          reason: this.config.feature,
          metadata: this.config.metadata,
        }

        const consumeValidation = ConsumeTokensValidator.validate(consumeRequest)
        if (!consumeValidation.isSuccess) {
          return NextResponse.json(
            { error: consumeValidation.error },
            { status: 400 }
          )
        }

        const consumeHandler = new ConsumeTokensHandler()
        const consumeResult = await consumeHandler.handle(consumeValidation.value)

        if (!consumeResult.isSuccess) {
          return NextResponse.json(
            { error: consumeResult.error },
            { status: 400 }
          )
        }

        // Add token info to request headers for downstream use
        const headers = new Headers(req.headers)
        headers.set("x-tokens-remaining", consumeResult.value.remainingTokens.toString())
        headers.set("x-subscription-plan", consumeResult.value.subscription.plan)
      }

      // Continue to next middleware/handler
      return null
    } catch (error) {
      console.error("Usage limit middleware error:", error)
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      )
    }
  }
}

// Factory functions for different features
export const createExcelAnalysisLimit = () => new UsageLimitMiddleware({
  feature: "excel_analysis",
  consumeTokens: true,
})

export const createAIChatLimit = () => new UsageLimitMiddleware({
  feature: "ai_chat",
  consumeTokens: true,
})

export const createFileOptimizationLimit = () => new UsageLimitMiddleware({
  feature: "file_optimization",
  consumeTokens: true,
})

export const createReportGenerationLimit = () => new UsageLimitMiddleware({
  feature: "report_generation",
  consumeTokens: true,
})