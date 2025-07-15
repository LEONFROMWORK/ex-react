import { z } from "zod";
import { Result } from "@/Common/Result";
import { AdminErrors } from "@/Common/Errors";
import { prisma } from "@/lib/prisma";
import { startOfDay, subDays, eachDayOfInterval } from "date-fns";

// Request Schema
export const GetAIUsageStatsRequestSchema = z.object({
  period: z.enum(["today", "week", "month"]).default("week"),
});

export type GetAIUsageStatsRequest = z.infer<typeof GetAIUsageStatsRequestSchema>;

// Response Type
export interface GetAIUsageStatsResponse {
  overview: {
    totalRequests: number;
    tier1Requests: number;
    tier2Requests: number;
    totalTokens: number;
    totalCost: number;
    savedTokens: number;
    savedCost: number;
    cacheHitRate: number;
  };
  daily: {
    date: string;
    tier1: number;
    tier2: number;
    tokens: number;
    cost: number;
  }[];
  models: {
    model: string;
    requests: number;
    tokens: number;
    avgTokensPerRequest: number;
    cost: number;
  }[];
  performance: {
    avgConfidence: number;
    tier2TriggerRate: number;
    avgResponseTime: number;
    errorRate: number;
  };
}

// Handler
export class GetAIUsageStatsHandler {
  async handle(
    request: GetAIUsageStatsRequest
  ): Promise<Result<GetAIUsageStatsResponse>> {
    try {
      const endDate = new Date();
      const startDate = this.getStartDate(request.period);

      // Get AI usage stats
      const aiUsageStats = await prisma.aIUsageStats.aggregate({
        _sum: {
          tier1Calls: true,
          tier1Tokens: true,
          tier1Cost: true,
          tier2Calls: true,
          tier2Tokens: true,
          tier2Cost: true,
          tokensSaved: true,
          costSaved: true,
        },
      });

      // Get analysis data for the period
      const analyses = await prisma.analysis.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          aiTier: true,
          tokensUsed: true,
          estimatedCost: true,
          confidence: true,
          createdAt: true,
        },
      });

      // Get cache data
      const cacheData = await prisma.aIPromptCache.aggregate({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: {
          hitCount: true,
          tokensUsed: true,
        },
        _count: true,
      });

      // Calculate overview stats
      const tier1Requests = analyses.filter(a => a.aiTier === "TIER1").length;
      const tier2Requests = analyses.filter(a => a.aiTier === "TIER2").length;
      const totalRequests = tier1Requests + tier2Requests;
      const totalTokens = analyses.reduce((sum, a) => sum + a.tokensUsed, 0);
      const totalCost = analyses.reduce((sum, a) => sum + a.estimatedCost, 0);

      const cacheHits = cacheData._sum.hitCount || 0;
      const totalQueriesWithCache = totalRequests + cacheHits;
      const cacheHitRate = totalQueriesWithCache > 0 ? cacheHits / totalQueriesWithCache : 0;

      // Calculate daily stats
      const dailyStats = this.calculateDailyStats(analyses, startDate, endDate);

      // Calculate model stats
      const modelStats = this.calculateModelStats(analyses);

      // Calculate performance metrics
      const avgConfidence = analyses.length > 0
        ? analyses.reduce((sum, a) => sum + (a.confidence || 0), 0) / analyses.length
        : 0;
      
      const tier2TriggerRate = totalRequests > 0 ? tier2Requests / totalRequests : 0;

      return Result.success({
        overview: {
          totalRequests,
          tier1Requests,
          tier2Requests,
          totalTokens,
          totalCost,
          savedTokens: aiUsageStats._sum.tokensSaved || 0,
          savedCost: aiUsageStats._sum.costSaved || 0,
          cacheHitRate,
        },
        daily: dailyStats,
        models: modelStats,
        performance: {
          avgConfidence,
          tier2TriggerRate,
          avgResponseTime: 2.5, // Placeholder - would need actual timing data
          errorRate: 0.02, // Placeholder - would need error tracking
        },
      });
    } catch (error) {
      console.error("Get AI usage stats error:", error);
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
        return subDays(now, 7);
    }
  }

  private calculateDailyStats(
    analyses: any[],
    startDate: Date,
    endDate: Date
  ): any[] {
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    return days.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      
      const dayAnalyses = analyses.filter(
        a => a.createdAt >= dayStart && a.createdAt < dayEnd
      );
      
      const tier1 = dayAnalyses.filter(a => a.aiTier === "TIER1").length;
      const tier2 = dayAnalyses.filter(a => a.aiTier === "TIER2").length;
      const tokens = dayAnalyses.reduce((sum, a) => sum + a.tokensUsed, 0);
      const cost = dayAnalyses.reduce((sum, a) => sum + a.estimatedCost, 0);
      
      return {
        date: day.toISOString(),
        tier1,
        tier2,
        tokens,
        cost,
      };
    });
  }

  private calculateModelStats(analyses: any[]): any[] {
    const modelMap = new Map<string, any>();
    
    analyses.forEach(analysis => {
      const model = analysis.aiTier === "TIER1" ? "gpt-3.5-turbo" : "gpt-4";
      
      if (!modelMap.has(model)) {
        modelMap.set(model, {
          model,
          requests: 0,
          tokens: 0,
          cost: 0,
        });
      }
      
      const stats = modelMap.get(model);
      stats.requests += 1;
      stats.tokens += analysis.tokensUsed;
      stats.cost += analysis.estimatedCost;
    });
    
    return Array.from(modelMap.values()).map(stats => ({
      ...stats,
      avgTokensPerRequest: stats.requests > 0 ? stats.tokens / stats.requests : 0,
    }));
  }
}