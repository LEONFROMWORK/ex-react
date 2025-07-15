import { z } from "zod"
import { Result } from "@/Common/Result"
import { prisma } from "@/lib/prisma"

// Request/Response types
export class GetReferralStats {
  static readonly Request = z.object({
    userId: z.string(),
  })

  static readonly Response = z.object({
    referralCode: z.string(),
    referralUrl: z.string(),
    stats: z.object({
      totalReferrals: z.number(),
      pendingReferrals: z.number(),
      completedReferrals: z.number(),
      totalEarnings: z.number(),
      totalTokensEarned: z.number(),
    }),
    referrals: z.array(z.object({
      id: z.string(),
      refereeEmail: z.string(),
      status: z.enum(["PENDING", "COMPLETED", "EXPIRED"]),
      rewardAmount: z.number(),
      createdAt: z.date(),
      completedAt: z.date().nullable(),
    })),
    leaderboard: z.object({
      rank: z.number(),
      totalUsers: z.number(),
    }),
  })
}

export type GetReferralStatsRequest = z.infer<typeof GetReferralStats.Request>
export type GetReferralStatsResponse = z.infer<typeof GetReferralStats.Response>

// Validator
export class GetReferralStatsValidator {
  static validate(request: unknown): Result<GetReferralStatsRequest> {
    try {
      const validated = GetReferralStats.Request.parse(request)
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
export class GetReferralStatsHandler {
  async handle(request: GetReferralStatsRequest): Promise<Result<GetReferralStatsResponse>> {
    try {
      // Get user's referral info
      const referral = await prisma.referral.findUnique({
        where: { userId: request.userId },
      })

      if (!referral) {
        return Result.failure({
          code: "NO_REFERRAL_CODE",
          message: "추천 코드가 없습니다.",
        })
      }

      // Get referral logs
      const referralLogs = await prisma.referralLog.findMany({
        where: { referrerId: request.userId },
        orderBy: { createdAt: "desc" },
        take: 100,
      })

      // Calculate stats
      const pendingReferrals = referralLogs.filter(r => r.status === "PENDING").length
      const completedReferrals = referralLogs.filter(r => r.status === "COMPLETED").length

      // Get token earnings from transactions
      const tokenTransactions = await prisma.transaction.findMany({
        where: {
          userId: request.userId,
          type: "BONUS",
          description: {
            contains: "추천",
          },
        },
      })

      const totalTokensEarned = tokenTransactions.reduce(
        (sum, t) => sum + (t.tokens || 0),
        0
      )

      // Calculate leaderboard rank
      const usersWithMoreReferrals = await prisma.referral.count({
        where: {
          referralCount: {
            gt: referral.referralCount,
          },
        },
      })

      const totalUsersWithReferrals = await prisma.referral.count({
        where: {
          referralCount: {
            gt: 0,
          },
        },
      })

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      const referralUrl = `${baseUrl}/signup?ref=${referral.referralCode}`

      return Result.success({
        referralCode: referral.referralCode,
        referralUrl,
        stats: {
          totalReferrals: referral.referralCount,
          pendingReferrals,
          completedReferrals,
          totalEarnings: referral.totalEarned,
          totalTokensEarned,
        },
        referrals: referralLogs.map(log => ({
          id: log.id,
          refereeEmail: log.refereeEmail,
          status: log.status,
          rewardAmount: log.rewardAmount,
          createdAt: log.createdAt,
          completedAt: log.completedAt,
        })),
        leaderboard: {
          rank: usersWithMoreReferrals + 1,
          totalUsers: totalUsersWithReferrals,
        },
      })
    } catch (error) {
      console.error("Referral stats error:", error)
      return Result.failure({
        code: "REFERRAL_STATS_FAILED",
        message: "추천 통계 조회 중 오류가 발생했습니다.",
      })
    }
  }
}