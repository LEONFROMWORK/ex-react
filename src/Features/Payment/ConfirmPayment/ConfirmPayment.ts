import { z } from "zod"
import { Result } from "@/Common/Result"
import { prisma } from "@/lib/prisma"
import { ConsumeTokensHandler } from "@/Features/Billing/CreditManagement/ConsumeCredits"
import { ProcessReferralRewardHandler } from "@/Features/Referral/ProcessReferralReward"

// Request/Response types
export class ConfirmPayment {
  static readonly Request = z.object({
    paymentKey: z.string(),
    orderId: z.string(),
    amount: z.number(),
  })

  static readonly Response = z.object({
    success: z.boolean(),
    paymentId: z.string(),
    status: z.enum(["DONE", "CANCELED", "FAILED", "PARTIAL_CANCELED"]),
    approvedAt: z.string(),
    receipt: z.object({
      url: z.string(),
    }).optional(),
  })
}

export type ConfirmPaymentRequest = z.infer<typeof ConfirmPayment.Request>
export type ConfirmPaymentResponse = z.infer<typeof ConfirmPayment.Response>

// Validator
export class ConfirmPaymentValidator {
  static validate(request: unknown): Result<ConfirmPaymentRequest> {
    try {
      const validated = ConfirmPayment.Request.parse(request)
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
export class ConfirmPaymentHandler {
  private readonly TOSS_API_URL = "https://api.tosspayments.com/v1/payments/confirm"
  private readonly secretKey = process.env.TOSS_SECRET_KEY!

  async handle(request: ConfirmPaymentRequest): Promise<Result<ConfirmPaymentResponse>> {
    try {
      // Verify payment intent exists
      const paymentIntent = await prisma.paymentIntent.findUnique({
        where: { orderId: request.orderId },
        include: { user: true },
      })

      if (!paymentIntent) {
        return Result.failure({
          code: "PAYMENT_INTENT_NOT_FOUND",
          message: "결제 정보를 찾을 수 없습니다.",
        })
      }

      // Verify amount matches
      if (paymentIntent.amount !== request.amount) {
        return Result.failure({
          code: "AMOUNT_MISMATCH",
          message: "결제 금액이 일치하지 않습니다.",
        })
      }

      // Call TossPayments API to confirm payment
      const authHeader = Buffer.from(`${this.secretKey}:`).toString("base64")
      
      const response = await fetch(this.TOSS_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Basic ${authHeader}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentKey: request.paymentKey,
          orderId: request.orderId,
          amount: request.amount,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error("TossPayments API error:", data)
        return Result.failure({
          code: data.code || "PAYMENT_CONFIRM_FAILED",
          message: data.message || "결제 승인에 실패했습니다.",
        })
      }

      // Update payment intent status
      await prisma.paymentIntent.update({
        where: { id: paymentIntent.id },
        data: {
          status: "COMPLETED",
          paymentKey: request.paymentKey,
          completedAt: new Date(),
        },
      })

      // Create subscription if payment is for subscription
      if (paymentIntent.subscriptionPlan) {
        await this.createSubscription(paymentIntent)
      }

      // Allocate tokens based on subscription plan
      await this.allocateTokens(paymentIntent)

      // Create transaction record
      await prisma.transaction.create({
        data: {
          userId: paymentIntent.userId,
          type: "PURCHASE",
          amount: paymentIntent.amount,
          credits: this.getCreditsForPlan(paymentIntent.subscriptionPlan),
          description: `${paymentIntent.subscriptionPlan} ${paymentIntent.billingPeriod} 구독`,
          status: "COMPLETED",
          paymentKey: request.paymentKey,
        },
      })

      // Process referral reward if this is the user's first payment
      const referralHandler = new ProcessReferralRewardHandler()
      await referralHandler.handle({
        userId: paymentIntent.userId,
        paymentAmount: paymentIntent.amount,
        paymentId: paymentIntent.id
      })

      return Result.success({
        success: true,
        paymentId: paymentIntent.id,
        status: "DONE",
        approvedAt: data.approvedAt,
        receipt: data.receipt,
      })
    } catch (error) {
      console.error("Payment confirmation error:", error)
      return Result.failure({
        code: "PAYMENT_CONFIRM_FAILED",
        message: "결제 승인 중 오류가 발생했습니다.",
      })
    }
  }

  private async createSubscription(paymentIntent: any): Promise<void> {
    const validUntil = new Date()
    if (paymentIntent.billingPeriod === "MONTHLY") {
      validUntil.setMonth(validUntil.getMonth() + 1)
    } else {
      validUntil.setFullYear(validUntil.getFullYear() + 1)
    }

    const monthlyCredits = this.getCreditsForPlan(paymentIntent.subscriptionPlan)

    await prisma.subscription.upsert({
      where: { userId: paymentIntent.userId },
      create: {
        userId: paymentIntent.userId,
        plan: paymentIntent.subscriptionPlan,
        status: "ACTIVE",
        currentPeriodStart: new Date(),
        currentPeriodEnd: validUntil,
        validUntil,
        monthlyCredits,
        creditsRemaining: monthlyCredits,
      },
      update: {
        plan: paymentIntent.subscriptionPlan,
        status: "ACTIVE",
        currentPeriodStart: new Date(),
        currentPeriodEnd: validUntil,
        validUntil,
        monthlyCredits,
        creditsRemaining: monthlyCredits,
      },
    })
  }

  private async allocateTokens(paymentIntent: any): Promise<void> {
    const tokens = this.getCreditsForPlan(paymentIntent.subscriptionPlan)
    
    await prisma.subscription.update({
      where: { userId: paymentIntent.userId },
      data: {
        creditsRemaining: {
          increment: tokens,
        },
      },
    })
  }

  private getCreditsForPlan(plan: string): number {
    const tokenMap = {
      BASIC: 1000,
      PREMIUM: 3000,
      ENTERPRISE: 10000,
    }
    return tokenMap[plan as keyof typeof tokenMap] || 1000
  }
}