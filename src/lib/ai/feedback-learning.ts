/**
 * AI 모델 피드백 학습 시스템
 * 사용자 피드백을 수집하여 모델 성능을 추적하고 개선
 */

import { prisma } from '@/lib/prisma';

export interface UserFeedback {
  analysisId: string;
  userId: string;
  modelUsed: string;
  helpful: boolean;
  accuracyScore: number; // 1-5
  responseTime: number; // ms
  cost: number; // USD
  feedbackText?: string;
  errorReported?: boolean;
  timestamp: Date;
}

export interface ModelPerformanceStats {
  model: string;
  totalFeedbacks: number;
  avgAccuracyScore: number;
  avgResponseTime: number;
  avgCost: number;
  successRate: number;
  lastUpdated: Date;
  trendData?: {
    daily: PerformanceTrend[];
    weekly: PerformanceTrend[];
  };
}

export interface PerformanceTrend {
  date: Date;
  avgScore: number;
  volume: number;
  failureRate: number;
}

export class FeedbackLearningService {
  /**
   * 사용자 피드백 기록
   */
  async recordUserFeedback(feedback: Omit<UserFeedback, 'timestamp'>): Promise<void> {
    try {
      // 피드백 저장
      await prisma.userFeedback.create({
        data: {
          ...feedback,
          timestamp: new Date()
        }
      });

      // 모델 성능 통계 업데이트
      await this.updateModelPerformanceStats(feedback.modelUsed);

      // 낮은 점수의 피드백은 별도로 분석
      if (feedback.accuracyScore <= 2 || feedback.errorReported) {
        await this.analyzeNegativeFeedback(feedback);
      }
    } catch (error) {
      console.error('Failed to record user feedback:', error);
      // 피드백 기록 실패는 서비스에 영향을 주지 않도록 에러를 던지지 않음
    }
  }

  /**
   * 모델 성능 통계 업데이트
   */
  private async updateModelPerformanceStats(model: string): Promise<void> {
    const feedbacks = await prisma.userFeedback.findMany({
      where: {
        modelUsed: model,
        timestamp: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 최근 30일
        }
      }
    });

    if (feedbacks.length === 0) return;

    const stats = {
      totalFeedbacks: feedbacks.length,
      avgAccuracyScore: feedbacks.reduce((sum, f) => sum + f.accuracyScore, 0) / feedbacks.length,
      avgResponseTime: feedbacks.reduce((sum, f) => sum + f.responseTime, 0) / feedbacks.length,
      avgCost: feedbacks.reduce((sum, f) => sum + f.cost, 0) / feedbacks.length,
      successRate: feedbacks.filter(f => f.helpful).length / feedbacks.length
    };

