import { prisma } from "@/lib/prisma"
import { Result } from "@/types/common"

interface ProcessReferralRewardRequest {
  userId: string
  paymentAmount: number
  paymentId: string
}

interface ProcessReferralRewardResponse {
  rewardProcessed: boolean
  tokensAwarded?: number
  referrerId?: string
}

export class ProcessReferralRewardHandler {
  async handle(request: ProcessReferralRewardRequest): Promise<Result<ProcessReferralRewardResponse>> {
    try {
      // Check if user was referred
      const user = await prisma.user.findUnique({
        where: { id: request.userId },
        select: { referredBy: true }
      })

      if (!user?.referredBy) {
        return {
          success: true,
          data: { rewardProcessed: false }
        }
      }

      // Find the referrer's referral record
      const referral = await prisma.referral.findUnique({
        where: { referralCode: user.referredBy },
        include: { user: true }
      })

      if (!referral) {
        return {
          success: true,
          data: { rewardProcessed: false }
        }
      }

      // Check if this is the first payment
      const existingPayments = await prisma.transaction.count({
        where: {
          userId: request.userId,
          type: "PURCHASE",
          status: "COMPLETED",
          id: { not: request.paymentId }
        }
      })

      if (existingPayments > 0) {
        return {
          success: true,
          data: { rewardProcessed: false }
        }
      }

      // Check if reward already processed for this payment
      const existingReward = await prisma.referralReward.findFirst({
        where: {
          refereeId: request.userId,
          rewardType: "FIRST_PAYMENT",
          triggerDetails: {
            path: ['paymentId'],
            equals: request.paymentId
          }
        }
      })

      if (existingReward) {
        return {
          success: true,
          data: { rewardProcessed: false }
        }
      }

      // Process the reward
      const rewardTokens = referral.tokenRewardAmount
      const cashReward = request.paymentAmount * 0.1 // 10% of payment as cash reward

      // Create reward record
      await prisma.referralReward.create({
        data: {
          referralId: referral.id,
          referrerId: referral.userId,
          refereeId: request.userId,
          rewardType: "FIRST_PAYMENT",
          tokensAwarded: rewardTokens,
          cashAwarded: cashReward,
          triggerEvent: "first_payment_completed",
          triggerDetails: {
            paymentId: request.paymentId,
            paymentAmount: request.paymentAmount,
            paymentDate: new Date()
          },
          status: "PENDING"
        }
      })

      // Update referrer's tokens and earnings
      await prisma.$transaction([
        prisma.user.update({
          where: { id: referral.userId },
          data: {
            tokens: { increment: rewardTokens }
          }
        }),
        prisma.referral.update({
          where: { id: referral.id },
          data: {
            referralCount: { increment: 1 },
            totalTokensEarned: { increment: rewardTokens },
            totalEarned: { increment: cashReward }
          }
        }),
        prisma.referralReward.updateMany({
          where: {
            referrerId: referral.userId,
            refereeId: request.userId,
            rewardType: "FIRST_PAYMENT"
          },
          data: {
            status: "COMPLETED",
            completedAt: new Date()
          }
        })
      ])

      // Create transaction record for token reward
      await prisma.transaction.create({
        data: {
          userId: referral.userId,
          type: "BONUS",
          amount: 0,
          tokens: rewardTokens,
          description: `추천 보상 - ${user.referredBy} 첫 결제`,
          status: "COMPLETED",
          metadata: {
            referralCode: user.referredBy,
            refereeId: request.userId,
            rewardType: "FIRST_PAYMENT"
          }
        }
      })

      return {
        success: true,
        data: {
          rewardProcessed: true,
          tokensAwarded: rewardTokens,
          referrerId: referral.userId
        }
      }
    } catch (error) {
      console.error("Process referral reward error:", error)
      return {
        success: false,
        error: "Failed to process referral reward"
      }
    }
  }
}