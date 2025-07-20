/**
 * 동적 모델 라우팅 개선
 * 사용자별 성능 히스토리와 실시간 모델 상태를 기반으로 최적 라우팅
 */

import { AIModelManager } from './model-manager';
import { FeedbackLearningService } from './feedback-learning';
import { ABTestingIntegration } from './ab-testing-integration';
import { prisma } from '@/lib/prisma';

export interface UserModelHistory {
  userId: string;
  modelPreferences: Map<string, ModelPreference>;
  lastUpdated: Date;
}

export interface ModelPreference {
  model: string;
  taskType: 'chat' | 'vision' | 'analysis';
  successRate: number;
  avgResponseTime: number;
  avgQualityScore: number;
  usageCount: number;
  lastUsed: Date;
}

export interface ModelHealthStatus {
  model: string;
  status: 'healthy' | 'degraded' | 'unavailable';
  avgLatency: number; // ms
  errorRate: number; // 0-1
  throughput: number; // requests per minute
  lastChecked: Date;
}

export interface RoutingDecision {
  selectedModel: string;
  reason: string;
  alternativeModels: string[];
  confidenceScore: number; // 0-1
  metadata?: {
    userPreference?: boolean;
    abTestOverride?: boolean;
    performanceBased?: boolean;
    costOptimized?: boolean;
  };
}

export class DynamicRoutingEnhancer {
  private modelManager: AIModelManager;
  private feedbackLearning: FeedbackLearningService;
  private abTesting: ABTestingIntegration;
  private userHistories: Map<string, UserModelHistory> = new Map();
  private modelHealthCache: Map<string, ModelHealthStatus> = new Map();
  private readonly HEALTH_CHECK_INTERVAL = 60000; // 1분

  constructor() {
    this.modelManager = AIModelManager.getInstance();
    this.feedbackLearning = new FeedbackLearningService();
    this.abTesting = ABTestingIntegration.getInstance();
    this.startHealthMonitoring();
  }

  /**
   * 사용자와 작업에 최적화된 모델 선택
   */
  async selectOptimalModel(
    userId: string,
    taskType: 'chat' | 'vision' | 'analysis',
    context: {
      userTier: string;
      taskComplexity?: 'low' | 'medium' | 'high';
      urgency?: 'low' | 'normal' | 'high';
      costSensitive?: boolean;
      preferredModels?: string[];
      requiredFeatures?: string[];
    }
  ): Promise<RoutingDecision> {
    // 1. A/B 테스트 확인
    const abTestModel = await this.checkABTestOverride(userId, taskType, context);
    if (abTestModel) {
      return abTestModel;
    }

    // 2. 사용자 히스토리 기반 선택
    const userHistory = await this.getUserModelHistory(userId);
    const historicalChoice = this.selectBasedOnHistory(userHistory, taskType, context);

    // 3. 실시간 모델 상태 확인
    const healthyModels = await this.getHealthyModels(taskType, context.userTier);

    // 4. 비용 최적화
    const costOptimizedModels = this.optimizeForCost(healthyModels, context);

    // 5. 최종 결정
    const decision = await this.makeRoutingDecision(
      historicalChoice,
      healthyModels,
      costOptimizedModels,
      context
    );

    // 6. 결정 기록
    await this.recordRoutingDecision(userId, decision);

    return decision;
  }

  /**
   * 사용자 모델 사용 히스토리 업데이트
   */
  async updateUserModelHistory(
    userId: string,
    model: string,
    taskType: 'chat' | 'vision' | 'analysis',
    result: {
      success: boolean;
      responseTime: number;
      qualityScore: number;
      cost: number;
    }
  ): Promise<void> {
    let history = this.userHistories.get(userId);
    if (!history) {
      history = {
        userId,
        modelPreferences: new Map(),
        lastUpdated: new Date()
      };
      this.userHistories.set(userId, history);
    }

    const key = `${model}_${taskType}`;
    let preference = history.modelPreferences.get(key);
    
    if (!preference) {
      preference = {
        model,
        taskType,
        successRate: 0,
        avgResponseTime: 0,
        avgQualityScore: 0,
        usageCount: 0,
        lastUsed: new Date()
      };
    }

    // 지수 이동 평균으로 업데이트
    const alpha = 0.3; // 최근 데이터 가중치
    preference.successRate = (1 - alpha) * preference.successRate + alpha * (result.success ? 1 : 0);
    preference.avgResponseTime = (1 - alpha) * preference.avgResponseTime + alpha * result.responseTime;
    preference.avgQualityScore = (1 - alpha) * preference.avgQualityScore + alpha * result.qualityScore;
    preference.usageCount++;
    preference.lastUsed = new Date();

    history.modelPreferences.set(key, preference);
    history.lastUpdated = new Date();

    // DB에 저장
    await this.persistUserHistory(history);
  }

