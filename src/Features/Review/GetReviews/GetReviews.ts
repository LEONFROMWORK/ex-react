import { z } from "zod"
import { Result } from "@/Common/Result"
import { prisma } from "@/lib/prisma"

// Request/Response types
export class GetReviews {
  static readonly Request = z.object({
    page: z.number().min(1).default(1),
    limit: z.number().min(1).max(50).default(10),
    sortBy: z.enum(["recent", "rating", "helpful"]).default("recent"),
    filterRating: z.number().min(1).max(5).optional(),
  })

  static readonly Response = z.object({
    reviews: z.array(z.object({
      id: z.string(),
      rating: z.number(),
      title: z.string(),
      content: z.string(),
      usageContext: z.string(),
      timeSaved: z.number().nullable(),
      errorsFixed: z.number().nullable(),
      createdAt: z.date(),
      user: z.object({
        name: z.string(),
        isVerified: z.boolean(),
      }),
      stats: z.object({
        analysisCount: z.number(),
        memberSince: z.date(),
      }),
    })),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
    }),
    summary: z.object({
      averageRating: z.number(),
      totalReviews: z.number(),
      ratingDistribution: z.record(z.number()),
    }),
  })
}

export type GetReviewsRequest = z.infer<typeof GetReviews.Request>
export type GetReviewsResponse = z.infer<typeof GetReviews.Response>

// Validator
export class GetReviewsValidator {
  static validate(request: unknown): Result<GetReviewsRequest> {
    try {
      const validated = GetReviews.Request.parse(request)
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
export class GetReviewsHandler {
  async handle(request: GetReviewsRequest): Promise<Result<GetReviewsResponse>> {
    try {
      const { page, limit, sortBy, filterRating } = request
      const skip = (page - 1) * limit

      // Build where clause
      const where: any = {
        status: "APPROVED",
      }
      if (filterRating) {
        where.rating = filterRating
      }

      // Build order by clause
      const orderBy: any = {}
      switch (sortBy) {
        case "recent":
          orderBy.createdAt = "desc"
          break
        case "rating":
          orderBy.rating = "desc"
          break
        case "helpful":
          // This would require a helpfulness score field
          orderBy.createdAt = "desc"
          break
      }

      // Get reviews with user info
      const [reviews, total] = await Promise.all([
        prisma.review.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                emailVerified: true,
                createdAt: true,
                _count: {
                  select: {
                    analyses: true,
                  },
                },
              },
            },
          },
        }),
        prisma.review.count({ where }),
      ])

      // Get rating distribution
      const ratingDistribution = await prisma.review.groupBy({
        by: ["rating"],
        where: { status: "APPROVED" },
        _count: true,
      })

      const distribution: Record<string, number> = {}
      for (let i = 1; i <= 5; i++) {
        distribution[i] = 0
      }
      ratingDistribution.forEach(item => {
        distribution[item.rating] = item._count
      })

      // Calculate average rating
      const avgResult = await prisma.review.aggregate({
        where: { status: "APPROVED" },
        _avg: { rating: true },
      })

      const formattedReviews = reviews.map(review => ({
        id: review.id,
        rating: review.rating,
        title: review.title,
        content: review.content,
        usageContext: review.usageContext,
        timeSaved: review.timeSaved,
        errorsFixed: review.errorsFixed,
        createdAt: review.createdAt,
        user: {
          name: review.user.name,
          isVerified: !!review.user.emailVerified,
        },
        stats: {
          analysisCount: review.user._count.analyses,
          memberSince: review.user.createdAt,
        },
      }))

      return Result.success({
        reviews: formattedReviews,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        summary: {
          averageRating: avgResult._avg.rating || 0,
          totalReviews: total,
          ratingDistribution: distribution,
        },
      })
    } catch (error) {
      console.error("Get reviews error:", error)
      return Result.failure({
        code: "GET_REVIEWS_FAILED",
        message: "리뷰 조회 중 오류가 발생했습니다.",
      })
    }
  }
}