    await prisma.modelPerformance.upsert({
      where: { model },
      create: {
        model,
        ...stats,
        updatedAt: new Date()
      },
      update: {
        ...stats,
        updatedAt: new Date()
      }
    });
  }

  /**
   * 부정적 피드백 분석
   */
  private async analyzeNegativeFeedback(
    feedback: Omit<UserFeedback, 'timestamp'>
  ): Promise<void> {
    // 패턴 분석을 위해 유사한 부정적 피드백 조회
    const similarFeedbacks = await prisma.userFeedback.findMany({
      where: {
        modelUsed: feedback.modelUsed,
        accuracyScore: { lte: 2 },
        timestamp: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 최근 7일
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 10
    });

    // 반복되는 문제 패턴 감지
    if (similarFeedbacks.length >= 3) {
      console.warn(`Model ${feedback.modelUsed} has received ${similarFeedbacks.length} negative feedbacks in the last 7 days`);
      
      // TODO: 관리자에게 알림 전송
      // TODO: 자동 모델 전환 고려
    }
  }

  /**
   * 사용자 피드백 기반 신뢰도 조정
   */
  async getAdjustedConfidence(
    baseConfidence: number,
    model: string,
    userId?: string
  ): Promise<number> {
    try {
      // 모델 전체 성능 통계
      const modelStats = await prisma.modelPerformance.findUnique({
        where: { model }
      });

      if (!modelStats || modelStats.totalFeedbacks < 10) {
        return baseConfidence; // 충분한 데이터가 없으면 기본값 사용
      }

      // 사용자별 개인화된 조정 (선택적)
      let userAdjustment = 1.0;
      if (userId) {
        const userFeedbacks = await prisma.userFeedback.findMany({
          where: {
            userId,
            modelUsed: model,
            timestamp: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          },
          orderBy: { timestamp: 'desc' },
          take: 5
        });

        if (userFeedbacks.length >= 3) {
          const avgUserScore = userFeedbacks.reduce((sum, f) => sum + f.accuracyScore, 0) / userFeedbacks.length;
          userAdjustment = avgUserScore / 5; // 0-1 범위로 정규화
        }
      }

      // 전체 모델 성능 기반 조정
      const modelAdjustment = modelStats.avgAccuracyScore / 5;
      
      // 가중 평균 (모델 70%, 사용자 30%)
      const finalAdjustment = modelAdjustment * 0.7 + userAdjustment * 0.3;
      
      // 최종 신뢰도 계산 (기본 50% + 피드백 50%)
      return baseConfidence * 0.5 + (baseConfidence * finalAdjustment) * 0.5;
    } catch (error) {
      console.error('Failed to get adjusted confidence:', error);
      return baseConfidence;
    }
  }

  /**
   * 모델별 성능 통계 조회
   */
  async getModelPerformanceStats(model?: string): Promise<ModelPerformanceStats[]> {
    const where = model ? { model } : {};
    
    const stats = await prisma.modelPerformance.findMany({
      where,
      orderBy: { avgAccuracyScore: 'desc' }
    });

    // 트렌드 데이터 추가 (선택적)
    const enrichedStats = await Promise.all(
      stats.map(async (stat) => {
        const trendData = await this.getPerformanceTrends(stat.model);
        return {
          ...stat,
          trendData
        };
      })
    );

    return enrichedStats;
  }

  /**
   * 성능 트렌드 분석
   */
  private async getPerformanceTrends(
    model: string
  ): Promise<{ daily: PerformanceTrend[]; weekly: PerformanceTrend[] }> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const feedbacks = await prisma.userFeedback.findMany({
      where: {
        modelUsed: model,
        timestamp: { gte: thirtyDaysAgo }
      },
      orderBy: { timestamp: 'asc' }
    });

    // 일별 집계
    const dailyTrends = this.aggregateTrends(feedbacks, 'day');
    // 주별 집계
    const weeklyTrends = this.aggregateTrends(feedbacks, 'week');

    return {
      daily: dailyTrends,
      weekly: weeklyTrends
    };
  }

  /**
   * 트렌드 데이터 집계
   */
  private aggregateTrends(
    feedbacks: any[],
    period: 'day' | 'week'
  ): PerformanceTrend[] {
    const grouped = new Map<string, any[]>();
    
    feedbacks.forEach(feedback => {
      const date = new Date(feedback.timestamp);
      const key = period === 'day' 
        ? date.toISOString().split('T')[0]
        : `${date.getFullYear()}-W${Math.ceil(date.getDate() / 7)}`;
      
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(feedback);
    });

    const trends: PerformanceTrend[] = [];
    
    grouped.forEach((periodFeedbacks, key) => {
      const avgScore = periodFeedbacks.reduce((sum, f) => sum + f.accuracyScore, 0) / periodFeedbacks.length;
      const failureRate = periodFeedbacks.filter(f => !f.helpful).length / periodFeedbacks.length;
      
      trends.push({
        date: new Date(key),
        avgScore,
        volume: periodFeedbacks.length,
        failureRate
      });
    });

    return trends.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * 모델 추천 시스템
   */
  async recommendModel(
    taskType: 'chat' | 'vision',
    userTier: string,
    userId?: string
  ): Promise<{
    recommended: string;
    reason: string;
    alternativeModels: string[];
  }> {
    // 사용 가능한 모델 목록 (Tier 기반)
    const availableModels = this.getAvailableModels(taskType, userTier);
    
    // 각 모델의 성능 점수 계산
    const modelScores = await Promise.all(
      availableModels.map(async (model) => {
        const stats = await prisma.modelPerformance.findUnique({
          where: { model }
        });
        
        if (!stats || stats.totalFeedbacks < 5) {
          return { model, score: 0.7 }; // 기본 점수
        }
        
        // 종합 점수 계산 (정확도 60%, 속도 20%, 비용 20%)
        const accuracyScore = stats.avgAccuracyScore / 5;
        const speedScore = Math.max(0, 1 - stats.avgResponseTime / 10000); // 10초 기준
        const costScore = Math.max(0, 1 - stats.avgCost / 0.1); // $0.1 기준
        
        const totalScore = accuracyScore * 0.6 + speedScore * 0.2 + costScore * 0.2;
        
        return { model, score: totalScore };
      })
    );

    // 점수순 정렬
    modelScores.sort((a, b) => b.score - a.score);
    
    const recommended = modelScores[0];
    const reason = this.getRecommendationReason(recommended, modelScores);
    
    return {
      recommended: recommended.model,
      reason,
      alternativeModels: modelScores.slice(1, 3).map(m => m.model)
    };
  }

  /**
   * Tier별 사용 가능한 모델 목록
   */
  private getAvailableModels(taskType: 'chat' | 'vision', userTier: string): string[] {
    const models = {
      chat: {
        TIER1: ['deepseek/deepseek-chat'],
        TIER2: ['openai/gpt-3.5-turbo', 'anthropic/claude-3-haiku'],
        TIER3: ['openai/gpt-4-turbo', 'anthropic/claude-3-opus']
      },
      vision: {
        TIER1: ['google/gemini-1.5-flash'],
        TIER2: ['google/gemini-1.5-flash', 'anthropic/claude-3-haiku'],
        TIER3: ['openai/gpt-4o', 'openai/gpt-4-vision-preview', 'anthropic/claude-3-opus']
      }
    };
    
    return models[taskType][userTier] || models[taskType].TIER1;
  }

  /**
   * 추천 이유 생성
   */
  private getRecommendationReason(
    recommended: { model: string; score: number },
    allScores: { model: string; score: number }[]
  ): string {
    if (recommended.score > 0.9) {
      return '최고의 성능과 사용자 만족도를 보이는 모델입니다.';
    } else if (recommended.score > 0.8) {
      return '안정적인 성능과 합리적인 비용의 균형을 제공합니다.';
    } else if (recommended.score > 0.7) {
      return '기본적인 작업에 적합한 경제적인 선택입니다.';
    } else {
      return '현재 사용 가능한 모델 중 가장 나은 선택입니다.';
    }
  }

  /**
   * 피드백 대시보드 데이터
   */
  async getDashboardData(): Promise<{
    overview: {
      totalFeedbacks: number;
      avgSatisfaction: number;
      topPerformingModel: string;
      worstPerformingModel: string;
    };
    modelComparison: ModelPerformanceStats[];
    recentTrends: PerformanceTrend[];
    alerts: string[];
  }> {
    const allStats = await this.getModelPerformanceStats();
    const totalFeedbacks = allStats.reduce((sum, stat) => sum + stat.totalFeedbacks, 0);
    const avgSatisfaction = allStats.reduce((sum, stat) => sum + stat.avgAccuracyScore * stat.totalFeedbacks, 0) / totalFeedbacks;
    
    const topModel = allStats[0];
    const worstModel = allStats[allStats.length - 1];
    
    // 최근 트렌드 (모든 모델 합산)
    const recentFeedbacks = await prisma.userFeedback.findMany({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      },
      orderBy: { timestamp: 'asc' }
    });
    
    const recentTrends = this.aggregateTrends(recentFeedbacks, 'day');
    
    // 경고 사항 수집
    const alerts: string[] = [];
    
    allStats.forEach(stat => {
      if (stat.avgAccuracyScore < 3) {
        alerts.push(`${stat.model} 모델의 평균 정확도가 낮습니다 (${stat.avgAccuracyScore.toFixed(1)}/5)`);
      }
      if (stat.successRate < 0.7) {
        alerts.push(`${stat.model} 모델의 성공률이 70% 미만입니다`);
      }
    });
    
    return {
      overview: {
        totalFeedbacks,
        avgSatisfaction,
        topPerformingModel: topModel?.model || 'N/A',
        worstPerformingModel: worstModel?.model || 'N/A'
      },
      modelComparison: allStats,
      recentTrends,
      alerts
    };
  }
}