import { z } from "zod"
import { Result } from "@/Common/Result"
import { prisma } from "@/lib/prisma"

// Request/Response types
export class ProcessReferral {
  static readonly Request = z.object({
    referrerCode: z.string(),
    refereeEmail: z.string(),
    refereeUserId: z.string(),
  })

  static readonly Response = z.object({
    success: z.boolean(),
    referrerReward: z.number(),
    refereeReward: z.number(),
  })
}

export type ProcessReferralRequest = z.infer<typeof ProcessReferral.Request>
export type ProcessReferralResponse = z.infer<typeof ProcessReferral.Response>

// Validator
export class ProcessReferralValidator {
  static validate(request: unknown): Result<ProcessReferralRequest> {
    try {
      const validated = ProcessReferral.Request.parse(request)
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

// Referral rewards configuration
const REFERRAL_REWARDS = {
  REFERRER_TOKENS: 500,    // Tokens for the person who referred
  REFEREE_TOKENS: 200,     // Tokens for the new user
  REFERRER_CASH: 5000,     // Cash reward in KRW
}

// Handler
export class ProcessReferralHandler {
  async handle(request: ProcessReferralRequest): Promise<Result<ProcessReferralResponse>> {
    try {
      // Find referrer by code
      const referral = await prisma.referral.findUnique({
        where: { referralCode: request.referrerCode },
        include: { user: true },
      })

      if (!referral) {
        return Result.failure({
          code: "INVALID_REFERRAL_CODE",
          message: "유효하지 않은 추천 코드입니다.",
        })
      }

      // Check if this email has already been referred
      const existingReferral = await prisma.referralLog.findFirst({
        where: {
          referrerId: referral.userId,
          refereeEmail: request.refereeEmail,
        },
      })

      if (existingReferral) {
        return Result.failure({
          code: "ALREADY_REFERRED",
          message: "이미 추천된 사용자입니다.",
        })
      }

      // Start transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create referral log
        const referralLog = await tx.referralLog.create({
          data: {
            referrerId: referral.userId,
            refereeEmail: request.refereeEmail,
            status: "PENDING",
            rewardAmount: REFERRAL_REWARDS.REFERRER_CASH,
          },
        })

        // Update referee user with referral info
        await tx.user.update({
          where: { id: request.refereeUserId },
          data: { referredBy: referral.referralCode },
        })

        // Give tokens to referee (new user)
        await tx.subscription.update({
          where: { userId: request.refereeUserId },
          data: {
            tokensRemaining: {
              increment: REFERRAL_REWARDS.REFEREE_TOKENS,
            },
          },
        })

        // Create transaction record for referee
        await tx.transaction.create({
          data: {
            userId: request.refereeUserId,
            type: "BONUS",
            amount: 0,
            tokens: REFERRAL_REWARDS.REFEREE_TOKENS,
            description: "회원가입 추천 보너스",
            status: "COMPLETED",
          },
        })

        // Give tokens to referrer
        await tx.subscription.update({
          where: { userId: referral.userId },
          data: {
            tokensRemaining: {
              increment: REFERRAL_REWARDS.REFERRER_TOKENS,
            },
          },
        })

        // Create transaction record for referrer
        await tx.transaction.create({
          data: {
            userId: referral.userId,
            type: "BONUS",
            amount: REFERRAL_REWARDS.REFERRER_CASH,
            tokens: REFERRAL_REWARDS.REFERRER_TOKENS,
            description: `${request.refereeEmail} 추천 보상`,
            status: "COMPLETED",
          },
        })

        // Update referral stats
        await tx.referral.update({
          where: { id: referral.id },
          data: {
            referralCount: {
              increment: 1,
            },
            totalEarned: {
              increment: REFERRAL_REWARDS.REFERRER_CASH,
            },
          },
        })

        // Mark referral log as completed
        await tx.referralLog.update({
          where: { id: referralLog.id },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
          },
        })

        return {
          referrerReward: REFERRAL_REWARDS.REFERRER_TOKENS,
          refereeReward: REFERRAL_REWARDS.REFEREE_TOKENS,
        }
      })

      return Result.success({
        success: true,
        referrerReward: result.referrerReward,
        refereeReward: result.refereeReward,
      })
    } catch (error) {
      console.error("Referral processing error:", error)
      return Result.failure({
        code: "REFERRAL_PROCESSING_FAILED",
        message: "추천 처리 중 오류가 발생했습니다.",
      })
    }
  }
}