  /**
   * 모델 헬스 체크
   */
  private async checkModelHealth(model: string): Promise<ModelHealthStatus> {
    try {
      // 최근 1분간의 메트릭 조회
      const recentMetrics = await prisma.aIUsageLog.findMany({
        where: {
          model,
          timestamp: {
            gte: new Date(Date.now() - 60000)
          }
        },
        select: {
          success: true,
          responseTime: true,
          error: true
        }
      });

      if (recentMetrics.length === 0) {
        return {
          model,
          status: 'healthy',
          avgLatency: 0,
          errorRate: 0,
          throughput: 0,
          lastChecked: new Date()
        };
      }

      const errors = recentMetrics.filter(m => !m.success || m.error).length;
      const avgLatency = recentMetrics.reduce((sum, m) => sum + (m.responseTime || 0), 0) / recentMetrics.length;
      const errorRate = errors / recentMetrics.length;
      const throughput = recentMetrics.length; // per minute

      let status: 'healthy' | 'degraded' | 'unavailable' = 'healthy';
      if (errorRate > 0.5) status = 'unavailable';
      else if (errorRate > 0.1 || avgLatency > 5000) status = 'degraded';

      return {
        model,
        status,
        avgLatency,
        errorRate,
        throughput,
        lastChecked: new Date()
      };
    } catch (error) {
      console.error(`Health check failed for ${model}:`, error);
      return {
        model,
        status: 'unavailable',
        avgLatency: 0,
        errorRate: 1,
        throughput: 0,
        lastChecked: new Date()
      };
    }
  }

  /**
   * 실시간 헬스 모니터링
   */
  private startHealthMonitoring(): void {
    setInterval(async () => {
      const models = await this.getAllModels();
      
      for (const model of models) {
        const health = await this.checkModelHealth(model);
        this.modelHealthCache.set(model, health);
        
        // 심각한 문제 발생시 알림
        if (health.status === 'unavailable' && health.errorRate > 0.8) {
          console.error(`CRITICAL: Model ${model} is experiencing high failure rate (${(health.errorRate * 100).toFixed(1)}%)`);
          // TODO: 관리자 알림 전송
        }
      }
    }, this.HEALTH_CHECK_INTERVAL);
  }

  /**
   * A/B 테스트 오버라이드 확인
   */
  private async checkABTestOverride(
    userId: string,
    taskType: string,
    context: any
  ): Promise<RoutingDecision | null> {
    const abTestResult = await this.abTesting.getModelWithABTest(
      userId,
      '', // default model은 나중에 결정
      taskType as any,
      context
    );

    if (abTestResult.experimentId) {
      return {
        selectedModel: abTestResult.model,
        reason: 'A/B 테스트 진행 중',
        alternativeModels: [],
        confidenceScore: 1.0,
        metadata: {
          abTestOverride: true
        }
      };
    }

    return null;
  }

  /**
   * 사용자 히스토리 기반 선택
   */
  private selectBasedOnHistory(
    history: UserModelHistory | null,
    taskType: string,
    context: any
  ): string | null {
    if (!history || history.modelPreferences.size === 0) {
      return null;
    }

    // 해당 작업 유형의 선호 모델 찾기
    const relevantPreferences = Array.from(history.modelPreferences.values())
      .filter(p => p.taskType === taskType)
      .sort((a, b) => {
        // 점수 계산: 성공률 40%, 품질 40%, 속도 20%
        const scoreA = a.successRate * 0.4 + a.avgQualityScore * 0.4 + (1 - Math.min(a.avgResponseTime / 10000, 1)) * 0.2;
        const scoreB = b.successRate * 0.4 + b.avgQualityScore * 0.4 + (1 - Math.min(b.avgResponseTime / 10000, 1)) * 0.2;
        return scoreB - scoreA;
      });

    if (relevantPreferences.length > 0 && relevantPreferences[0].usageCount >= 3) {
      return relevantPreferences[0].model;
    }

    return null;
  }

