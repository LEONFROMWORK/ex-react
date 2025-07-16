import { z } from "zod";
import { Result } from "@/Common/Result";
import { AdminErrors } from "@/Common/Errors";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// Request Schema
export const GetUsersRequestSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  search: z.string().optional(),
  role: z.enum(["USER", "SUPPORT", "ADMIN", "SUPER_ADMIN"]).optional(),
  tier: z.enum(["FREE", "BASIC", "PRO", "ENTERPRISE"]).optional(),
  status: z.enum(["active", "inactive", "suspended"]).optional(),
  sortBy: z.enum(["createdAt", "email", "name", "tokens"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type GetUsersRequest = z.infer<typeof GetUsersRequestSchema>;

// Response Type
export interface GetUsersResponse {
  users: UserListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UserListItem {
  id: string;
  email: string;
  name: string;
  role: string;
  tier?: string;
  emailVerified: Date | null;
  tokens: number;
  aiPreference: string;
  createdAt: Date;
  subscription?: {
    plan: string;
    status: string;
    tokensRemaining: number;
  };
  _count: {
    files: number;
    analyses: number;
    reviews: number;
  };
}

// Handler
export class GetUsersHandler {
  async handle(request: GetUsersRequest): Promise<Result<GetUsersResponse>> {
    try {
      // Build where clause
      const where: Prisma.UserWhereInput = {};
      
      if (request.search) {
        where.OR = [
          { email: { contains: request.search, mode: "insensitive" } },
          { name: { contains: request.search, mode: "insensitive" } },
        ];
      }
      
      if (request.role) {
        where.role = request.role;
      }
      
      if (request.tier) {
        where.tier = request.tier;
      }
      
      if (request.status) {
        switch (request.status) {
          case "active":
            where.emailVerified = { not: null };
            break;
          case "inactive":
            where.emailVerified = null;
            break;
          // Add more status conditions as needed
        }
      }

      // Get total count
      const total = await prisma.user.count({ where });
      
      // Calculate pagination
      const skip = (request.page - 1) * request.limit;
      const totalPages = Math.ceil(total / request.limit);
      
      // Get users with related data
      const users = await prisma.user.findMany({
        where,
        skip,
        take: request.limit,
        orderBy: {
          [request.sortBy]: request.sortOrder,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          tier: true,
          emailVerified: true,
          tokens: true,
          aiPreference: true,
          createdAt: true,
          subscription: {
            select: {
              plan: true,
              status: true,
              tokensRemaining: true,
            },
          },
          _count: {
            select: {
              files: true,
              analyses: true,
              reviews: true,
            },
          },
        },
      });

      return Result.success({
        users,
        pagination: {
          page: request.page,
          limit: request.limit,
          total,
          totalPages,
        },
      });
    } catch (error) {
      console.error("Get users error:", error);
      return Result.failure(AdminErrors.QueryFailed);
    }
  }
}