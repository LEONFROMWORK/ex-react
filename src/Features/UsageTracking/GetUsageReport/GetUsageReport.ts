import { z } from "zod"
import { Result } from "@/Common/Result"
import { prisma } from "@/lib/prisma"

// Request/Response types
export class GetUsageReport {
  static readonly Request = z.object({
    userId: z.string(),
    period: z.enum(["daily", "weekly", "monthly", "all"]),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
  })

  static readonly Response = z.object({
    summary: z.object({
      totalUsage: z.number(),
      tokensConsumed: z.number(),
      tokensRemaining: z.number(),
      mostUsedFeature: z.string(),
      averageDailyUsage: z.number(),
    }),
    breakdown: z.array(z.object({
      feature: z.string(),
      count: z.number(),
      tokensUsed: z.number(),
      percentage: z.number(),
    })),
    timeline: z.array(z.object({
      date: z.string(),
      usage: z.record(z.number()),
    })),
    subscription: z.object({
      plan: z.string(),
      tokensRemaining: z.number(),
      monthlyTokens: z.number(),
      renewalDate: z.date().nullable(),
    }),
  })
}

export type GetUsageReportRequest = z.infer<typeof GetUsageReport.Request>
export type GetUsageReportResponse = z.infer<typeof GetUsageReport.Response>

// Validator
export class GetUsageReportValidator {
  static validate(request: unknown): Result<GetUsageReportRequest> {
    try {
      const validated = GetUsageReport.Request.parse(request)
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

// Handler
export class GetUsageReportHandler {
  async handle(request: GetUsageReportRequest): Promise<Result<GetUsageReportResponse>> {
    try {
      // Get date range
      const { startDate, endDate } = this.getDateRange(request)

      // Get subscription info
      const subscription = await prisma.subscription.findUnique({
        where: { userId: request.userId },
      })

      if (!subscription) {
        return Result.failure({
          code: "NO_SUBSCRIPTION",
          message: "구독 정보를 찾을 수 없습니다.",
        })
      }

      // Get usage logs
      const usageLogs = await prisma.usageLog.findMany({
        where: {
          userId: request.userId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { createdAt: "asc" },
      })

      // Get token transactions
      const transactions = await prisma.transaction.findMany({
        where: {
          userId: request.userId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          credits: { not: null },
        },
      })

      // Calculate summary
      const summary = this.calculateSummary(usageLogs, transactions, subscription)

      // Calculate breakdown by feature
      const breakdown = this.calculateBreakdown(usageLogs, transactions)

      // Generate timeline
      const timeline = this.generateTimeline(usageLogs, startDate, endDate)

      return Result.success({
        summary,
        breakdown,
        timeline,
        subscription: {
          plan: subscription.plan,
          creditsRemaining: subscription.creditsRemaining,
          monthlyCredits: subscription.monthlyCredits,
          renewalDate: subscription.currentPeriodEnd,
        },
      })
    } catch (error) {
      console.error("Usage report error:", error)
      return Result.failure({
        code: "REPORT_GENERATION_FAILED",
        message: "사용량 리포트 생성 중 오류가 발생했습니다.",
      })
    }
  }

  private getDateRange(request: GetUsageReportRequest): { startDate: Date; endDate: Date } {
    const now = new Date()
    let startDate: Date
    let endDate: Date = request.endDate || now

    if (request.startDate) {
      startDate = request.startDate
    } else {
      switch (request.period) {
        case "daily":
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
          break
        case "weekly":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case "monthly":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        case "all":
        default:
          startDate = new Date(0) // Beginning of time
      }
    }

    return { startDate, endDate }
  }

  private calculateSummary(
    usageLogs: any[],
    transactions: any[],
    subscription: any
  ): any {
    const totalUsage = usageLogs.length
    const tokensConsumed = Math.abs(
      transactions.reduce((sum, t) => sum + (t.tokens || 0), 0)
    )

    const featureCounts = usageLogs.reduce((acc, log) => {
      acc[log.feature] = (acc[log.feature] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const mostUsedFeature = Object.entries(featureCounts).sort(
      ([, a], [, b]) => (b as number) - (a as number)
    )[0]?.[0] || "none"

    const days = Math.max(1, Math.ceil(
      (new Date().getTime() - Math.min(...usageLogs.map(l => l.createdAt.getTime()))) /
      (24 * 60 * 60 * 1000)
    ))

    return {
      totalUsage,
      tokensConsumed,
      tokensRemaining: subscription.tokensRemaining,
      mostUsedFeature,
      averageDailyUsage: Math.round(totalUsage / days),
    }
  }

  private calculateBreakdown(usageLogs: any[], transactions: any[]): any[] {
    const featureStats = usageLogs.reduce((acc, log) => {
      if (!acc[log.feature]) {
        acc[log.feature] = { count: 0, tokensUsed: 0 }
      }
      acc[log.feature].count++
      return acc
    }, {} as Record<string, { count: number; tokensUsed: number }>)

    // Estimate tokens per feature from transactions
    const totalUsage = usageLogs.length
    const totalTokens = Math.abs(
      transactions.reduce((sum, t) => sum + (t.tokens || 0), 0)
    )

    return Object.entries(featureStats).map(([feature, stats]) => ({
      feature,
      count: (stats as any).count || 0,
      creditsUsed: Math.round(((stats as any).count || 0) / totalUsage * totalTokens),
      percentage: Math.round(((stats as any).count || 0) / totalUsage * 100),
    }))
  }

  private generateTimeline(
    usageLogs: any[],
    startDate: Date,
    endDate: Date
  ): any[] {
    const timeline: Record<string, Record<string, number>> = {}

    // Initialize timeline
    const current = new Date(startDate)
    while (current <= endDate) {
      const dateKey = current.toISOString().split("T")[0]
      timeline[dateKey] = {}
      current.setDate(current.getDate() + 1)
    }

    // Populate with usage data
    usageLogs.forEach(log => {
      const dateKey = log.createdAt.toISOString().split("T")[0]
      if (timeline[dateKey]) {
        timeline[dateKey][log.feature] = (timeline[dateKey][log.feature] || 0) + 1
      }
    })

    return Object.entries(timeline).map(([date, usage]) => ({
      date,
      usage,
    }))
  }
}