  /**
   * 건강한 모델만 필터링
   */
  private async getHealthyModels(taskType: string, userTier: string): Promise<string[]> {
    const allModels = await this.getModelsForTier(userTier, taskType);
    
    return allModels.filter(model => {
      const health = this.modelHealthCache.get(model);
      return !health || health.status !== 'unavailable';
    });
  }

  /**
   * 비용 최적화
   */
  private optimizeForCost(models: string[], context: any): string[] {
    if (!context.costSensitive) {
      return models;
    }

    // 모델별 비용 정보 (실제로는 DB에서)
    const modelCosts: Record<string, number> = {
      'deepseek/deepseek-chat': 0.0001,
      'google/gemini-1.5-flash': 0.00035,
      'openai/gpt-3.5-turbo': 0.0015,
      'anthropic/claude-3-haiku': 0.00025,
      'openai/gpt-4-turbo': 0.01,
      'openai/gpt-4o': 0.005
    };

    return models.sort((a, b) => (modelCosts[a] || 0.001) - (modelCosts[b] || 0.001));
  }

  /**
   * 최종 라우팅 결정
   */
  private async makeRoutingDecision(
    historicalChoice: string | null,
    healthyModels: string[],
    costOptimizedModels: string[],
    context: any
  ): Promise<RoutingDecision> {
    let selectedModel: string;
    let reason: string;
    let confidenceScore = 0.8;
    const metadata: any = {};

    // 1. 사용자 선호 모델이 건강하면 사용
    if (historicalChoice && healthyModels.includes(historicalChoice)) {
      selectedModel = historicalChoice;
      reason = '사용자 선호 모델 (과거 성능 우수)';
      confidenceScore = 0.9;
      metadata.userPreference = true;
    }
    // 2. 긴급한 경우 가장 안정적인 모델
    else if (context.urgency === 'high') {
      selectedModel = this.getMostReliableModel(healthyModels);
      reason = '긴급 요청 - 가장 안정적인 모델 선택';
      confidenceScore = 0.85;
    }
    // 3. 비용 민감한 경우 가장 저렴한 모델
    else if (context.costSensitive && costOptimizedModels.length > 0) {
      selectedModel = costOptimizedModels[0];
      reason = '비용 최적화 모델';
      confidenceScore = 0.75;
      metadata.costOptimized = true;
    }
    // 4. 기본: 성능 기반 선택
    else {
      selectedModel = await this.selectByPerformance(healthyModels, context);
      reason = '성능 기반 최적 모델';
      confidenceScore = 0.8;
      metadata.performanceBased = true;
    }

    // 대안 모델 준비
    const alternativeModels = healthyModels
      .filter(m => m !== selectedModel)
      .slice(0, 2);

    return {
      selectedModel,
      reason,
      alternativeModels,
      confidenceScore,
      metadata
    };
  }

  /**
   * 가장 신뢰할 수 있는 모델 선택
   */
  private getMostReliableModel(models: string[]): string {
    let bestModel = models[0];
    let bestScore = 0;

    for (const model of models) {
      const health = this.modelHealthCache.get(model);
      if (!health) continue;

      const score = (1 - health.errorRate) * 0.7 + (1 - Math.min(health.avgLatency / 5000, 1)) * 0.3;
      if (score > bestScore) {
        bestScore = score;
        bestModel = model;
      }
    }

    return bestModel;
  }

  /**
   * 성능 기반 모델 선택
   */
  private async selectByPerformance(models: string[], context: any): Promise<string> {
    const performanceStats = await this.feedbackLearning.getModelPerformanceStats();
    
    let bestModel = models[0];
    let bestScore = 0;

    for (const model of models) {
      const stats = performanceStats.find(s => s.model === model);
      if (!stats) continue;

      // 복잡도에 따른 가중치 조정
      let complexityWeight = 1;
      if (context.taskComplexity === 'high') {
        complexityWeight = stats.avgAccuracyScore > 4 ? 1.5 : 0.8;
      }

      const score = (stats.avgAccuracyScore / 5) * 0.5 * complexityWeight +
                   stats.successRate * 0.3 +
                   (1 - Math.min(stats.avgResponseTime / 10000, 1)) * 0.2;

      if (score > bestScore) {
        bestScore = score;
        bestModel = model;
      }
    }

    return bestModel;
  }

