import { z } from "zod"
import { Result } from "@/Common/Result"
import { container } from "@/Infrastructure/DependencyInjection/Container"
import { prisma } from "@/lib/prisma"
import { nanoid } from "nanoid"

// Request/Response types
export class CreatePaymentIntent {
  static readonly Request = z.object({
    userId: z.string(),
    subscriptionPlan: z.enum(["BASIC", "PREMIUM", "ENTERPRISE"]),
    billingPeriod: z.enum(["MONTHLY", "YEARLY"]),
    discountCode: z.string().optional(),
  })

  static readonly Response = z.object({
    paymentIntentId: z.string(),
    amount: z.number(),
    currency: z.literal("KRW"),
    customerKey: z.string(),
    orderId: z.string(),
    orderName: z.string(),
    successUrl: z.string(),
    failUrl: z.string(),
  })
}

export type CreatePaymentIntentRequest = z.infer<typeof CreatePaymentIntent.Request>
export type CreatePaymentIntentResponse = z.infer<typeof CreatePaymentIntent.Response>

// Validator
export class CreatePaymentIntentValidator {
  static validate(request: unknown): Result<CreatePaymentIntentRequest> {
    try {
      const validated = CreatePaymentIntent.Request.parse(request)
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

// Pricing configuration
const PRICING = {
  BASIC: {
    MONTHLY: 29900,
    YEARLY: 299000,
  },
  PREMIUM: {
    MONTHLY: 59900,
    YEARLY: 599000,
  },
  ENTERPRISE: {
    MONTHLY: 99900,
    YEARLY: 999000,
  },
}

// Handler
export class CreatePaymentIntentHandler {
  async handle(request: CreatePaymentIntentRequest): Promise<Result<CreatePaymentIntentResponse>> {
    try {
      // Get user
      const user = await prisma.user.findUnique({
        where: { id: request.userId },
      })

      if (!user) {
        return Result.failure({
          code: "USER_NOT_FOUND",
          message: "사용자를 찾을 수 없습니다.",
        })
      }

      // Calculate amount
      let amount = PRICING[request.subscriptionPlan][request.billingPeriod]

      // Apply discount if provided
      if (request.discountCode) {
        const discount = await this.validateDiscountCode(request.discountCode)
        if (discount) {
          amount = Math.floor(amount * (1 - discount.percentage / 100))
        }
      }

      // Create order
      const orderId = `ORDER_${nanoid()}`
      const orderName = `${request.subscriptionPlan} ${request.billingPeriod === "MONTHLY" ? "월간" : "연간"} 구독`

      // Create payment intent in database
      const paymentIntent = await prisma.paymentIntent.create({
        data: {
          orderId,
          userId: request.userId,
          amount,
          currency: "KRW",
          status: "PENDING",
          subscriptionPlan: request.subscriptionPlan,
          billingPeriod: request.billingPeriod,
          metadata: JSON.stringify({
            discountCode: request.discountCode,
          }),
        },
      })

      // Generate customerKey if not exists
      let customerKey = user.customerKey
      if (!customerKey) {
        customerKey = `CUST_${nanoid()}`
        await prisma.user.update({
          where: { id: request.userId },
          data: { customerKey },
        })
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

      return Result.success({
        paymentIntentId: paymentIntent.id,
        amount,
        currency: "KRW",
        customerKey,
        orderId,
        orderName,
        successUrl: `${baseUrl}/api/payments/success`,
        failUrl: `${baseUrl}/api/payments/fail`,
      })
    } catch (error) {
      console.error("Payment intent creation error:", error)
      return Result.failure({
        code: "PAYMENT_INTENT_FAILED",
        message: "결제 요청 생성 중 오류가 발생했습니다.",
      })
    }
  }

  private async validateDiscountCode(code: string): Promise<{ percentage: number } | null> {
    // TODO: Implement actual discount code validation
    // For now, return a fixed 10% discount for any code
    if (code === "LAUNCH10") {
      return { percentage: 10 }
    }
    return null
  }
}