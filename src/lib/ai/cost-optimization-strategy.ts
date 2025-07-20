/**
 * AI 비용 최적화 전략
 * 모델 선택, 캐싱, 토큰 최적화 등을 통한 비용 절감
 */

import { prisma } from '@/lib/prisma';
import { AIModelManager } from './model-manager';
import { DynamicRoutingEnhancer } from './dynamic-routing-enhancer';
import { PromptOptimizer } from './prompt-optimizer';

export interface CostOptimizationConfig {
  maxMonthlyBudget: number;
  alertThreshold: number; // 예산의 몇 %에서 알림
  enableAggressiveOptimization: boolean;
  cachingStrategy: 'aggressive' | 'moderate' | 'minimal';
  tokenReductionTarget: number; // 0-1, 목표 토큰 감소율
}

export interface OptimizationResult {
  originalCost: number;
  optimizedCost: number;
  savings: number;
  savingsPercent: number;
  optimizationMethods: string[];
  recommendations: string[];
}

export interface TokenOptimizationResult {
  originalTokens: number;
  optimizedTokens: number;
  reduction: number;
  technique: string;
}

export class CostOptimizationStrategy {
  private modelManager: AIModelManager;
  private routingEnhancer: DynamicRoutingEnhancer;
  private promptOptimizer: PromptOptimizer;
  private responseCache: Map<string, CachedResponse> = new Map();
  private config: CostOptimizationConfig;

  constructor(config: CostOptimizationConfig) {
    this.config = config;
    this.modelManager = AIModelManager.getInstance();
    this.routingEnhancer = new DynamicRoutingEnhancer();
    this.promptOptimizer = new PromptOptimizer();
    this.startCacheCleanup();
  }

  /**
   * 요청 최적화
   */
  async optimizeRequest(request: {
    prompt: string;
    userId: string;
    taskType: string;
    userTier: string;
    context?: any;
  }): Promise<{
    optimizedPrompt: string;
    selectedModel: string;
    estimatedCost: number;
    optimizations: string[];
  }> {
    const optimizations: string[] = [];

    // 1. 캐시 확인
    const cacheKey = this.generateCacheKey(request.prompt, request.taskType);
    const cachedResponse = await this.checkCache(cacheKey);
    if (cachedResponse && this.isCacheValid(cachedResponse)) {
      optimizations.push('캐시에서 응답 반환');
      return {
        optimizedPrompt: request.prompt,
        selectedModel: 'cache',
        estimatedCost: 0,
        optimizations
      };
    }

    // 2. 프롬프트 최적화
    const promptResult = await this.promptOptimizer.optimizePrompt(request.prompt, {
      category: request.taskType,
      userTier: request.userTier
    });
    optimizations.push(...promptResult.improvements);

    // 3. 토큰 최적화
    const tokenOptimized = this.optimizeTokenUsage(promptResult.optimizedPrompt);
    if (tokenOptimized.reduction > 0) {
      optimizations.push(`토큰 ${tokenOptimized.reduction}개 감소 (${tokenOptimized.technique})`);
    }

    // 4. 모델 선택 최적화
    const routingDecision = await this.routingEnhancer.selectOptimalModel(
      request.userId,
      request.taskType as any,
      {
        ...request.context,
        userTier: request.userTier,
        costSensitive: true,
        taskComplexity: this.estimateComplexity(tokenOptimized.optimizedPrompt)
      }
    );

    // 5. 비용 추정
    const estimatedCost = await this.estimateCost(
      routingDecision.selectedModel,
      tokenOptimized.optimizedTokens
    );

    // 6. 예산 확인
    if (this.config.enableAggressiveOptimization) {
      const budgetCheck = await this.checkBudgetConstraints(estimatedCost);
      if (!budgetCheck.withinBudget) {
        // 더 저렴한 모델로 다운그레이드
        const cheaperModel = await this.findCheaperAlternative(
          routingDecision.selectedModel,
          request.taskType
        );
        if (cheaperModel) {
          optimizations.push(`예산 제약으로 ${cheaperModel}로 변경`);
          routingDecision.selectedModel = cheaperModel;
        }
      }
    }

    return {
      optimizedPrompt: tokenOptimized.optimizedPrompt,
      selectedModel: routingDecision.selectedModel,
      estimatedCost,
      optimizations
    };
  }