  /**
   * 라우팅 결정 기록
   */
  private async recordRoutingDecision(userId: string, decision: RoutingDecision): Promise<void> {
    try {
      await prisma.routingDecision.create({
        data: {
          userId,
          selectedModel: decision.selectedModel,
          reason: decision.reason,
          confidenceScore: decision.confidenceScore,
          metadata: JSON.stringify(decision.metadata),
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to record routing decision:', error);
    }
  }

  /**
   * 유틸리티 함수들
   */
  private async getUserModelHistory(userId: string): Promise<UserModelHistory | null> {
    // 메모리 캐시 확인
    if (this.userHistories.has(userId)) {
      return this.userHistories.get(userId)!;
    }

    // DB에서 로드
    try {
      const history = await prisma.userModelHistory.findUnique({
        where: { userId }
      });

      if (history) {
        const parsed = {
          userId,
          modelPreferences: new Map(JSON.parse(history.preferences as string)),
          lastUpdated: history.updatedAt
        };
        this.userHistories.set(userId, parsed);
        return parsed;
      }
    } catch (error) {
      console.error('Failed to load user history:', error);
    }

    return null;
  }

  private async persistUserHistory(history: UserModelHistory): Promise<void> {
    try {
      await prisma.userModelHistory.upsert({
        where: { userId: history.userId },
        create: {
          userId: history.userId,
          preferences: JSON.stringify(Array.from(history.modelPreferences.entries()))
        },
        update: {
          preferences: JSON.stringify(Array.from(history.modelPreferences.entries())),
          updatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to persist user history:', error);
    }
  }

  private async getAllModels(): Promise<string[]> {
    const configs = await prisma.aIModelConfig.findMany({
      where: { isActive: true },
      select: { modelName: true }
    });
    return configs.map(c => c.modelName);
  }

  private async getModelsForTier(tier: string, taskType: string): Promise<string[]> {
    // Tier와 작업 유형에 따른 모델 목록 반환
    const tierModels = {
      TIER1: {
        chat: ['deepseek/deepseek-chat'],
        vision: ['google/gemini-1.5-flash'],
        analysis: ['openai/gpt-3.5-turbo']
      },
      TIER2: {
        chat: ['openai/gpt-3.5-turbo', 'anthropic/claude-3-haiku'],
        vision: ['google/gemini-1.5-flash', 'anthropic/claude-3-haiku'],
        analysis: ['openai/gpt-3.5-turbo', 'anthropic/claude-3-haiku']
      },
      TIER3: {
        chat: ['openai/gpt-4-turbo', 'anthropic/claude-3-opus'],
        vision: ['openai/gpt-4o', 'anthropic/claude-3-opus'],
        analysis: ['openai/gpt-4-turbo', 'anthropic/claude-3-opus']
      }
    };

    return tierModels[tier]?.[taskType] || tierModels.TIER1.chat;
  }

  /**
   * 대시보드용 라우팅 통계
   */
  async getRoutingStats(timeRange: { start: Date; end: Date }): Promise<{
    totalDecisions: number;
    modelDistribution: Record<string, number>;
    avgConfidence: number;
    reasonDistribution: Record<string, number>;
    performanceTrends: any[];
  }> {
    const decisions = await prisma.routingDecision.findMany({
      where: {
        timestamp: {
          gte: timeRange.start,
          lte: timeRange.end
        }
      }
    });

    const modelDistribution: Record<string, number> = {};
    const reasonDistribution: Record<string, number> = {};
    let totalConfidence = 0;

    decisions.forEach(d => {
      modelDistribution[d.selectedModel] = (modelDistribution[d.selectedModel] || 0) + 1;
      reasonDistribution[d.reason] = (reasonDistribution[d.reason] || 0) + 1;
      totalConfidence += d.confidenceScore;
    });

    return {
      totalDecisions: decisions.length,
      modelDistribution,
      avgConfidence: decisions.length > 0 ? totalConfidence / decisions.length : 0,
      reasonDistribution,
      performanceTrends: [] // TODO: 시계열 분석
    };
  }
}