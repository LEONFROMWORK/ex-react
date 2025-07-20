/**
 * 실시간 AI 성능 대시보드
 * 모델 성능, A/B 테스트 결과, 비용 등을 실시간으로 모니터링
 */

import { prisma } from '@/lib/prisma';
import { ABTestingService } from './ab-testing-service';
import { DynamicRoutingEnhancer } from './dynamic-routing-enhancer';
import { FeedbackLearningService } from './feedback-learning';

export interface DashboardMetrics {
  overview: {
    totalRequests: number;
    successRate: number;
    avgResponseTime: number;
    totalCost: number;
    activeUsers: number;
    period: { start: Date; end: Date };
  };
  modelPerformance: ModelMetrics[];
  abTestResults: ABTestSummary[];
  costAnalysis: CostBreakdown;
  userSatisfaction: SatisfactionMetrics;
  alerts: SystemAlert[];
  trends: TrendData[];
}

export interface ModelMetrics {
  model: string;
  provider: string;
  taskType: string;
  metrics: {
    requestCount: number;
    successRate: number;
    avgLatency: number;
    p95Latency: number;
    avgQualityScore: number;
    errorRate: number;
    cost: number;
    avgTokensUsed: number;
  };
  healthStatus: 'healthy' | 'degraded' | 'critical';
  lastUpdated: Date;
}

export interface ABTestSummary {
  experimentId: string;
  name: string;
  status: string;
  variants: Array<{
    name: string;
    metrics: {
      sampleSize: number;
      conversionRate: number;
      avgQualityScore: number;
      avgResponseTime: number;
      costPerConversion: number;
    };
    isWinning?: boolean;
    confidenceLevel?: number;
  }>;
  recommendation?: string;
}

export interface CostBreakdown {
  totalCost: number;
  byModel: Record<string, number>;
  byTier: Record<string, number>;
  byTaskType: Record<string, number>;
  projectedMonthlyCost: number;
  costTrend: 'increasing' | 'stable' | 'decreasing';
  savingsFromOptimization: number;
}

export interface SatisfactionMetrics {
  avgRating: number;
  npsScore: number;
  feedbackCount: number;
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  topComplaints: string[];
  topPraises: string[];
}

export interface SystemAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  type: 'performance' | 'cost' | 'error' | 'experiment';
  title: string;
  message: string;
  timestamp: Date;
  actionRequired?: string;
}

export interface TrendData {
  metric: string;
  dataPoints: Array<{
    timestamp: Date;
    value: number;
  }>;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
}

export class PerformanceDashboard {
  private abTesting: ABTestingService;
  private routingEnhancer: DynamicRoutingEnhancer;
  private feedbackLearning: FeedbackLearningService;
  private refreshInterval: number = 60000; // 1분
  private metricsCache: Map<string, any> = new Map();

  constructor() {
    this.abTesting = new ABTestingService();
    this.routingEnhancer = new DynamicRoutingEnhancer();
    this.feedbackLearning = new FeedbackLearningService();
  }

  /**
   * 대시보드 메트릭 조회
   */
  async getDashboardMetrics(
    timeRange: { start: Date; end: Date } = {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24시간
      end: new Date()
    }
  ): Promise<DashboardMetrics> {
    const [
      overview,
      modelPerformance,
      abTestResults,
      costAnalysis,
      userSatisfaction,
      alerts,
      trends
    ] = await Promise.all([
      this.getOverviewMetrics(timeRange),
      this.getModelPerformanceMetrics(timeRange),
      this.getABTestResults(),
      this.getCostAnalysis(timeRange),
      this.getUserSatisfactionMetrics(timeRange),
      this.getSystemAlerts(timeRange),
      this.getTrendData(timeRange)
    ]);

    return {
      overview,
      modelPerformance,
      abTestResults,
      costAnalysis,
      userSatisfaction,
      alerts,
      trends
    };
  }

