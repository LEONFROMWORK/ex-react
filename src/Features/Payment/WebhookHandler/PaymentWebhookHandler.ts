import { z } from "zod"
import { Result } from "@/Common/Result"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"
import { ProcessReferralRewardHandler } from "@/Features/Referral/ProcessReferralReward"

// Webhook event types
export class PaymentWebhook {
  static readonly Event = z.object({
    eventType: z.enum([
      "PAYMENT_STATUS_CHANGED",
      "VIRTUAL_ACCOUNT_DEPOSIT_CONFIRMED",
      "PAYMENT_FAILED",
    ]),
    timestamp: z.string(),
    data: z.object({
      paymentKey: z.string(),
      orderId: z.string(),
      status: z.string(),
      amount: z.number().optional(),
    }),
  })
}

export type PaymentWebhookEvent = z.infer<typeof PaymentWebhook.Event>

// Webhook handler
export class PaymentWebhookHandler {
  private readonly webhookSecret = process.env.TOSS_WEBHOOK_SECRET!

  async handle(
    request: unknown,
    signature: string | null
  ): Promise<Result<{ processed: boolean }>> {
    try {
      // Verify webhook signature
      if (!this.verifySignature(JSON.stringify(request), signature)) {
        return Result.failure({
          code: "INVALID_SIGNATURE",
          message: "Invalid webhook signature",
        })
      }

      // Parse webhook event
      const parseResult = PaymentWebhook.Event.safeParse(request)
      if (!parseResult.success) {
        return Result.failure({
          code: "INVALID_WEBHOOK_DATA",
          message: "Invalid webhook data format",
        })
      }

      const event = parseResult.data

      // Process based on event type
      switch (event.eventType) {
        case "PAYMENT_STATUS_CHANGED":
          await this.handlePaymentStatusChanged(event)
          break

        case "VIRTUAL_ACCOUNT_DEPOSIT_CONFIRMED":
          await this.handleVirtualAccountDeposit(event)
          break

        case "PAYMENT_FAILED":
          await this.handlePaymentFailed(event)
          break

        default:
          console.log("Unhandled webhook event type:", event.eventType)
      }

      return Result.success({ processed: true })
    } catch (error) {
      console.error("Webhook processing error:", error)
      return Result.failure({
        code: "WEBHOOK_PROCESSING_FAILED",
        message: "Failed to process webhook",
      })
    }
  }

  private verifySignature(payload: string, signature: string | null): boolean {
    if (!signature || !this.webhookSecret) {
      return false
    }

    const expectedSignature = crypto
      .createHmac("sha256", this.webhookSecret)
      .update(payload)
      .digest("base64")

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  }

  private async handlePaymentStatusChanged(event: PaymentWebhookEvent): Promise<void> {
    const { orderId, status } = event.data

    // Update payment intent status
    await prisma.paymentIntent.update({
      where: { orderId },
      data: {
        status: this.mapTossStatusToInternal(status),
        updatedAt: new Date(event.timestamp),
      },
    })

    // If payment was canceled, handle subscription cancellation
    if (status === "CANCELED") {
      const paymentIntent = await prisma.paymentIntent.findUnique({
        where: { orderId },
      })

      if (paymentIntent) {
        await prisma.subscription.update({
          where: { userId: paymentIntent.userId },
          data: { status: "CANCELED" },
        })
      }
    }
  }

  private async handleVirtualAccountDeposit(event: PaymentWebhookEvent): Promise<void> {
    const { orderId } = event.data

    const paymentIntent = await prisma.paymentIntent.findUnique({
      where: { orderId },
    })

    if (!paymentIntent) {
      console.error("Payment intent not found for virtual account deposit:", orderId)
      return
    }

    // Update payment status
    await prisma.paymentIntent.update({
      where: { id: paymentIntent.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    })

    // Create subscription and allocate tokens
    if (paymentIntent.subscriptionPlan) {
      // Similar logic as in ConfirmPaymentHandler
      await this.createSubscriptionFromPayment(paymentIntent)
    }

    // Process referral reward if applicable
    const referralHandler = new ProcessReferralRewardHandler()
    await referralHandler.handle({
      userId: paymentIntent.userId,
      paymentAmount: paymentIntent.amount,
      paymentId: paymentIntent.id
    })
  }

  private async handlePaymentFailed(event: PaymentWebhookEvent): Promise<void> {
    const { orderId } = event.data

    await prisma.paymentIntent.update({
      where: { orderId },
      data: {
        status: "FAILED",
        failedAt: new Date(),
      },
    })

    // TODO: Send notification to user about failed payment
  }

  private mapTossStatusToInternal(status: string): 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELED' | 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'EXPIRED' {
    const statusMap: Record<string, 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELED' | 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'EXPIRED'> = {
      DONE: "COMPLETED",
      CANCELED: "CANCELED",
      PARTIAL_CANCELED: "PARTIALLY_REFUNDED",
      ABORTED: "FAILED",
      EXPIRED: "EXPIRED",
    }
    return statusMap[status] || "PENDING"
  }

  private async createSubscriptionFromPayment(paymentIntent: any): Promise<void> {
    // Implementation similar to ConfirmPaymentHandler
    const validUntil = new Date()
    if (paymentIntent.billingPeriod === "MONTHLY") {
      validUntil.setMonth(validUntil.getMonth() + 1)
    } else {
      validUntil.setFullYear(validUntil.getFullYear() + 1)
    }

    const monthlyCredits = this.getTokensForPlan(paymentIntent.subscriptionPlan)

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

  private getTokensForPlan(plan: string): number {
    const tokenMap = {
      BASIC: 1000,
      PREMIUM: 3000,
      ENTERPRISE: 10000,
    }
    return tokenMap[plan as keyof typeof tokenMap] || 1000
  }
}