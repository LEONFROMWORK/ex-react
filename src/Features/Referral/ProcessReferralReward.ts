import { prisma } from "@/lib/prisma"
import { Result } from "@/Common/Result"

interface ProcessReferralRewardRequest {
  userId: string
  paymentAmount: number
  paymentId: string
}

interface ProcessReferralRewardResponse {
  rewardProcessed: boolean
  creditsAwarded?: number
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
        return Result.success({ rewardProcessed: false })
      }

      // Find the referrer's referral record
      const referral = await prisma.referral.findUnique({
        where: { referralCode: user.referredBy },
        include: { user: true }
      })

      if (!referral) {
        return Result.success({ rewardProcessed: false })
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
        return Result.success({ rewardProcessed: false })
      }

      // Check if reward already processed for this payment
      const existingReward = await prisma.referralReward.findFirst({
        where: {
          refereeId: request.userId,
          rewardType: "FIRST_PAYMENT",
          triggerDetails: JSON.stringify({
            paymentId: request.paymentId
          })
        }
      })

      if (existingReward) {
        return Result.success({ rewardProcessed: false })
      }

      // Process the reward
      const rewardCredits = referral.creditRewardAmount || 500 // 기본 크레딧 보상
      const cashReward = request.paymentAmount * 0.1 // 10% of payment as cash reward

      // Create reward record
      await prisma.referralReward.create({
        data: {
          referralId: referral.id,
          referrerId: referral.userId,
          refereeId: request.userId,
          rewardType: "FIRST_PAYMENT",
          creditsAwarded: rewardCredits,
          cashAwarded: cashReward,
          triggerEvent: "first_payment_completed",
          triggerDetails: JSON.stringify({
            paymentId: request.paymentId,
            paymentAmount: request.paymentAmount,
            paymentDate: new Date()
          }),
          status: "PENDING"
        }
      })

      // Update referrer's tokens and earnings
      await prisma.$transaction([
        prisma.user.update({
          where: { id: referral.userId },
          data: {
            credits: { increment: rewardCredits }
          }
        }),
        prisma.referral.update({
          where: { id: referral.id },
          data: {
            referralCount: { increment: 1 },
            totalCreditsEarned: { increment: rewardCredits },
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
          credits: rewardCredits,
          description: `추천 보상 - ${user.referredBy} 첫 결제`,
          status: "COMPLETED",
          metadata: JSON.stringify({
            referralCode: user.referredBy,
            refereeId: request.userId,
            rewardType: "FIRST_PAYMENT"
          })
        }
      })

      return Result.success({
        rewardProcessed: true,
        creditsAwarded: rewardCredits,
        referrerId: referral.userId
      })
    } catch (error) {
      console.error("Process referral reward error:", error)
      return Result.failure({
        code: "REFERRAL_REWARD_FAILED",
        message: "Failed to process referral reward"
      })
    }
  }
}