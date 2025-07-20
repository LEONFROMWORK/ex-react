import { z } from "zod"
import { Result } from "@/Common/Result"
import { prisma } from "@/lib/prisma"

// Request/Response types
export class ConsumeCredits {
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
    remainingCredits: z.number(),
    subscription: z.object({
      plan: z.enum(["FREE", "BASIC", "PREMIUM", "ENTERPRISE"]),
      creditsRemaining: z.number(),
      monthlyCredits: z.number(),
      validUntil: z.date().nullable(),
    }),
  })
}

export type ConsumeCreditsRequest = z.infer<typeof ConsumeCredits.Request>
export type ConsumeCreditsResponse = z.infer<typeof ConsumeCredits.Response>

// Validator
export class ConsumeCreditsValidator {
  static validate(request: unknown): Result<ConsumeCreditsRequest> {
    try {
      const validated = ConsumeCredits.Request.parse(request)
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

// Credit costs by feature
const CREDIT_COSTS = {
  excel_analysis: 10,
  ai_chat: 5,
  file_optimization: 15,
  report_generation: 5,
}

// Handler
export class ConsumeCreditsHandler {
  async handle(request: ConsumeCreditsRequest): Promise<Result<ConsumeCreditsResponse>> {
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
              creditsRemaining: 100,
              monthlyCredits: 100,
            },
          })
          return { subscription: newSubscription, consumed: false }
        }

        // Check if user has enough credits
        const cost = CREDIT_COSTS[request.reason] * request.amount
        if (subscription.creditsRemaining < cost) {
          return { subscription, consumed: false, insufficientCredits: true }
        }

        // Check if subscription is still valid
        if (subscription.validUntil && subscription.validUntil < new Date()) {
          return { subscription, consumed: false, expired: true }
        }

        // Consume credits
        const updatedSubscription = await tx.subscription.update({
          where: { userId: request.userId },
          data: {
            creditsRemaining: {
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
            credits: -cost,
            description: `${request.reason} - ${request.amount} units`,
            status: "COMPLETED",
            metadata: JSON.stringify(request.metadata || {}),
          },
        })

        return { subscription: updatedSubscription, consumed: true }
      })

      if (!result.consumed) {
        if (result.insufficientCredits) {
          return Result.failure({
            code: "INSUFFICIENT_CREDITS",
            message: "크레딧이 부족합니다.",
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
        remainingCredits: result.subscription.creditsRemaining,
        subscription: {
          plan: result.subscription.plan,
          creditsRemaining: result.subscription.creditsRemaining,
          monthlyCredits: result.subscription.monthlyCredits,
          validUntil: result.subscription.validUntil,
        },
      })
    } catch (error) {
      console.error("Credit consumption error:", error)
      return Result.failure({
        code: "CREDIT_CONSUMPTION_FAILED",
        message: "크레딧 차감 중 오류가 발생했습니다.",
      })
    }
  }
}

// Credit check service
export class CreditCheckService {
  static async hasEnoughCredits(
    userId: string,
    reason: keyof typeof CREDIT_COSTS,
    amount: number = 1
  ): Promise<boolean> {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    })

    if (!subscription) return false

    const cost = CREDIT_COSTS[reason] * amount
    return subscription.creditsRemaining >= cost
  }

  static async getCreditCost(
    reason: keyof typeof CREDIT_COSTS,
    amount: number = 1
  ): Promise<number> {
    return CREDIT_COSTS[reason] * amount
  }
}

// For backward compatibility with TokenManagement
export const ConsumeTokensValidator = ConsumeCreditsValidator
export const ConsumeTokensHandler = ConsumeCreditsHandler