import { z } from "zod";
import { Result } from "@/Common/Result";
import { AdminErrors } from "@/Common/Errors";
import { prisma } from "@/lib/prisma";

// Request Schema
export const GetErrorPatternStatsRequestSchema = z.object({
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  category: z.string().optional(),
  resolved: z.boolean().optional(),
});

export type GetErrorPatternStatsRequest = z.infer<typeof GetErrorPatternStatsRequestSchema>;

// Response Type
export interface GetErrorPatternStatsResponse {
  overview: {
    totalPatterns: number;
    resolvedPatterns: number;
    failedResolutions: number;
    resolutionRate: number;
    avgResolutionTime: number;
  };
  byCategory: Array<{
    category: string;
    count: number;
    resolved: number;
    resolutionRate: number;
  }>;
  byType: Array<{
    errorType: string;
    count: number;
    frequency: number;
    avgConfidence: number;
  }>;
  bySeverity: {
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
  topErrors: Array<{
    id: string;
    errorType: string;
    errorMessage: string;
    frequency: number;
    category: string;
    severity: string;
    resolutionRate: number;
  }>;
}

// Handler
export class GetErrorPatternStatsHandler {
  async handle(
    request: GetErrorPatternStatsRequest
  ): Promise<Result<GetErrorPatternStatsResponse>> {
    try {
      const where: any = {};
      
      if (request.startDate || request.endDate) {
        where.createdAt = {};
        if (request.startDate) where.createdAt.gte = request.startDate;
        if (request.endDate) where.createdAt.lte = request.endDate;
      }
      
      if (request.category) {
        where.category = request.category;
      }
      
      if (request.resolved !== undefined) {
        where.resolved = request.resolved;
      }

      // Get overview stats
      const [totalPatterns, resolvedPatterns, failedResolutions] = await Promise.all([
        prisma.errorPattern.count({ where }),
        prisma.errorPattern.count({ where: { ...where, resolved: true } }),
        prisma.errorResolutionFailure.count(),
      ]);

      const avgResolutionTimeResult = await prisma.errorPattern.aggregate({
        where: { ...where, resolved: true, resolutionTime: { not: null } },
        _avg: { resolutionTime: true },
      });

      // Get stats by category
      const byCategory = await prisma.errorPattern.groupBy({
        by: ["category"],
        where,
        _count: true,
      });

      const byCategoryWithResolved = await Promise.all(
        byCategory.map(async (cat) => {
          const resolved = await prisma.errorPattern.count({
            where: { ...where, category: cat.category, resolved: true },
          });
          return {
            category: cat.category || "UNCATEGORIZED",
            count: cat._count,
            resolved,
            resolutionRate: cat._count > 0 ? (resolved / cat._count) * 100 : 0,
          };
        })
      );

      // Get stats by type
      const byType = await prisma.errorPattern.groupBy({
        by: ["errorType"],
        where,
        _count: true,
        _sum: { frequency: true },
        _avg: { aiConfidence: true },
      });

      // Get severity distribution
      const severityStats = await prisma.errorPattern.groupBy({
        by: ["severity"],
        where,
        _count: true,
      });

      const bySeverity = {
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0,
      };

      severityStats.forEach(stat => {
        if (stat.severity in bySeverity) {
          bySeverity[stat.severity as keyof typeof bySeverity] = stat._count;
        }
      });

      // Get top errors
      const topErrors = await prisma.errorPattern.findMany({
        where,
        orderBy: { frequency: "desc" },
        take: 10,
      });

      const topErrorsWithStats = await Promise.all(
        topErrors.map(async (error) => {
          const resolved = await prisma.errorPattern.count({
            where: {
              errorType: error.errorType,
              resolved: true,
            },
          });
          const total = await prisma.errorPattern.count({
            where: { errorType: error.errorType },
          });
          
          return {
            id: error.id,
            errorType: error.errorType,
            errorMessage: error.errorMessage,
            frequency: error.frequency,
            category: error.category || "UNCATEGORIZED",
            severity: error.severity,
            resolutionRate: total > 0 ? (resolved / total) * 100 : 0,
          };
        })
      );

      return Result.success({
        overview: {
          totalPatterns,
          resolvedPatterns,
          failedResolutions,
          resolutionRate: totalPatterns > 0 ? (resolvedPatterns / totalPatterns) * 100 : 0,
          avgResolutionTime: avgResolutionTimeResult._avg.resolutionTime || 0,
        },
        byCategory: byCategoryWithResolved,
        byType: byType.map(t => ({
          errorType: t.errorType,
          count: t._count,
          frequency: t._sum.frequency || 0,
          avgConfidence: t._avg.aiConfidence || 0,
        })),
        bySeverity,
        topErrors: topErrorsWithStats,
      });
    } catch (error) {
      console.error("Get error pattern stats error:", error);
      return Result.failure(AdminErrors.QueryFailed);
    }
  }
}