  /**
   * 전체 개요 메트릭
   */
  private async getOverviewMetrics(timeRange: { start: Date; end: Date }): Promise<DashboardMetrics['overview']> {
    const logs = await prisma.aIUsageLog.findMany({
      where: {
        timestamp: {
          gte: timeRange.start,
          lte: timeRange.end
        }
      },
      select: {
        success: true,
        responseTime: true,
        cost: true,
        userId: true
      }
    });

    const totalRequests = logs.length;
    const successCount = logs.filter(l => l.success).length;
    const totalResponseTime = logs.reduce((sum, l) => sum + (l.responseTime || 0), 0);
    const totalCost = logs.reduce((sum, l) => sum + (l.cost || 0), 0);
    const uniqueUsers = new Set(logs.map(l => l.userId)).size;

    return {
      totalRequests,
      successRate: totalRequests > 0 ? successCount / totalRequests : 0,
      avgResponseTime: totalRequests > 0 ? totalResponseTime / totalRequests : 0,
      totalCost,
      activeUsers: uniqueUsers,
      period: timeRange
    };
  }

  /**
   * 모델별 성능 메트릭
   */
  private async getModelPerformanceMetrics(timeRange: { start: Date; end: Date }): Promise<ModelMetrics[]> {
    const modelConfigs = await prisma.aIModelConfig.findMany({
      where: { isActive: true }
    });

    const metrics: ModelMetrics[] = [];

    for (const config of modelConfigs) {
      const logs = await prisma.aIUsageLog.findMany({
        where: {
          model: config.modelName,
          timestamp: {
            gte: timeRange.start,
            lte: timeRange.end
          }
        }
      });

      if (logs.length === 0) continue;

      const successLogs = logs.filter(l => l.success);
      const responseTimes = logs.map(l => l.responseTime || 0).sort((a, b) => a - b);
      const p95Index = Math.floor(responseTimes.length * 0.95);
      const qualityScores = logs
        .map(l => (l.metadata as any)?.qualityScore)
        .filter(s => s !== undefined);

      metrics.push({
        model: config.modelName,
        provider: config.provider,
        taskType: config.taskTypes.join(', '),
        metrics: {
          requestCount: logs.length,
          successRate: logs.length > 0 ? successLogs.length / logs.length : 0,
          avgLatency: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
          p95Latency: responseTimes[p95Index] || 0,
          avgQualityScore: qualityScores.length > 0 
            ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length 
            : 0,
          errorRate: 1 - (successLogs.length / logs.length),
          cost: logs.reduce((sum, l) => sum + (l.cost || 0), 0),
          avgTokensUsed: logs.reduce((sum, l) => sum + (l.totalTokens || 0), 0) / logs.length
        },
        healthStatus: this.calculateHealthStatus(successLogs.length / logs.length, responseTimes),
        lastUpdated: new Date()
      });
    }

    return metrics.sort((a, b) => b.metrics.requestCount - a.metrics.requestCount);
  }