  /**
   * 응답 후처리 및 캐싱
   */
  async postProcessResponse(
    request: string,
    response: any,
    model: string,
    actualCost: number
  ): Promise<void> {
    // 캐시 저장
    if (this.shouldCache(response, actualCost)) {
      const cacheKey = this.generateCacheKey(request, response.taskType);
      await this.saveToCache(cacheKey, response, model, actualCost);
    }

    // 비용 추적
    await this.trackCost(model, actualCost);

    // 최적화 학습
    if (response.qualityScore > 0.8) {
      await this.learnFromSuccessfulOptimization(request, response, actualCost);
    }
  }

  /**
   * 토큰 사용 최적화
   */
  private optimizeTokenUsage(prompt: string): TokenOptimizationResult {
    let optimizedPrompt = prompt;
    let technique = '';
    
    // 1. 중복 제거
    const deduped = this.removeDuplicates(optimizedPrompt);
    if (deduped.length < optimizedPrompt.length) {
      optimizedPrompt = deduped;
      technique = '중복 제거';
    }

    // 2. 불필요한 공백 제거
    optimizedPrompt = optimizedPrompt.replace(/\s+/g, ' ').trim();
    
    // 3. 긴 설명 요약
    if (optimizedPrompt.length > 1000 && this.config.tokenReductionTarget > 0.2) {
      const summarized = this.summarizePrompt(optimizedPrompt);
      if (summarized.length < optimizedPrompt.length * 0.8) {
        optimizedPrompt = summarized;
        technique = technique ? `${technique}, 요약` : '요약';
      }
    }

    // 4. 구조 최적화
    if (optimizedPrompt.includes('\n\n\n')) {
      optimizedPrompt = optimizedPrompt.replace(/\n{3,}/g, '\n\n');
      technique = technique ? `${technique}, 구조 최적화` : '구조 최적화';
    }

    const originalTokens = this.estimateTokenCount(prompt);
    const optimizedTokens = this.estimateTokenCount(optimizedPrompt);

    return {
      originalTokens,
      optimizedTokens,
      reduction: originalTokens - optimizedTokens,
      technique: technique || '최적화 없음',
      optimizedPrompt
    };
  }

  /**
   * 월간 비용 분석 및 예측
   */
  async analyzeMonthlyCosts(): Promise<{
    currentMonthSpend: number;
    projectedMonthlySpend: number;
    topCostDrivers: Array<{ model: string; cost: number; percentage: number }>;
    savingsOpportunities: Array<{ method: string; potentialSavings: number }>;
    recommendations: string[];
  }> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // 현재 월 사용량
    const monthlyLogs = await prisma.aIUsageLog.findMany({
      where: {
        timestamp: { gte: startOfMonth }
      }
    });

