/**
 * A/B 테스팅 프레임워크
 * AI 모델, 프롬프트, 파라미터 실험을 위한 시스템
 */

import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export interface Experiment {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  type: 'model' | 'prompt' | 'parameter' | 'feature';
  variants: ExperimentVariant[];
  targetAudience?: {
    tierRestriction?: string[];
    userPercentage?: number;
    specificUsers?: string[];
  };
  metrics: string[];
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExperimentVariant {
  id: string;
  name: string;
  description?: string;
  allocation: number; // 0-100 percentage
  config: {
    model?: string;
    prompt?: string;
    parameters?: Record<string, any>;
    features?: string[];
  };
  metrics?: {
    participants: number;
    conversions: number;
    avgQualityScore: number;
    avgResponseTime: number;
    avgCost: number;
  };
}

export interface ExperimentResult {
  experimentId: string;
  variantId: string;
  userId: string;
  sessionId: string;
  metrics: Record<string, any>;
  timestamp: Date;
}

export class ABTestingService {
  private activeExperiments: Map<string, Experiment> = new Map();

  /**
   * 실험 생성
   */
  async createExperiment(experiment: Omit<Experiment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Experiment> {
    // 할당 비율 검증
    const totalAllocation = experiment.variants.reduce((sum, v) => sum + v.allocation, 0);
    if (Math.abs(totalAllocation - 100) > 0.01) {
      throw new Error(`변형 할당 비율의 합이 100%여야 합니다. 현재: ${totalAllocation}%`);
    }

    const newExperiment: Experiment = {
      ...experiment,
      id: this.generateExperimentId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      variants: experiment.variants.map(v => ({
        ...v,
        id: this.generateVariantId(),
        metrics: {
          participants: 0,
          conversions: 0,
          avgQualityScore: 0,
          avgResponseTime: 0,
          avgCost: 0
        }
      }))
    };

    // DB에 저장
    await prisma.experiment.create({
      data: {
        id: newExperiment.id,
        name: newExperiment.name,
        description: newExperiment.description,
        status: newExperiment.status,
        type: newExperiment.type,
        variants: JSON.stringify(newExperiment.variants),
        targetAudience: JSON.stringify(newExperiment.targetAudience),
        metrics: newExperiment.metrics,
        startDate: newExperiment.startDate,
        endDate: newExperiment.endDate
      }
    });

    if (newExperiment.status === 'active') {
      this.activeExperiments.set(newExperiment.id, newExperiment);
    }

    return newExperiment;
  }

  /**
   * 사용자에게 실험 변형 할당
   */
  async assignVariant(
    userId: string,
    experimentType: 'model' | 'prompt' | 'parameter' | 'feature',
    context?: {
      userTier?: string;
      taskType?: string;
      sessionId?: string;
    }
  ): Promise<{
    experimentId: string;
    variantId: string;
    config: any;
  } | null> {
    // 활성 실험 중 해당 타입의 실험 찾기
    const eligibleExperiments = Array.from(this.activeExperiments.values())
      .filter(exp => exp.type === experimentType && exp.status === 'active')
      .filter(exp => this.isUserEligible(userId, exp, context));

    if (eligibleExperiments.length === 0) {
      return null;
    }

    // 첫 번째 적합한 실험 선택 (향후 복수 실험 지원 가능)
    const experiment = eligibleExperiments[0];

    // 기존 할당 확인
    const existingAssignment = await this.getExistingAssignment(userId, experiment.id);
    if (existingAssignment) {
      return existingAssignment;
    }

    // 새로운 변형 할당
    const variant = this.selectVariant(experiment, userId);
    
    // 할당 기록
    await prisma.experimentAssignment.create({
      data: {
        experimentId: experiment.id,
        variantId: variant.id,
        userId,
        assignedAt: new Date()
      }
    });

    return {
      experimentId: experiment.id,
      variantId: variant.id,
      config: variant.config
    };
  }

  /**
   * 실험 결과 기록
   */
  async recordResult(result: Omit<ExperimentResult, 'timestamp'>): Promise<void> {
    const experiment = this.activeExperiments.get(result.experimentId);
    if (!experiment) {
      console.warn(`실험 ${result.experimentId}을 찾을 수 없습니다.`);
      return;
    }

    // 결과 저장
    await prisma.experimentResult.create({
      data: {
        ...result,
        metrics: JSON.stringify(result.metrics),
        timestamp: new Date()
      }
    });

    // 실시간 메트릭 업데이트
    await this.updateVariantMetrics(result.experimentId, result.variantId, result.metrics);
  }

  /**
   * 실험 상태 변경
   */
  async updateExperimentStatus(
    experimentId: string,
    status: 'active' | 'paused' | 'completed'
  ): Promise<void> {
    await prisma.experiment.update({
      where: { id: experimentId },
      data: { status, updatedAt: new Date() }
    });

    if (status === 'active') {
      const experiment = await this.loadExperiment(experimentId);
      if (experiment) {
        this.activeExperiments.set(experimentId, experiment);
      }
    } else {
      this.activeExperiments.delete(experimentId);
    }
  }

  /**
   * 실험 결과 분석
   */
  async analyzeExperiment(experimentId: string): Promise<{
    experiment: Experiment;
    analysis: {
      variantId: string;
      sampleSize: number;
      conversionRate: number;
      avgQualityScore: number;
      avgResponseTime: number;
      avgCost: number;
      confidence: number;
      isSignificant: boolean;
      recommendation?: string;
    }[];
    winner?: string;
  }> {
    const experiment = await this.loadExperiment(experimentId);
    if (!experiment) {
      throw new Error(`실험 ${experimentId}을 찾을 수 없습니다.`);
    }

    const results = await prisma.experimentResult.findMany({
      where: { experimentId }
    });

    // 변형별 결과 집계
    const variantResults = new Map<string, any[]>();
    results.forEach(result => {
      if (!variantResults.has(result.variantId)) {
        variantResults.set(result.variantId, []);
      }
      variantResults.get(result.variantId)!.push({
        ...result,
        metrics: JSON.parse(result.metrics as string)
      });
    });

    // 분석 수행
    const analysis = experiment.variants.map(variant => {
      const results = variantResults.get(variant.id) || [];
      const sampleSize = results.length;

      if (sampleSize === 0) {
        return {
          variantId: variant.id,
          sampleSize: 0,
          conversionRate: 0,
          avgQualityScore: 0,
          avgResponseTime: 0,
          avgCost: 0,
          confidence: 0,
          isSignificant: false
        };
      }

      // 메트릭 계산
      const conversions = results.filter(r => r.metrics.converted).length;
      const conversionRate = conversions / sampleSize;
      const avgQualityScore = results.reduce((sum, r) => sum + (r.metrics.qualityScore || 0), 0) / sampleSize;
      const avgResponseTime = results.reduce((sum, r) => sum + (r.metrics.responseTime || 0), 0) / sampleSize;
      const avgCost = results.reduce((sum, r) => sum + (r.metrics.cost || 0), 0) / sampleSize;

      // 통계적 유의성 계산 (간단한 Z-test)
      const confidence = this.calculateConfidence(sampleSize, conversionRate);
      const isSignificant = confidence >= 0.95 && sampleSize >= 100;

      return {
        variantId: variant.id,
        sampleSize,
        conversionRate,
        avgQualityScore,
        avgResponseTime,
        avgCost,
        confidence,
        isSignificant,
        recommendation: this.getRecommendation(variant, conversionRate, avgQualityScore, avgCost)
      };
    });

    // 승자 결정
    const winner = this.determineWinner(analysis);

    return {
      experiment,
      analysis,
      winner
    };
  }

  /**
   * 사용자 적격성 확인
   */
  private isUserEligible(
    userId: string,
    experiment: Experiment,
    context?: any
  ): boolean {
    if (!experiment.targetAudience) {
      return true;
    }

    // Tier 제한 확인
    if (experiment.targetAudience.tierRestriction && context?.userTier) {
      if (!experiment.targetAudience.tierRestriction.includes(context.userTier)) {
        return false;
      }
    }

    // 특정 사용자 확인
    if (experiment.targetAudience.specificUsers) {
      return experiment.targetAudience.specificUsers.includes(userId);
    }

    // 사용자 비율 확인
    if (experiment.targetAudience.userPercentage) {
      const hash = this.hashUserId(userId);
      const bucket = parseInt(hash.substring(0, 8), 16) % 100;
      return bucket < experiment.targetAudience.userPercentage;
    }

    return true;
  }

  /**
   * 변형 선택 (결정적 할당)
   */
  private selectVariant(experiment: Experiment, userId: string): ExperimentVariant {
    const hash = this.hashUserId(userId + experiment.id);
    const bucket = parseInt(hash.substring(0, 8), 16) % 100;

    let accumulated = 0;
    for (const variant of experiment.variants) {
      accumulated += variant.allocation;
      if (bucket < accumulated) {
        return variant;
      }
    }

    // 안전장치: 마지막 변형 반환
    return experiment.variants[experiment.variants.length - 1];
  }

  /**
   * 사용자 ID 해싱
   */
  private hashUserId(userId: string): string {
    return crypto.createHash('md5').update(userId).digest('hex');
  }

  /**
   * 신뢰도 계산
   */
  private calculateConfidence(sampleSize: number, conversionRate: number): number {
    if (sampleSize < 30) return 0;
    
    // 간단한 신뢰구간 계산
    const standardError = Math.sqrt(conversionRate * (1 - conversionRate) / sampleSize);
    const zScore = 1.96; // 95% 신뢰수준
    const marginOfError = zScore * standardError;
    
    // 신뢰도를 0-1 범위로 변환
    return Math.max(0, Math.min(1, 1 - marginOfError));
  }

  /**
   * 변형별 권장사항 생성
   */
  private getRecommendation(
    variant: ExperimentVariant,
    conversionRate: number,
    qualityScore: number,
    cost: number
  ): string {
    const score = conversionRate * 0.4 + qualityScore * 0.4 - cost * 0.2;
    
    if (score > 0.8) {
      return `우수한 성능을 보이고 있습니다. ${variant.name} 채택을 고려하세요.`;
    } else if (score > 0.6) {
      return `양호한 성능입니다. 추가 데이터 수집을 권장합니다.`;
    } else {
      return `개선이 필요합니다. 다른 변형을 시도해보세요.`;
    }
  }

  /**
   * 승자 결정
   */
  private determineWinner(analysis: any[]): string | undefined {
    const significantResults = analysis.filter(a => a.isSignificant);
    if (significantResults.length === 0) return undefined;

    // 전환율과 품질 점수를 종합한 점수로 정렬
    const scored = significantResults.map(a => ({
      variantId: a.variantId,
      score: a.conversionRate * 0.5 + a.avgQualityScore * 0.5
    }));

    scored.sort((a, b) => b.score - a.score);
    
    return scored[0]?.variantId;
  }

  /**
   * 기존 할당 조회
   */
  private async getExistingAssignment(
    userId: string,
    experimentId: string
  ): Promise<any> {
    const assignment = await prisma.experimentAssignment.findFirst({
      where: { userId, experimentId }
    });

    if (!assignment) return null;

    const experiment = this.activeExperiments.get(experimentId);
    if (!experiment) return null;

    const variant = experiment.variants.find(v => v.id === assignment.variantId);
    if (!variant) return null;

    return {
      experimentId,
      variantId: variant.id,
      config: variant.config
    };
  }

  /**
   * 실험 로드
   */
  private async loadExperiment(experimentId: string): Promise<Experiment | null> {
    const data = await prisma.experiment.findUnique({
      where: { id: experimentId }
    });

    if (!data) return null;

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      status: data.status as any,
      type: data.type as any,
      variants: JSON.parse(data.variants as string),
      targetAudience: data.targetAudience ? JSON.parse(data.targetAudience as string) : undefined,
      metrics: data.metrics,
      startDate: data.startDate,
      endDate: data.endDate || undefined,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    };
  }

  /**
   * 변형 메트릭 업데이트
   */
  private async updateVariantMetrics(
    experimentId: string,
    variantId: string,
    metrics: Record<string, any>
  ): Promise<void> {
    // 실시간 업데이트 로직 (캐시 또는 스트리밍)
    console.log(`Updating metrics for variant ${variantId}:`, metrics);
  }

  /**
   * ID 생성 유틸리티
   */
  private generateExperimentId(): string {
    return `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateVariantId(): string {
    return `var_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 활성 실험 로드 (서비스 시작시)
   */
  async loadActiveExperiments(): Promise<void> {
    const activeExperiments = await prisma.experiment.findMany({
      where: { status: 'active' }
    });

    for (const exp of activeExperiments) {
      const experiment = await this.loadExperiment(exp.id);
      if (experiment) {
        this.activeExperiments.set(experiment.id, experiment);
      }
    }

    console.log(`${this.activeExperiments.size}개의 활성 실험을 로드했습니다.`);
  }
}