  /**
   * A/B 테스트 결과
   */
  private async getABTestResults(): Promise<ABTestSummary[]> {
    const activeExperiments = await prisma.experiment.findMany({
      where: { status: 'active' },
      include: {
        assignments: true,
        results: true
      }
    });

    const summaries: ABTestSummary[] = [];

    for (const experiment of activeExperiments) {
      const variantMetrics = new Map<string, any>();

      // 각 변형별 메트릭 계산
      for (const result of experiment.results) {
        const variantId = result.variantId;
        if (!variantMetrics.has(variantId)) {
          variantMetrics.set(variantId, {
            sampleSize: 0,
            conversions: 0,
            totalQuality: 0,
            totalResponseTime: 0,
            totalCost: 0
          });
        }

        const metrics = variantMetrics.get(variantId);
        metrics.sampleSize++;
        if (result.converted) metrics.conversions++;
        metrics.totalQuality += (result.metrics as any)?.qualityScore || 0;
        metrics.totalResponseTime += (result.metrics as any)?.responseTime || 0;
        metrics.totalCost += (result.metrics as any)?.cost || 0;
      }

      // 분석 결과 가져오기
      const analysis = await this.abTesting.analyzeExperiment(experiment.id);

      summaries.push({
        experimentId: experiment.id,
        name: experiment.name,
        status: experiment.status,
        variants: Array.from(variantMetrics.entries()).map(([variantId, metrics]) => {
          const variant = experiment.variants.find((v: any) => v.id === variantId);
          return {
            name: variant?.name || 'Unknown',
            metrics: {
              sampleSize: metrics.sampleSize,
              conversionRate: metrics.sampleSize > 0 ? metrics.conversions / metrics.sampleSize : 0,
              avgQualityScore: metrics.sampleSize > 0 ? metrics.totalQuality / metrics.sampleSize : 0,
              avgResponseTime: metrics.sampleSize > 0 ? metrics.totalResponseTime / metrics.sampleSize : 0,
              costPerConversion: metrics.conversions > 0 ? metrics.totalCost / metrics.conversions : 0
            },
            isWinning: analysis.winner === variantId,
            confidenceLevel: analysis.analysis.find((a: any) => a.variantId === variantId)?.confidenceLevel
          };
        }),
        recommendation: this.generateABTestRecommendation(analysis)
      });
    }

    return summaries;
  }

  /**
   * 비용 분석
   */
  private async getCostAnalysis(timeRange: { start: Date; end: Date }): Promise<CostBreakdown> {
    const logs = await prisma.aIUsageLog.findMany({
      where: {
        timestamp: {
          gte: timeRange.start,
          lte: timeRange.end
        }
      },
      include: {
        user: true
      }
    });

    const totalCost = logs.reduce((sum, l) => sum + (l.cost || 0), 0);
    const byModel: Record<string, number> = {};
    const byTier: Record<string, number> = {};
    const byTaskType: Record<string, number> = {};

    logs.forEach(log => {
      // By Model
      byModel[log.model] = (byModel[log.model] || 0) + (log.cost || 0);
      
      // By Tier
      const tier = (log.user as any)?.tier || 'TIER1';
      byTier[tier] = (byTier[tier] || 0) + (log.cost || 0);
      
      // By Task Type
      const taskType = log.taskType || 'general';
      byTaskType[taskType] = (byTaskType[taskType] || 0) + (log.cost || 0);
    });

    // 월간 예상 비용
    const daysInRange = (timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24);
    const dailyAvg = totalCost / daysInRange;
    const projectedMonthlyCost = dailyAvg * 30;

    // 비용 추세 분석
    const previousPeriodCost = await this.getPreviousPeriodCost(timeRange);
    const costChange = ((totalCost - previousPeriodCost) / previousPeriodCost) * 100;
    const costTrend = costChange > 5 ? 'increasing' : costChange < -5 ? 'decreasing' : 'stable';

    // 최적화로 인한 절감액 (폴백 사용으로 인한 절감)
    const savingsFromOptimization = await this.calculateOptimizationSavings(timeRange);

    return {
      totalCost,
      byModel,
      byTier,
      byTaskType,
      projectedMonthlyCost,
      costTrend,
      savingsFromOptimization
    };
  }

