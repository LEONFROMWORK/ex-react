import { z } from "zod"
import { Result } from "@/Common/Result"
import { prisma } from "@/lib/prisma"

// Request/Response types
export class CreateReview {
  static readonly Request = z.object({
    userId: z.string(),
    rating: z.number().min(1).max(5),
    title: z.string().min(5).max(100),
    content: z.string().min(20).max(1000),
    usageContext: z.string().min(10).max(500),
    timeSaved: z.number().min(0).optional(),
    errorsFixed: z.number().min(0).optional(),
  })

  static readonly Response = z.object({
    reviewId: z.string(),
    status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
    message: z.string(),
  })
}

export type CreateReviewRequest = z.infer<typeof CreateReview.Request>
export type CreateReviewResponse = z.infer<typeof CreateReview.Response>

// Validator
export class CreateReviewValidator {
  static validate(request: unknown): Result<CreateReviewRequest> {
    try {
      const validated = CreateReview.Request.parse(request)
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
export class CreateReviewHandler {
  async handle(request: CreateReviewRequest): Promise<Result<CreateReviewResponse>> {
    try {
      // Check if user has already submitted a review
      const existingReview = await prisma.review.findFirst({
        where: {
          userId: request.userId,
          status: { not: "REJECTED" },
        },
      })

      if (existingReview) {
        return Result.failure({
          code: "REVIEW_EXISTS",
          message: "이미 리뷰를 작성하셨습니다.",
        })
      }

      // Check if user has sufficient usage to write a review
      const userAnalyses = await prisma.analysis.count({
        where: { userId: request.userId },
      })

      if (userAnalyses < 3) {
        return Result.failure({
          code: "INSUFFICIENT_USAGE",
          message: "리뷰 작성을 위해서는 최소 3회 이상 서비스를 이용해주세요.",
        })
      }

      // Create review with auto-approval for high-rating reviews
      const autoApprove = request.rating >= 4 && !this.containsSpamKeywords(request.content)
      
      const review = await prisma.review.create({
        data: {
          userId: request.userId,
          rating: request.rating,
          title: request.title,
          content: request.content,
          usageContext: request.usageContext,
          timeSaved: request.timeSaved,
          errorsFixed: request.errorsFixed,
          status: autoApprove ? "APPROVED" : "PENDING",
        },
      })

      // Give bonus tokens for writing a review
      if (autoApprove) {
        await prisma.$transaction([
          prisma.subscription.update({
            where: { userId: request.userId },
            data: {
              tokensRemaining: {
                increment: 50, // Bonus tokens for review
              },
            },
          }),
          prisma.transaction.create({
            data: {
              userId: request.userId,
              type: "BONUS",
              amount: 0,
              tokens: 50,
              description: "이용 후기 작성 보너스",
              status: "COMPLETED",
            },
          }),
        ])
      }

      return Result.success({
        reviewId: review.id,
        status: review.status,
        message: autoApprove 
          ? "리뷰가 성공적으로 등록되었습니다. 보너스 50 토큰이 지급되었습니다!"
          : "리뷰가 접수되었습니다. 검토 후 게시됩니다.",
      })
    } catch (error) {
      console.error("Review creation error:", error)
      return Result.failure({
        code: "REVIEW_CREATION_FAILED",
        message: "리뷰 등록 중 오류가 발생했습니다.",
      })
    }
  }

  private containsSpamKeywords(content: string): boolean {
    const spamKeywords = [
      "광고", "홍보", "링크", "클릭", "바로가기",
      "무료", "이벤트", "할인", "쿠폰", "프로모션",
    ]
    
    const lowercaseContent = content.toLowerCase()
    return spamKeywords.some(keyword => lowercaseContent.includes(keyword))
  }
}