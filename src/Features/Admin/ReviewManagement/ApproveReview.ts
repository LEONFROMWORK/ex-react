import { z } from "zod";
import { Result } from "@/Common/Result";
import { AdminErrors } from "@/Common/Errors";
import { prisma } from "@/lib/prisma";

// Request Schema
export const ApproveReviewRequestSchema = z.object({
  reviewId: z.string().min(1, "리뷰 ID가 필요합니다."),
  adminId: z.string().min(1, "관리자 ID가 필요합니다."),
  comment: z.string().optional(),
  grantBonus: z.boolean().default(true),
  bonusTokens: z.number().min(0).default(50),
});

export type ApproveReviewRequest = z.infer<typeof ApproveReviewRequestSchema>;

// Response Type
export interface ApproveReviewResponse {
  reviewId: string;
  status: string;
  bonusGranted: boolean;
  tokensAwarded: number;
  updatedAt: Date;
}

// Handler
export class ApproveReviewHandler {
  async handle(
    request: ApproveReviewRequest
  ): Promise<Result<ApproveReviewResponse>> {
    try {
      // Start transaction
      const result = await prisma.$transaction(async (tx) => {
        // Get review
        const review = await tx.review.findUnique({
          where: { id: request.reviewId },
          include: {
            user: true,
          },
        });

        if (!review) {
          throw new Error("Review not found");
        }

        if (review.status !== "PENDING") {
          throw new Error("Review already processed");
        }

        // Update review status
        const updatedReview = await tx.review.update({
          where: { id: request.reviewId },
          data: {
            status: "APPROVED",
          },
        });

        // Grant bonus tokens if enabled
        let tokensAwarded = 0;
        if (request.grantBonus) {
          await tx.user.update({
            where: { id: review.userId },
            data: {
              credits: {
                increment: request.bonusTokens,
              },
            },
          });

          // Create transaction record
          await tx.transaction.create({
            data: {
              userId: review.userId,
              type: "BONUS",
              amount: 0,
              credits: request.bonusTokens,
              description: "리뷰 작성 보너스",
              status: "COMPLETED",
              metadata: JSON.stringify({
                reviewId: review.id,
                adminId: request.adminId,
              }),
            },
          });

          tokensAwarded = request.bonusTokens;
        }

        // Log admin action
        await tx.adminLog.create({
          data: {
            adminId: request.adminId,
            action: "REVIEW_APPROVED",
            targetType: "review",
            targetId: request.reviewId,
            metadata: JSON.stringify({
              comment: request.comment,
              bonusGranted: request.grantBonus,
              tokensAwarded,
            }),
          },
        });

        return {
          review: updatedReview,
          tokensAwarded,
        };
      });

      return Result.success({
        reviewId: result.review.id,
        status: result.review.status,
        bonusGranted: request.grantBonus,
        tokensAwarded: result.tokensAwarded,
        updatedAt: result.review.createdAt,
      });
    } catch (error: any) {
      console.error("Approve review error:", error);
      if (error.message === "Review not found") {
        return Result.failure({
          code: "Admin.ReviewNotFound",
          message: "리뷰를 찾을 수 없습니다",
        });
      }
      if (error.message === "Review already processed") {
        return Result.failure({
          code: "Admin.ReviewAlreadyProcessed",
          message: "이미 처리된 리뷰입니다",
        });
      }
      return Result.failure(AdminErrors.UpdateFailed);
    }
  }
}