  /**
   * 사용자 만족도 메트릭
   */
  private async getUserSatisfactionMetrics(timeRange: { start: Date; end: Date }): Promise<SatisfactionMetrics> {
    const feedbacks = await prisma.aIFeedback.findMany({
      where: {
        createdAt: {
          gte: timeRange.start,
          lte: timeRange.end
        }
      }
    });

    const ratings = feedbacks.map(f => f.rating).filter(r => r !== null) as number[];
    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

    // NPS 계산 (9-10: Promoters, 7-8: Passives, 0-6: Detractors)
    const promoters = ratings.filter(r => r >= 9).length;
    const detractors = ratings.filter(r => r <= 6).length;
    const npsScore = ratings.length > 0 ? ((promoters - detractors) / ratings.length) * 100 : 0;

    // 감성 분석
    const sentiments = feedbacks.map(f => f.sentiment).filter(s => s !== null);
    const sentimentBreakdown = {
      positive: sentiments.filter(s => s === 'positive').length,
      neutral: sentiments.filter(s => s === 'neutral').length,
      negative: sentiments.filter(s => s === 'negative').length
    };

    // 주요 불만사항과 칭찬
    const negativeComments = feedbacks
      .filter(f => f.sentiment === 'negative' && f.comments)
      .map(f => f.comments as string);
    const positiveComments = feedbacks
      .filter(f => f.sentiment === 'positive' && f.comments)
      .map(f => f.comments as string);

    return {
      avgRating,
      npsScore,
      feedbackCount: feedbacks.length,
      sentimentBreakdown,
      topComplaints: this.extractTopThemes(negativeComments, 3),
      topPraises: this.extractTopThemes(positiveComments, 3)
    };
  }

