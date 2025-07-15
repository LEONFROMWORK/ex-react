import { z } from "zod";
import { Result } from "@/Common/Result";
import { AdminErrors } from "@/Common/Errors";
import { prisma } from "@/lib/prisma";

// Request Schema
export const GetPendingReviewsRequestSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(50).default(10),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).default("PENDING"),
});

export type GetPendingReviewsRequest = z.infer<typeof GetPendingReviewsRequestSchema>;

// Response Type
export interface GetPendingReviewsResponse {
  reviews: ReviewItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ReviewItem {
  id: string;
  userId: string;
  user: {
    name: string;
    email: string;
  };
  rating: number;
  title: string;
  content: string;
  usageContext: string;
  timeSaved: number | null;
  errorsFixed: number | null;
  status: string;
  createdAt: Date;
}

// Handler
export class GetPendingReviewsHandler {
  async handle(
    request: GetPendingReviewsRequest
  ): Promise<Result<GetPendingReviewsResponse>> {
    try {
      // Get total count
      const total = await prisma.review.count({
        where: {
          status: request.status,
        },
      });

      // Calculate pagination
      const skip = (request.page - 1) * request.limit;
      const totalPages = Math.ceil(total / request.limit);

      // Get reviews with user info
      const reviews = await prisma.review.findMany({
        where: {
          status: request.status,
        },
        skip,
        take: request.limit,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      return Result.success({
        reviews: reviews.map(review => ({
          id: review.id,
          userId: review.userId,
          user: {
            name: review.user.name,
            email: review.user.email,
          },
          rating: review.rating,
          title: review.title,
          content: review.content,
          usageContext: review.usageContext,
          timeSaved: review.timeSaved,
          errorsFixed: review.errorsFixed,
          status: review.status,
          createdAt: review.createdAt,
        })),
        pagination: {
          page: request.page,
          limit: request.limit,
          total,
          totalPages,
        },
      });
    } catch (error) {
      console.error("Get pending reviews error:", error);
      return Result.failure(AdminErrors.QueryFailed);
    }
  }
}