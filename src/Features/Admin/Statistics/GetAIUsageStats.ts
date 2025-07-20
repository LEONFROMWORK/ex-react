import { z } from "zod";
import { Result } from "@/Common/Result";
import { AdminErrors } from "@/Common/Errors";
import { prisma } from "@/lib/prisma";
import { startOfDay, subDays, eachDayOfInterval } from "date-fns";
import { GetUsageStatsHandler } from "@/Features/AIModelManagement/MonitorUsage/MonitorUsage";

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
  private readonly usageStatsHandler: GetUsageStatsHandler;

  constructor(usageStatsHandler?: GetUsageStatsHandler) {
    this.usageStatsHandler = usageStatsHandler || new GetUsageStatsHandler();
  }

  async handle(
    request: GetAIUsageStatsRequest
  ): Promise<Result<GetAIUsageStatsResponse>> {
    try {
      const endDate = new Date();
      const startDate = this.getStartDate(request.period);

      // Get usage stats from AI Model Management
      const usageResult = await this.usageStatsHandler.handle({
        startDate,
        endDate
      });

      if (usageResult.isFailure) {
        return Result.failure(AdminErrors.QueryFailed);
      }

      const modelUsageStats = usageResult.value!;

      // Get AI model usage logs for detailed analysis
      const usageLogs = await prisma.aIModelUsageLog.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          modelConfig: {
            select: {
              provider: true,
              modelName: true,
              displayName: true,
            },
          },
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
          creditsUsed: true,
        },
        _count: true,
      });

      // Calculate overview stats from model usage
      const totalRequests = modelUsageStats.totalRequests;
      const totalTokens = modelUsageStats.stats.reduce((sum, stat) => sum + stat.totalTokens, 0);
      const totalCost = modelUsageStats.totalCost;
      
      // Separate by model tier (simplified - you might want to add tier info to model config)
      const tier1Models = ['gpt-3.5-turbo', 'gemini-pro'];
      const tier1Stats = modelUsageStats.stats.filter(stat => 
        tier1Models.includes(stat.modelName.toLowerCase())
      );
      const tier2Stats = modelUsageStats.stats.filter(stat => 
        !tier1Models.includes(stat.modelName.toLowerCase())
      );
      
      const tier1Requests = tier1Stats.reduce((sum, stat) => sum + stat.totalRequests, 0);
      const tier2Requests = tier2Stats.reduce((sum, stat) => sum + stat.totalRequests, 0);

      const cacheHits = cacheData._sum.hitCount || 0;
      const totalQueriesWithCache = totalRequests + cacheHits;
      const cacheHitRate = totalQueriesWithCache > 0 ? cacheHits / totalQueriesWithCache : 0;

      // Calculate daily stats
      const dailyStats = this.calculateDailyStats(usageLogs, startDate, endDate);

      // Transform model stats from usage handler
      const modelStats = modelUsageStats.stats.map(stat => ({
        model: stat.modelName,
        requests: stat.totalRequests,
        tokens: stat.totalTokens,
        avgTokensPerRequest: stat.totalRequests > 0 ? stat.totalTokens / stat.totalRequests : 0,
        cost: stat.totalCost,
      }));

      // Calculate performance metrics
      const successfulLogs = usageLogs.filter(log => log.success);
      const avgLatency = successfulLogs.length > 0
        ? successfulLogs.reduce((sum, log) => sum + log.latency, 0) / successfulLogs.length
        : 0;
      
      const errorRate = totalRequests > 0 
        ? (totalRequests - successfulLogs.length) / totalRequests 
        : 0;
      
      const tier2TriggerRate = totalRequests > 0 ? tier2Requests / totalRequests : 0;

      return Result.success({
        overview: {
          totalRequests,
          tier1Requests,
          tier2Requests,
          totalTokens,
          totalCost,
          savedTokens: cacheData._sum.creditsUsed || 0,
          savedCost: totalCost * cacheHitRate, // Estimated savings from cache
          cacheHitRate,
        },
        daily: dailyStats,
        models: modelStats,
        performance: {
          avgConfidence: 0.85, // This would require adding confidence tracking
          tier2TriggerRate,
          avgResponseTime: avgLatency / 1000, // Convert to seconds
          errorRate,
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
    usageLogs: any[],
    startDate: Date,
    endDate: Date
  ): any[] {
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const tier1Models = ['gpt-3.5-turbo', 'gemini-pro'];
    
    return days.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      
      const dayLogs = usageLogs.filter(
        log => log.createdAt >= dayStart && log.createdAt < dayEnd
      );
      
      const tier1 = dayLogs.filter(log => 
        tier1Models.includes(log.modelConfig.modelName.toLowerCase())
      ).length;
      const tier2 = dayLogs.filter(log => 
        !tier1Models.includes(log.modelConfig.modelName.toLowerCase())
      ).length;
      const tokens = dayLogs.reduce((sum, log) => sum + log.totalTokens, 0);
      const cost = dayLogs.reduce((sum, log) => sum + log.cost, 0);
      
      return {
        date: day.toISOString(),
        tier1,
        tier2,
        tokens,
        cost,
      };
    });
  }

  // Model stats are now calculated by the usage handler, so this method is no longer needed
}