  /**
   * 시스템 알림
   */
  private async getSystemAlerts(timeRange: { start: Date; end: Date }): Promise<SystemAlert[]> {
    const alerts: SystemAlert[] = [];

    // 1. 모델 성능 알림
    const modelMetrics = await this.getModelPerformanceMetrics(timeRange);
    modelMetrics.forEach(metric => {
      if (metric.healthStatus === 'critical') {
        alerts.push({
          id: `model-critical-${metric.model}`,
          severity: 'critical',
          type: 'performance',
          title: '모델 성능 심각',
          message: `${metric.model}의 성공률이 ${(metric.metrics.successRate * 100).toFixed(1)}%로 매우 낮습니다.`,
          timestamp: new Date(),
          actionRequired: '대체 모델로의 트래픽 전환 검토'
        });
      }
    });

    // 2. 비용 알림
    const costAnalysis = await this.getCostAnalysis(timeRange);
    if (costAnalysis.costTrend === 'increasing' && costAnalysis.projectedMonthlyCost > 1000) {
      alerts.push({
        id: 'cost-increase',
        severity: 'warning',
        type: 'cost',
        title: '비용 증가 추세',
        message: `예상 월간 비용이 $${costAnalysis.projectedMonthlyCost.toFixed(2)}로 증가 추세입니다.`,
        timestamp: new Date(),
        actionRequired: '비용 최적화 전략 검토 필요'
      });
    }

    // 3. A/B 테스트 알림
    const abTests = await this.getABTestResults();
    abTests.forEach(test => {
      if (test.variants.some(v => v.confidenceLevel && v.confidenceLevel > 0.95)) {
        alerts.push({
          id: `ab-test-ready-${test.experimentId}`,
          severity: 'info',
          type: 'experiment',
          title: 'A/B 테스트 결과 확정',
          message: `${test.name} 실험이 통계적으로 유의미한 결과를 도출했습니다.`,
          timestamp: new Date(),
          actionRequired: '승리 변형 적용 검토'
        });
      }
    });

    return alerts.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * 추세 데이터
   */
  private async getTrendData(timeRange: { start: Date; end: Date }): Promise<TrendData[]> {
    const trends: TrendData[] = [];
    const intervals = 24; // 24시간을 1시간 단위로
    const intervalMs = (timeRange.end.getTime() - timeRange.start.getTime()) / intervals;

    // 1. 요청량 추세
    const requestTrend = await this.calculateTrend('requests', timeRange, intervalMs);
    trends.push(requestTrend);

    // 2. 성공률 추세
    const successRateTrend = await this.calculateTrend('successRate', timeRange, intervalMs);
    trends.push(successRateTrend);

    // 3. 응답 시간 추세
    const responseTimeTrend = await this.calculateTrend('responseTime', timeRange, intervalMs);
    trends.push(responseTimeTrend);

    // 4. 비용 추세
    const costTrend = await this.calculateTrend('cost', timeRange, intervalMs);
    trends.push(costTrend);

    return trends;
  }

  /**
   * 실시간 업데이트를 위한 WebSocket 이벤트
   */
  async streamRealtimeMetrics(callback: (metrics: Partial<DashboardMetrics>) => void): Promise<() => void> {
    const intervalId = setInterval(async () => {
      try {
        // 최근 5분간의 데이터만 업데이트
        const recentTimeRange = {
          start: new Date(Date.now() - 5 * 60 * 1000),
          end: new Date()
        };

        const overview = await this.getOverviewMetrics(recentTimeRange);
        const alerts = await this.getSystemAlerts(recentTimeRange);

        callback({
          overview,
          alerts: alerts.filter(a => a.timestamp > new Date(Date.now() - 5 * 60 * 1000))
        });
      } catch (error) {
        console.error('Failed to stream realtime metrics:', error);
      }
    }, this.refreshInterval);

    // Cleanup 함수 반환
    return () => clearInterval(intervalId);
  }

  /**
   * 유틸리티 함수들
   */
  private calculateHealthStatus(successRate: number, responseTimes: number[]): 'healthy' | 'degraded' | 'critical' {
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    
    if (successRate < 0.5 || avgResponseTime > 10000) return 'critical';
    if (successRate < 0.8 || avgResponseTime > 5000) return 'degraded';
    return 'healthy';
  }

  private generateABTestRecommendation(analysis: any): string {
    if (!analysis.winner) {
      return '더 많은 데이터가 필요합니다.';
    }

    const winningVariant = analysis.analysis.find((a: any) => a.variantId === analysis.winner);
    if (winningVariant?.confidenceLevel > 0.95) {
      return `${winningVariant.variantName}을(를) 기본값으로 적용하는 것을 권장합니다.`;
    }

    return '결과가 유망하지만 더 많은 검증이 필요합니다.';
  }

  private async getPreviousPeriodCost(currentRange: { start: Date; end: Date }): Promise<number> {
    const duration = currentRange.end.getTime() - currentRange.start.getTime();
    const previousRange = {
      start: new Date(currentRange.start.getTime() - duration),
      end: currentRange.start
    };

    const logs = await prisma.aIUsageLog.findMany({
      where: {
        timestamp: {
          gte: previousRange.start,
          lte: previousRange.end
        }
      },
      select: { cost: true }
    });

    return logs.reduce((sum, l) => sum + (l.cost || 0), 0);
  }

  private async calculateOptimizationSavings(timeRange: { start: Date; end: Date }): Promise<number> {
    // 폴백 사용으로 인한 절감액 계산
    const fallbackLogs = await prisma.aIUsageLog.findMany({
      where: {
        timestamp: {
          gte: timeRange.start,
          lte: timeRange.end
        },
        metadata: {
          path: ['fallbackUsed'],
          equals: true
        }
      }
    });

    // 원래 모델 비용과 폴백 모델 비용의 차이 계산
    let savings = 0;
    fallbackLogs.forEach(log => {
      const metadata = log.metadata as any;
      if (metadata?.originalModelCost) {
        savings += metadata.originalModelCost - (log.cost || 0);
      }
    });

    return savings;
  }

  private extractTopThemes(comments: string[], topN: number): string[] {
    // 간단한 키워드 추출 (실제로는 NLP 사용)
    const wordFreq = new Map<string, number>();
    
    comments.forEach(comment => {
      const words = comment.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 3) { // 3글자 이상만
          wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
        }
      });
    });

    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([word]) => word);
  }

  private async calculateTrend(
    metric: string,
    timeRange: { start: Date; end: Date },
    intervalMs: number
  ): Promise<TrendData> {
    const dataPoints: Array<{ timestamp: Date; value: number }> = [];
    
    for (let i = 0; i < 24; i++) {
      const intervalStart = new Date(timeRange.start.getTime() + i * intervalMs);
      const intervalEnd = new Date(intervalStart.getTime() + intervalMs);
      
      const logs = await prisma.aIUsageLog.findMany({
        where: {
          timestamp: {
            gte: intervalStart,
            lte: intervalEnd
          }
        }
      });

      let value = 0;
      switch (metric) {
        case 'requests':
          value = logs.length;
          break;
        case 'successRate':
          value = logs.length > 0 ? logs.filter(l => l.success).length / logs.length : 0;
          break;
        case 'responseTime':
          value = logs.length > 0 
            ? logs.reduce((sum, l) => sum + (l.responseTime || 0), 0) / logs.length 
            : 0;
          break;
        case 'cost':
          value = logs.reduce((sum, l) => sum + (l.cost || 0), 0);
          break;
      }

      dataPoints.push({ timestamp: intervalEnd, value });
    }

    // 추세 계산
    const firstHalf = dataPoints.slice(0, 12).reduce((sum, p) => sum + p.value, 0) / 12;
    const secondHalf = dataPoints.slice(12).reduce((sum, p) => sum + p.value, 0) / 12;
    const changePercent = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;
    
    const trend = changePercent > 5 ? 'up' : changePercent < -5 ? 'down' : 'stable';

    return {
      metric,
      dataPoints,
      trend,
      changePercent
    };
  }

  /**
   * 대시보드 데이터 내보내기
   */
  async exportDashboardData(
    format: 'json' | 'csv',
    timeRange: { start: Date; end: Date }
  ): Promise<string> {
    const metrics = await this.getDashboardMetrics(timeRange);
    
    if (format === 'json') {
      return JSON.stringify(metrics, null, 2);
    }
    
    // CSV 형식으로 변환
    const csv: string[] = [];
    csv.push('Metric,Value,Timestamp');
    
    // Overview
    csv.push(`Total Requests,${metrics.overview.totalRequests},${new Date().toISOString()}`);
    csv.push(`Success Rate,${metrics.overview.successRate},${new Date().toISOString()}`);
    csv.push(`Average Response Time,${metrics.overview.avgResponseTime},${new Date().toISOString()}`);
    csv.push(`Total Cost,${metrics.overview.totalCost},${new Date().toISOString()}`);
    
    // Model Performance
    metrics.modelPerformance.forEach(model => {
      csv.push(`${model.model} Success Rate,${model.metrics.successRate},${model.lastUpdated.toISOString()}`);
      csv.push(`${model.model} Avg Latency,${model.metrics.avgLatency},${model.lastUpdated.toISOString()}`);
      csv.push(`${model.model} Cost,${model.metrics.cost},${model.lastUpdated.toISOString()}`);
    });
    
    return csv.join('\n');
  }
}

