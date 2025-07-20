import { z } from "zod";
import { Result } from "@/Common/Result";
import { AdminErrors } from "@/Common/Errors";
import { prisma } from "@/lib/prisma";

// Request Schema
export const ProcessRefundRequestSchema = z.object({
  paymentId: z.string().min(1, "결제 ID가 필요합니다."),
  adminId: z.string().min(1, "관리자 ID가 필요합니다."),
  amount: z.number().min(0, "환불 금액은 0 이상이어야 합니다."),
  reason: z.string().min(1, "환불 사유가 필요합니다."),
});

export type ProcessRefundRequest = z.infer<typeof ProcessRefundRequestSchema>;

// Response Type
export interface ProcessRefundResponse {
  refundId: string;
  paymentId: string;
  amount: number;
  status: string;
  processedAt: Date;
}

// Handler
export class ProcessRefundHandler {
  async handle(
    request: ProcessRefundRequest
  ): Promise<Result<ProcessRefundResponse>> {
    try {
      // Start transaction
      const result = await prisma.$transaction(async (tx) => {
        // Get payment
        const payment = await tx.paymentIntent.findUnique({
          where: { id: request.paymentId },
          include: {
            user: true,
          },
        });

        if (!payment) {
          throw new Error("Payment not found");
        }

        if (payment.status !== "COMPLETED") {
          throw new Error("Only completed payments can be refunded");
        }

        if (request.amount > payment.amount) {
          throw new Error("Refund amount exceeds payment amount");
        }

        // Create refund transaction
        const refundTransaction = await tx.transaction.create({
          data: {
            userId: payment.userId,
            type: "REFUND",
            amount: -request.amount, // Negative amount for refund
            description: `환불: ${request.reason}`,
            status: "COMPLETED",
            metadata: JSON.stringify({
              originalPaymentId: payment.id,
              orderId: payment.orderId,
              reason: request.reason,
              adminId: request.adminId,
            }),
          },
        });

        // Update payment status
        const isPartialRefund = request.amount < payment.amount;
        await tx.paymentIntent.update({
          where: { id: payment.id },
          data: {
            status: isPartialRefund ? "PARTIALLY_REFUNDED" : "CANCELED",
            metadata: JSON.stringify({
              ...(typeof payment.metadata === 'string' ? JSON.parse(payment.metadata) : payment.metadata),
              refundAmount: request.amount,
              refundReason: request.reason,
              refundedAt: new Date(),
              refundedBy: request.adminId,
            }),
          },
        });

        // Return credits to user if applicable
        const metadata = typeof payment.metadata === 'string' ? JSON.parse(payment.metadata) : payment.metadata;
        if (metadata?.creditsGranted) {
          const creditsToReturn = Math.floor(
            (request.amount / payment.amount) * metadata.creditsGranted
          );
          
          await tx.user.update({
            where: { id: payment.userId },
            data: {
              credits: {
                increment: creditsToReturn,
              },
            },
          });
        }

        // Log admin action
        await tx.adminLog.create({
          data: {
            adminId: request.adminId,
            action: "PAYMENT_REFUND",
            targetType: "payment",
            targetId: payment.id,
            metadata: JSON.stringify({
              amount: request.amount,
              reason: request.reason,
              isPartialRefund,
            }),
          },
        });

        return {
          refundTransaction,
          payment,
        };
      });

      // In a real implementation, you would call the payment provider's refund API here
      // For TossPayments: await tossPayments.cancelPayment(payment.paymentKey, { cancelReason: request.reason })

      return Result.success({
        refundId: result.refundTransaction.id,
        paymentId: request.paymentId,
        amount: request.amount,
        status: "COMPLETED",
        processedAt: result.refundTransaction.createdAt,
      });
    } catch (error: any) {
      console.error("Process refund error:", error);
      
      if (error.message === "Payment not found") {
        return Result.failure({
          code: "Admin.PaymentNotFound",
          message: "결제 정보를 찾을 수 없습니다",
        });
      }
      
      if (error.message === "Only completed payments can be refunded") {
        return Result.failure({
          code: "Admin.InvalidPaymentStatus",
          message: "완료된 결제만 환불할 수 있습니다",
        });
      }
      
      if (error.message === "Refund amount exceeds payment amount") {
        return Result.failure({
          code: "Admin.InvalidRefundAmount",
          message: "환불 금액이 결제 금액을 초과합니다",
        });
      }
      
      return Result.failure(AdminErrors.UpdateFailed);
    }
  }
}