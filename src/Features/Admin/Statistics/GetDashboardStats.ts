import { z } from "zod";
import { Result } from "@/Common/Result";
import { AdminErrors } from "@/Common/Errors";
import { prisma } from "@/lib/prisma";
import { startOfDay, subDays } from "date-fns";

// Request Schema
export const GetDashboardStatsRequestSchema = z.object({
  period: z.enum(["today", "week", "month"]).default("today"),
});

export type GetDashboardStatsRequest = z.infer<typeof GetDashboardStatsRequestSchema>;

// Response Type
export interface GetDashboardStatsResponse {
  realtime: {
    activeUsers: number;
    processingFiles: number;
    apiCalls: number;
    aiTier1Calls: number;
    aiTier2Calls: number;
  };
  daily: {
    newUsers: number;
    revenue: number;
    filesProcessed: number;
    errors: number;
    tokensSaved: number;
    aiCostOptimization: number;
  };
  summary: {
    totalUsers: number;
    totalFiles: number;
    totalRevenue: number;
    avgProcessingTime: number;
  };
}

// Handler
export class GetDashboardStatsHandler {
  async handle(
    request: GetDashboardStatsRequest
  ): Promise<Result<GetDashboardStatsResponse>> {
    try {
      const now = new Date();
      const startDate = this.getStartDate(request.period);

      // Get active users (users who made requests in last hour)
      const activeUsers = await prisma.usageLog.groupBy({
        by: ["userId"],
        where: {
          createdAt: {
            gte: new Date(now.getTime() - 60 * 60 * 1000), // Last hour
          },
        },
        _count: true,
      });

      // Get processing files
      const processingFiles = await prisma.file.count({
        where: {
          status: "PROCESSING",
        },
      });

      // Get AI usage stats for today
      const aiUsageToday = await prisma.analysis.groupBy({
        by: ["aiTier"],
        where: {
          createdAt: {
            gte: startOfDay(now),
          },
        },
        _count: true,
      });

      const tier1Calls = aiUsageToday.find(a => a.aiTier === "TIER1")?._count || 0;
      const tier2Calls = aiUsageToday.find(a => a.aiTier === "TIER2")?._count || 0;

      // Get daily stats
      const newUsers = await prisma.user.count({
        where: {
          createdAt: {
            gte: startDate,
          },
        },
      });

      const transactions = await prisma.transaction.aggregate({
        where: {
          status: "COMPLETED",
          createdAt: {
            gte: startDate,
          },
        },
        _sum: {
          amount: true,
        },
      });

      const filesProcessed = await prisma.file.count({
        where: {
          status: "COMPLETED",
          createdAt: {
            gte: startDate,
          },
        },
      });

      const fileErrors = await prisma.file.count({
        where: {
          status: "FAILED",
          createdAt: {
            gte: startDate,
          },
        },
      });

      // Calculate tokens saved through caching
      const cachedAnalyses = await prisma.aIPromptCache.aggregate({
        where: {
          createdAt: {
            gte: startDate,
          },
        },
        _sum: {
          creditsUsed: true,
          hitCount: true,
        },
      });

      const tokensSaved = (cachedAnalyses._sum.hitCount || 0) * (cachedAnalyses._sum.creditsUsed || 0);
      const aiCostOptimization = tokensSaved * 0.00003; // Approximate cost per token

      // Get summary stats
      const totalUsers = await prisma.user.count();
      const totalFiles = await prisma.file.count();
      const totalTransactions = await prisma.transaction.aggregate({
        where: {
          status: "COMPLETED",
        },
        _sum: {
          amount: true,
        },
      });

      return Result.success({
        realtime: {
          activeUsers: activeUsers.length,
          processingFiles,
          apiCalls: activeUsers.length, // Simplified for now
          aiTier1Calls: tier1Calls,
          aiTier2Calls: tier2Calls,
        },
        daily: {
          newUsers,
          revenue: transactions._sum.amount || 0,
          filesProcessed,
          errors: fileErrors,
          tokensSaved,
          aiCostOptimization,
        },
        summary: {
          totalUsers,
          totalFiles,
          totalRevenue: totalTransactions._sum.amount || 0,
          avgProcessingTime: 0, // Would need to calculate from actual processing times
        },
      });
    } catch (error) {
      console.error("Get dashboard stats error:", error);
      return Result.failure(AdminErrors.QueryFailed);
    }
  }

  private getStartDate(period: string): Date {
    const now = new Date();
    switch (period) {
      case "today":
        return startOfDay(now);
      case "week":
        return subDays(now, 7);
      case "month":
        return subDays(now, 30);
      default:
        return startOfDay(now);
    }
  }
}