// 대시보드 관련 유틸리티
export const dashboardUtils = {
  /**
   * 메트릭 포맷팅
   */
  formatMetric(value: number, type: string): string {
    switch (type) {
      case 'percentage':
        return `${(value * 100).toFixed(1)}%`;
      case 'currency':
        return `$${value.toFixed(2)}`;
      case 'duration':
        return `${value.toFixed(0)}ms`;
      case 'count':
        return value.toLocaleString();
      default:
        return value.toString();
    }
  },

  /**
   * 상태별 색상 매핑
   */
  getStatusColor(status: string): string {
    const colors = {
      healthy: '#10b981',
      degraded: '#f59e0b',
      critical: '#ef4444',
      increasing: '#ef4444',
      stable: '#6b7280',
      decreasing: '#10b981'
    };
    return colors[status] || '#6b7280';
  },

  /**
   * 차트 데이터 준비
   */
  prepareChartData(trendData: TrendData): any {
    return {
      labels: trendData.dataPoints.map(p => p.timestamp.toLocaleTimeString()),
      datasets: [{
        label: trendData.metric,
        data: trendData.dataPoints.map(p => p.value),
        borderColor: trendData.trend === 'up' ? '#ef4444' : trendData.trend === 'down' ? '#10b981' : '#6b7280',
        tension: 0.4
      }]
    };
  }
};