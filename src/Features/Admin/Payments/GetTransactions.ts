import { z } from "zod";
import { Result } from "@/Common/Result";
import { AdminErrors } from "@/Common/Errors";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// Request Schema
export const GetTransactionsRequestSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(["PENDING", "COMPLETED", "FAILED", "REFUNDED", ""]).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  sortBy: z.enum(["createdAt", "amount", "status"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type GetTransactionsRequest = z.infer<typeof GetTransactionsRequestSchema>;

// Response Type
export interface GetTransactionsResponse {
  payments: PaymentItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaymentItem {
  id: string;
  orderId: string;
  userId: string;
  user: {
    name: string;
    email: string;
  };
  amount: number;
  currency: string;
  status: string;
  paymentKey: string | null;
  metadata: any;
  createdAt: Date;
  completedAt: Date | null;
}

// Handler
export class GetTransactionsHandler {
  async handle(
    request: GetTransactionsRequest
  ): Promise<Result<GetTransactionsResponse>> {
    try {
      // Build where clause
      const where: Prisma.PaymentIntentWhereInput = {};
      
      if (request.search) {
        where.OR = [
          { orderId: { contains: request.search, mode: "insensitive" } },
          { user: { email: { contains: request.search, mode: "insensitive" } } },
          { paymentKey: { contains: request.search, mode: "insensitive" } },
        ];
      }
      
      if (request.status && request.status !== "") {
        where.status = request.status;
      }
      
      if (request.startDate || request.endDate) {
        where.createdAt = {};
        if (request.startDate) {
          where.createdAt.gte = request.startDate;
        }
        if (request.endDate) {
          where.createdAt.lte = request.endDate;
        }
      }

      // Get total count
      const total = await prisma.paymentIntent.count({ where });
      
      // Calculate pagination
      const skip = (request.page - 1) * request.limit;
      const totalPages = Math.ceil(total / request.limit);
      
      // Get payments with user data
      const payments = await prisma.paymentIntent.findMany({
        where,
        skip,
        take: request.limit,
        orderBy: {
          [request.sortBy]: request.sortOrder,
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
        payments: payments.map(payment => ({
          id: payment.id,
          orderId: payment.orderId,
          userId: payment.userId,
          user: {
            name: payment.user.name,
            email: payment.user.email,
          },
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          paymentKey: payment.paymentKey,
          metadata: payment.metadata,
          createdAt: payment.createdAt,
          completedAt: payment.completedAt,
        })),
        pagination: {
          page: request.page,
          limit: request.limit,
          total,
          totalPages,
        },
      });
    } catch (error) {
      console.error("Get transactions error:", error);
      return Result.failure(AdminErrors.QueryFailed);
    }
  }
}