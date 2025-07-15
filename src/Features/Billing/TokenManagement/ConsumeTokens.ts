import { z } from "zod"
import { Result } from "@/Common/Result"
import { prisma } from "@/lib/prisma"

// Request/Response types
export class ConsumeTokens {
  static readonly Request = z.object({
    userId: z.string(),
    amount: z.number().positive(),
    reason: z.enum([
      "excel_analysis",
      "ai_chat",
      "file_optimization",
      "report_generation",
    ]),
    metadata: z.record(z.any()).optional(),
  })

  static readonly Response = z.object({
    success: z.boolean(),
    remainingTokens: z.number(),
    subscription: z.object({
      plan: z.enum(["FREE", "BASIC", "PREMIUM", "ENTERPRISE"]),
      tokensRemaining: z.number(),
      monthlyTokens: z.number(),
      validUntil: z.date().nullable(),
    }),
  })
}

export type ConsumeTokensRequest = z.infer<typeof ConsumeTokens.Request>
export type ConsumeTokensResponse = z.infer<typeof ConsumeTokens.Response>

// Validator
export class ConsumeTokensValidator {
  static validate(request: unknown): Result<ConsumeTokensRequest> {
    try {
      const validated = ConsumeTokens.Request.parse(request)
      return Result.success(validated)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return Result.failure({
          code: "VALIDATION_ERROR",
          message: error.errors.map(e => e.message).join(", "),
        })
      }
      return Result.failure({
        code: "INVALID_REQUEST",
        message: "잘못된 요청입니다.",
      })
    }
  }
}

// Token costs by feature
const TOKEN_COSTS = {
  excel_analysis: 10,
  ai_chat: 5,
  file_optimization: 15,
  report_generation: 5,
}

// Handler
export class ConsumeTokensHandler {
  async handle(request: ConsumeTokensRequest): Promise<Result<ConsumeTokensResponse>> {
    try {
      // Start transaction
      const result = await prisma.$transaction(async (tx) => {
        // Get user's subscription
        const subscription = await tx.subscription.findUnique({
          where: { userId: request.userId },
        })

        if (!subscription) {
          // Create default free subscription
          const newSubscription = await tx.subscription.create({
            data: {
              userId: request.userId,
              plan: "FREE",
              tokensRemaining: 100,
              monthlyTokens: 100,
            },
          })
          return { subscription: newSubscription, consumed: false }
        }

        // Check if user has enough tokens
        const cost = TOKEN_COSTS[request.reason] * request.amount
        if (subscription.tokensRemaining < cost) {
          return { subscription, consumed: false, insufficientTokens: true }
        }

        // Check if subscription is still valid
        if (subscription.validUntil && subscription.validUntil < new Date()) {
          return { subscription, consumed: false, expired: true }
        }

        // Consume tokens
        const updatedSubscription = await tx.subscription.update({
          where: { userId: request.userId },
          data: {
            tokensRemaining: {
              decrement: cost,
            },
          },
        })

        // Record transaction
        await tx.transaction.create({
          data: {
            userId: request.userId,
            type: "PURCHASE",
            amount: -cost,
            tokens: -cost,
            description: `${request.reason} - ${request.amount} units`,
            status: "COMPLETED",
            metadata: request.metadata,
          },
        })

        return { subscription: updatedSubscription, consumed: true }
      })

      if (!result.consumed) {
        if (result.insufficientTokens) {
          return Result.failure({
            code: "INSUFFICIENT_TOKENS",
            message: "토큰이 부족합니다.",
          })
        }
        if (result.expired) {
          return Result.failure({
            code: "SUBSCRIPTION_EXPIRED",
            message: "구독이 만료되었습니다.",
          })
        }
      }

      return Result.success({
        success: true,
        remainingTokens: result.subscription.tokensRemaining,
        subscription: {
          plan: result.subscription.plan,
          tokensRemaining: result.subscription.tokensRemaining,
          monthlyTokens: result.subscription.monthlyTokens,
          validUntil: result.subscription.validUntil,
        },
      })
    } catch (error) {
      console.error("Token consumption error:", error)
      return Result.failure({
        code: "TOKEN_CONSUMPTION_FAILED",
        message: "토큰 차감 중 오류가 발생했습니다.",
      })
    }
  }
}

// Token check service
export class TokenCheckService {
  static async hasEnoughTokens(
    userId: string,
    reason: keyof typeof TOKEN_COSTS,
    amount: number = 1
  ): Promise<boolean> {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    })

    if (!subscription) return false

    const cost = TOKEN_COSTS[reason] * amount
    return subscription.tokensRemaining >= cost
  }

  static async getTokenCost(
    reason: keyof typeof TOKEN_COSTS,
    amount: number = 1
  ): number {
    return TOKEN_COSTS[reason] * amount
  }
}