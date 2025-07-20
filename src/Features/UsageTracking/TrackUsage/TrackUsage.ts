import { z } from "zod"
import { Result } from "@/Common/Result"
import { prisma } from "@/lib/prisma"
import { CreditCheckService } from "@/Features/Billing/CreditManagement/ConsumeCredits"

// Request/Response types
export class TrackUsage {
  static readonly Request = z.object({
    userId: z.string(),
    feature: z.enum([
      "excel_analysis",
      "ai_chat",
      "file_optimization",
      "report_generation",
    ]),
    metadata: z.object({
      fileSize: z.number().optional(),
      messageCount: z.number().optional(),
      analysisType: z.string().optional(),
      aiTier: z.enum(["TIER1", "TIER2"]).optional(),
    }).optional(),
  })

  static readonly Response = z.object({
    allowed: z.boolean(),
    reason: z.string().optional(),
    usage: z.object({
      daily: z.number(),
      weekly: z.number(),
      monthly: z.number(),
      remaining: z.number(),
    }),
    limits: z.object({
      daily: z.number(),
      weekly: z.number(),
      monthly: z.number(),
    }),
  })
}

export type TrackUsageRequest = z.infer<typeof TrackUsage.Request>
export type TrackUsageResponse = z.infer<typeof TrackUsage.Response>

// Validator
export class TrackUsageValidator {
  static validate(request: unknown): Result<TrackUsageRequest> {
    try {
      const validated = TrackUsage.Request.parse(request)
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

// Usage limits by subscription plan
const USAGE_LIMITS = {
  FREE: {
    excel_analysis: { daily: 3, weekly: 10, monthly: 20 },
    ai_chat: { daily: 10, weekly: 50, monthly: 100 },
    file_optimization: { daily: 2, weekly: 5, monthly: 10 },
    report_generation: { daily: 5, weekly: 20, monthly: 50 },
  },
  BASIC: {
    excel_analysis: { daily: 10, weekly: 50, monthly: 200 },
    ai_chat: { daily: 50, weekly: 300, monthly: 1000 },
    file_optimization: { daily: 10, weekly: 50, monthly: 200 },
    report_generation: { daily: 20, weekly: 100, monthly: 500 },
  },
  PREMIUM: {
    excel_analysis: { daily: 50, weekly: 300, monthly: 1000 },
    ai_chat: { daily: 200, weekly: 1000, monthly: 5000 },
    file_optimization: { daily: 30, weekly: 200, monthly: 800 },
    report_generation: { daily: 100, weekly: 500, monthly: 2000 },
  },
  ENTERPRISE: {
    excel_analysis: { daily: -1, weekly: -1, monthly: -1 }, // Unlimited
    ai_chat: { daily: -1, weekly: -1, monthly: -1 },
    file_optimization: { daily: -1, weekly: -1, monthly: -1 },
    report_generation: { daily: -1, weekly: -1, monthly: -1 },
  },
}

// Handler
export class TrackUsageHandler {
  async handle(request: TrackUsageRequest): Promise<Result<TrackUsageResponse>> {
    try {
      // Get user's subscription
      const subscription = await prisma.subscription.findUnique({
        where: { userId: request.userId },
      })

      if (!subscription) {
        return Result.failure({
          code: "NO_SUBSCRIPTION",
          message: "구독 정보를 찾을 수 없습니다.",
        })
      }

      // Check if user has enough credits
      const hasCredits = await CreditCheckService.hasEnoughCredits(
        request.userId,
        request.feature,
        1
      )

      if (!hasCredits) {
        return Result.success({
          allowed: false,
          reason: "크레딧이 부족합니다.",
          usage: await this.getUsageStats(request.userId, request.feature),
          limits: USAGE_LIMITS[subscription.plan][request.feature],
        })
      }

      // Get usage stats
      const usage = await this.getUsageStats(request.userId, request.feature)
      const limits = USAGE_LIMITS[subscription.plan][request.feature]

      // Check limits (unlimited = -1)
      const isWithinLimits = this.checkLimits(usage, limits)

      if (!isWithinLimits) {
        return Result.success({
          allowed: false,
          reason: "사용 한도를 초과했습니다.",
          usage,
          limits,
        })
      }

      // Record usage
      await this.recordUsage(request)

      return Result.success({
        allowed: true,
        usage: {
          ...usage,
          daily: usage.daily + 1,
          weekly: usage.weekly + 1,
          monthly: usage.monthly + 1,
          remaining: subscription.creditsRemaining,
        },
        limits,
      })
    } catch (error) {
      console.error("Usage tracking error:", error)
      return Result.failure({
        code: "USAGE_TRACKING_FAILED",
        message: "사용량 추적 중 오류가 발생했습니다.",
      })
    }
  }

  private async getUsageStats(
    userId: string,
    feature: string
  ): Promise<{ daily: number; weekly: number; monthly: number; remaining: number }> {
    const now = new Date()
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [daily, weekly, monthly, subscription] = await Promise.all([
      prisma.usageLog.count({
        where: {
          userId,
          feature,
          createdAt: { gte: dayAgo },
        },
      }),
      prisma.usageLog.count({
        where: {
          userId,
          feature,
          createdAt: { gte: weekAgo },
        },
      }),
      prisma.usageLog.count({
        where: {
          userId,
          feature,
          createdAt: { gte: monthAgo },
        },
      }),
      prisma.subscription.findUnique({
        where: { userId },
        select: { creditsRemaining: true },
      }),
    ])

    return {
      daily,
      weekly,
      monthly,
      remaining: subscription?.creditsRemaining || 0,
    }
  }

  private checkLimits(
    usage: { daily: number; weekly: number; monthly: number },
    limits: { daily: number; weekly: number; monthly: number }
  ): boolean {
    // -1 means unlimited
    if (limits.daily === -1) return true

    return (
      usage.daily < limits.daily &&
      usage.weekly < limits.weekly &&
      usage.monthly < limits.monthly
    )
  }

  private async recordUsage(request: TrackUsageRequest): Promise<void> {
    await prisma.usageLog.create({
      data: {
        userId: request.userId,
        feature: request.feature,
        metadata: JSON.stringify(request.metadata || {}),
      },
    })
  }
}