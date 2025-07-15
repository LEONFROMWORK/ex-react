import { z } from "zod"
import { Result } from "@/Common/Result"
import { prisma } from "@/lib/prisma"

// Request/Response types
export class GetMyReview {
  static readonly Request = z.object({
    userId: z.string(),
  })

  static readonly Response = z.object({
    hasReview: z.boolean(),
    canWriteReview: z.boolean(),
    minimumUsageRequired: z.number(),
    currentUsageCount: z.number(),
    review: z.object({
      id: z.string(),
      rating: z.number(),
      title: z.string(),
      content: z.string(),
      usageContext: z.string(),
      timeSaved: z.number().nullable(),
      errorsFixed: z.number().nullable(),
      status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
      createdAt: z.date(),
      rejectionReason: z.string().optional(),
    }).nullable(),
  })
}

export type GetMyReviewRequest = z.infer<typeof GetMyReview.Request>
export type GetMyReviewResponse = z.infer<typeof GetMyReview.Response>

// Validator
export class GetMyReviewValidator {
  static validate(request: unknown): Result<GetMyReviewRequest> {
    try {
      const validated = GetMyReview.Request.parse(request)
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
export class GetMyReviewHandler {
  private readonly MINIMUM_USAGE_REQUIRED = 3

  async handle(request: GetMyReviewRequest): Promise<Result<GetMyReviewResponse>> {
    try {
      // Get user's review if exists
      const review = await prisma.review.findFirst({
        where: { userId: request.userId },
        orderBy: { createdAt: "desc" },
      })

      // Get user's usage count
      const usageCount = await prisma.analysis.count({
        where: { userId: request.userId },
      })

      const canWriteReview = !review && usageCount >= this.MINIMUM_USAGE_REQUIRED

      return Result.success({
        hasReview: !!review,
        canWriteReview,
        minimumUsageRequired: this.MINIMUM_USAGE_REQUIRED,
        currentUsageCount: usageCount,
        review: review ? {
          id: review.id,
          rating: review.rating,
          title: review.title,
          content: review.content,
          usageContext: review.usageContext,
          timeSaved: review.timeSaved,
          errorsFixed: review.errorsFixed,
          status: review.status,
          createdAt: review.createdAt,
          rejectionReason: review.status === "REJECTED" 
            ? "리뷰 내용이 서비스 이용 가이드라인에 부합하지 않습니다."
            : undefined,
        } : null,
      })
    } catch (error) {
      console.error("Get my review error:", error)
      return Result.failure({
        code: "GET_MY_REVIEW_FAILED",
        message: "내 리뷰 조회 중 오류가 발생했습니다.",
      })
    }
  }
}