    const currentMonthSpend = monthlyLogs.reduce((sum, log) => sum + (log.cost || 0), 0);
    const daysInMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0).getDate();
    const daysPassed = new Date().getDate();
    const projectedMonthlySpend = (currentMonthSpend / daysPassed) * daysInMonth;

    // 모델별 비용 분석
    const modelCosts = new Map<string, number>();
    monthlyLogs.forEach(log => {
      const current = modelCosts.get(log.model) || 0;
      modelCosts.set(log.model, current + (log.cost || 0));
    });

    const sortedCosts = Array.from(modelCosts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([model, cost]) => ({
        model,
        cost,
        percentage: (cost / currentMonthSpend) * 100
      }));

    // 절감 기회 분석
    const savingsOpportunities = await this.identifySavingsOpportunities(monthlyLogs);

    // 추천사항
    const recommendations = this.generateCostRecommendations(
      projectedMonthlySpend,
      this.config.maxMonthlyBudget,
      sortedCosts,
      savingsOpportunities
    );

    return {
      currentMonthSpend,
      projectedMonthlySpend,
      topCostDrivers: sortedCosts.slice(0, 5),
      savingsOpportunities,
      recommendations
    };
  }

  /**
   * 캐싱 전략
   */
  private async checkCache(key: string): Promise<CachedResponse | null> {
    // 메모리 캐시 확인
    const memCached = this.responseCache.get(key);
    if (memCached) return memCached;

    // DB 캐시 확인
    try {
      const dbCached = await prisma.aIResponseCache.findUnique({
        where: { cacheKey: key }
      });

      if (dbCached && this.isCacheValid(dbCached as any)) {
        const cached: CachedResponse = {
          response: JSON.parse(dbCached.response as string),
          model: dbCached.model,
          cost: dbCached.cost,
          timestamp: dbCached.createdAt,
          hitCount: dbCached.hitCount
        };
        
        // 메모리 캐시에도 저장
        this.responseCache.set(key, cached);
        
        // 히트 카운트 증가
        await prisma.aIResponseCache.update({
          where: { cacheKey: key },
          data: { hitCount: { increment: 1 } }
        });

        return cached;
      }
    } catch (error) {
      console.error('Cache check failed:', error);
    }

    return null;
  }

  private async saveToCache(
    key: string,
    response: any,
    model: string,
    cost: number
  ): Promise<void> {
    const cached: CachedResponse = {
      response,
      model,
      cost,
      timestamp: new Date(),
      hitCount: 0
    };

    // 메모리 캐시 저장
    if (this.responseCache.size > 1000) {
      // LRU 방식으로 오래된 항목 제거
      const oldestKey = Array.from(this.responseCache.entries())
        .sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime())[0][0];
      this.responseCache.delete(oldestKey);
    }
    this.responseCache.set(key, cached);

    // DB 캐시 저장
    try {
      await prisma.aIResponseCache.upsert({
        where: { cacheKey: key },
        create: {
          cacheKey: key,
          response: JSON.stringify(response),
          model,
          cost,
          expiresAt: new Date(Date.now() + this.getCacheTTL()),
          hitCount: 0
        },
        update: {
          response: JSON.stringify(response),
          model,
          cost,
          expiresAt: new Date(Date.now() + this.getCacheTTL()),
          updatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to save to cache:', error);
    }
  }

  /**
   * 절감 기회 식별
   */
  private async identifySavingsOpportunities(
    logs: any[]
  ): Promise<Array<{ method: string; potentialSavings: number }>> {
    const opportunities: Array<{ method: string; potentialSavings: number }> = [];

    // 1. 캐시 가능한 중복 요청
    const requestMap = new Map<string, number>();
    logs.forEach(log => {
      const key = this.generateCacheKey(log.prompt || '', log.taskType);
      requestMap.set(key, (requestMap.get(key) || 0) + 1);
    });

    const duplicateRequests = Array.from(requestMap.values()).filter(count => count > 1);
    const cacheSavings = duplicateRequests.reduce((sum, count) => {
      return sum + (count - 1) * 0.001; // 평균 요청 비용
    }, 0);

    if (cacheSavings > 0) {
      opportunities.push({
        method: '캐싱 강화',
        potentialSavings: cacheSavings
      });
    }

    // 2. 모델 다운그레이드 가능한 간단한 작업
    const simpleTasksWithExpensiveModels = logs.filter(log => {
      const isSimple = (log.promptTokens || 0) < 100;
      const isExpensive = log.cost > 0.01;
      return isSimple && isExpensive;
    });

    if (simpleTasksWithExpensiveModels.length > 0) {
      const downgraderavings = simpleTasksWithExpensiveModels.reduce(
        (sum, log) => sum + log.cost * 0.7, // 70% 절감 가능
        0
      );
      opportunities.push({
        method: '간단한 작업에 경제적 모델 사용',
        potentialSavings: downgraderavings
      });
    }

    // 3. 토큰 최적화
    const longPrompts = logs.filter(log => (log.promptTokens || 0) > 500);
    if (longPrompts.length > 0) {
      const tokenSavings = longPrompts.reduce(
        (sum, log) => sum + log.cost * 0.2, // 20% 절감 가능
        0
      );
      opportunities.push({
        method: '프롬프트 토큰 최적화',
        potentialSavings: tokenSavings
      });
    }

    // 4. 배치 처리
    const timeGroups = new Map<number, number>();
    logs.forEach(log => {
      const hour = new Date(log.timestamp).getHours();
      timeGroups.set(hour, (timeGroups.get(hour) || 0) + 1);
    });

    const peakHours = Array.from(timeGroups.entries())
      .filter(([_, count]) => count > 10)
      .map(([hour]) => hour);

    if (peakHours.length > 0) {
      opportunities.push({
        method: '피크 시간 배치 처리',
        potentialSavings: logs.length * 0.0005 // 배치 처리로 인한 절감
      });
    }

    return opportunities.sort((a, b) => b.potentialSavings - a.potentialSavings);
  }

  /**
   * 비용 추천사항 생성
   */
  private generateCostRecommendations(
    projectedSpend: number,
    budget: number,
    topCostDrivers: any[],
    opportunities: any[]
  ): string[] {
    const recommendations: string[] = [];

    // 예산 초과 경고
    if (projectedSpend > budget) {
      const overagePercent = ((projectedSpend - budget) / budget) * 100;
      recommendations.push(
        `⚠️ 예상 월간 지출이 예산을 ${overagePercent.toFixed(1)}% 초과합니다.`
      );
    }

    // 주요 비용 동인
    if (topCostDrivers[0]?.percentage > 50) {
      recommendations.push(
        `💡 ${topCostDrivers[0].model}이 전체 비용의 ${topCostDrivers[0].percentage.toFixed(1)}%를 차지합니다. 대체 모델 검토를 권장합니다.`
      );
    }

    // 절감 기회
    if (opportunities.length > 0) {
      const totalSavings = opportunities.reduce((sum, o) => sum + o.potentialSavings, 0);
      recommendations.push(
        `💰 최적화를 통해 월 $${totalSavings.toFixed(2)} 절감 가능합니다.`
      );
      
      // 상위 3개 기회
      opportunities.slice(0, 3).forEach(opp => {
        recommendations.push(`  - ${opp.method}: $${opp.potentialSavings.toFixed(2)} 절감`);
      });
    }

    // 캐싱 권장
    if (this.config.cachingStrategy === 'minimal') {
      recommendations.push(
        `🔄 캐싱 전략을 'moderate' 또는 'aggressive'로 변경하면 추가 비용 절감이 가능합니다.`
      );
    }

    return recommendations;
  }

  /**
   * 유틸리티 함수들
   */
  private generateCacheKey(prompt: string, taskType: string): string {
    // 프롬프트의 핵심 부분만 추출하여 캐시 키 생성
    const normalized = prompt.toLowerCase().trim();
    const hash = this.simpleHash(normalized);
    return `${taskType}:${hash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private isCacheValid(cached: CachedResponse): boolean {
    const ttl = this.getCacheTTL();
    const age = Date.now() - cached.timestamp.getTime();
    return age < ttl;
  }

  private getCacheTTL(): number {
    switch (this.config.cachingStrategy) {
      case 'aggressive':
        return 24 * 60 * 60 * 1000; // 24시간
      case 'moderate':
        return 4 * 60 * 60 * 1000; // 4시간
      case 'minimal':
        return 30 * 60 * 1000; // 30분
    }
  }

  private shouldCache(response: any, cost: number): boolean {
    // 비용이 높거나 품질이 좋은 응답만 캐싱
    return cost > 0.01 || response.qualityScore > 0.8;
  }

  private estimateTokenCount(text: string): number {
    // 간단한 토큰 추정 (실제로는 tiktoken 사용)
    return Math.ceil(text.length / 4);
  }

  private removeDuplicates(text: string): string {
    const sentences = text.split(/[.!?]/).map(s => s.trim()).filter(s => s);
    const unique = [...new Set(sentences)];
    return unique.join('. ') + '.';
  }

  private summarizePrompt(prompt: string): string {
    // 긴 프롬프트 요약 (실제로는 더 정교한 방법 사용)
    const lines = prompt.split('\n');
    if (lines.length > 10) {
      return lines.slice(0, 5).join('\n') + '\n...\n' + lines.slice(-3).join('\n');
    }
    return prompt;
  }

  private estimateComplexity(prompt: string): 'low' | 'medium' | 'high' {
    const tokenCount = this.estimateTokenCount(prompt);
    if (tokenCount < 100) return 'low';
    if (tokenCount < 500) return 'medium';
    return 'high';
  }

  private async estimateCost(model: string, tokens: number): Promise<number> {
    const modelConfig = await prisma.aIModelConfig.findFirst({
      where: { modelName: model }
    });
    
    if (!modelConfig) return 0.001; // 기본값
    
    return (tokens / 1000) * modelConfig.costPerCredit;
  }

  private async checkBudgetConstraints(estimatedCost: number): Promise<{
    withinBudget: boolean;
    remainingBudget: number;
  }> {
    const { currentMonthSpend } = await this.analyzeMonthlyCosts();
    const remainingBudget = this.config.maxMonthlyBudget - currentMonthSpend;
    
    return {
      withinBudget: estimatedCost <= remainingBudget * 0.1, // 단일 요청은 남은 예산의 10% 이하
      remainingBudget
    };
  }

  private async findCheaperAlternative(
    currentModel: string,
    taskType: string
  ): Promise<string | null> {
    const models = await prisma.aIModelConfig.findMany({
      where: {
        isActive: true,
        taskTypes: { has: taskType }
      },
      orderBy: { costPerCredit: 'asc' }
    });

    const currentConfig = models.find(m => m.modelName === currentModel);
    if (!currentConfig) return null;

    const cheaper = models.find(m => 
      m.costPerCredit < currentConfig.costPerCredit &&
      m.modelName !== currentModel
    );

    return cheaper?.modelName || null;
  }

  private async trackCost(model: string, cost: number): Promise<void> {
    // 비용 추적 (실시간 모니터링용)
    try {
      await prisma.aIUsageStats.create({
        data: {
          model,
          date: new Date(),
          totalCost: cost,
          requestCount: 1,
          avgResponseTime: 0,
          successRate: 1
        }
      });
    } catch (error) {
      console.error('Failed to track cost:', error);
    }
  }

  private async learnFromSuccessfulOptimization(
    prompt: string,
    response: any,
    cost: number
  ): Promise<void> {
    // 성공적인 최적화 패턴 학습
    await this.promptOptimizer.learnFromSuccessfulInteractions([{
      prompt,
      response: response.content,
      qualityScore: response.qualityScore,
      category: response.taskType
    }]);
  }

  private startCacheCleanup(): void {
    // 주기적으로 만료된 캐시 정리
    setInterval(async () => {
      try {
        await prisma.aIResponseCache.deleteMany({
          where: {
            expiresAt: { lt: new Date() }
          }
        });

        // 메모리 캐시도 정리
        for (const [key, cached] of this.responseCache.entries()) {
          if (!this.isCacheValid(cached)) {
            this.responseCache.delete(key);
          }
        }
      } catch (error) {
        console.error('Cache cleanup failed:', error);
      }
    }, 60 * 60 * 1000); // 1시간마다
  }
}

interface CachedResponse {
  response: any;
  model: string;
  cost: number;
  timestamp: Date;
  hitCount: number;
}

// 비용 최적화 헬퍼
export const costOptimizationHelpers = {
  /**
   * 기본 최적화 설정
   */
  getDefaultConfig(): CostOptimizationConfig {
    return {
      maxMonthlyBudget: 100,
      alertThreshold: 0.8,
      enableAggressiveOptimization: false,
      cachingStrategy: 'moderate',
      tokenReductionTarget: 0.2
    };
  },

  /**
   * 사용자 티어별 설정
   */
  getConfigByTier(tier: string): CostOptimizationConfig {
    switch (tier) {
      case 'TIER1':
        return {
          maxMonthlyBudget: 10,
          alertThreshold: 0.7,
          enableAggressiveOptimization: true,
          cachingStrategy: 'aggressive',
          tokenReductionTarget: 0.3
        };
      case 'TIER2':
        return {
          maxMonthlyBudget: 50,
          alertThreshold: 0.8,
          enableAggressiveOptimization: false,
          cachingStrategy: 'moderate',
          tokenReductionTarget: 0.2
        };
      case 'TIER3':
        return {
          maxMonthlyBudget: 500,
          alertThreshold: 0.9,
          enableAggressiveOptimization: false,
          cachingStrategy: 'minimal',
          tokenReductionTarget: 0.1
        };
      default:
        return this.getDefaultConfig();
    }
  }
};