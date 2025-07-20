import { z } from "zod";
import { Result } from "@/Common/Result";
import { AdminErrors } from "@/Common/Errors";
import { prisma } from "@/lib/prisma";

// Request Schema
export const RejectReviewRequestSchema = z.object({
  reviewId: z.string().min(1, "리뷰 ID가 필요합니다."),
  adminId: z.string().min(1, "관리자 ID가 필요합니다."),
  reason: z.string().min(1, "거절 사유가 필요합니다."),
});

export type RejectReviewRequest = z.infer<typeof RejectReviewRequestSchema>;

// Response Type
export interface RejectReviewResponse {
  reviewId: string;
  status: string;
  rejectedAt: Date;
}

// Handler
export class RejectReviewHandler {
  async handle(
    request: RejectReviewRequest
  ): Promise<Result<RejectReviewResponse>> {
    try {
      // Get review
      const review = await prisma.review.findUnique({
        where: { id: request.reviewId },
      });

      if (!review) {
        return Result.failure({
          code: "Admin.ReviewNotFound",
          message: "리뷰를 찾을 수 없습니다",
        });
      }

      if (review.status !== "PENDING") {
        return Result.failure({
          code: "Admin.ReviewAlreadyProcessed",
          message: "이미 처리된 리뷰입니다",
        });
      }

      // Update review status
      const updatedReview = await prisma.review.update({
        where: { id: request.reviewId },
        data: {
          status: "REJECTED",
        },
      });

      // Log admin action
      await prisma.adminLog.create({
        data: {
          adminId: request.adminId,
          action: "REVIEW_REJECTED",
          targetType: "review",
          targetId: request.reviewId,
          metadata: JSON.stringify({
            reason: request.reason,
          }),
        },
      });

      // Optionally notify the user about the rejection
      // This could be done through an email or in-app notification

      return Result.success({
        reviewId: updatedReview.id,
        status: updatedReview.status,
        rejectedAt: new Date(),
      });
    } catch (error) {
      console.error("Reject review error:", error);
      return Result.failure(AdminErrors.UpdateFailed);
    }
  }
}