/**
 * A/B 테스팅 시스템 통합 헬퍼
 * 기존 AI 서비스와 A/B 테스팅을 연결
 */

import { ABTestingService } from './ab-testing-service';
import { MultimodalFallbackService } from './multimodal-fallback';
import { EnhancedAnalysisService } from './enhanced-analysis-service';

export class ABTestingIntegration {
  private abTesting: ABTestingService;
  private static instance: ABTestingIntegration;

  private constructor() {
    this.abTesting = new ABTestingService();
  }

  static getInstance(): ABTestingIntegration {
    if (!this.instance) {
      this.instance = new ABTestingIntegration();
    }
    return this.instance;
  }

  /**
   * 모델 선택시 A/B 테스트 적용
   */
  async getModelWithABTest(
    userId: string,
    defaultModel: string,
    taskType: 'chat' | 'vision',
    context?: any
  ): Promise<{
    model: string;
    experimentId?: string;
    variantId?: string;
  }> {
    const assignment = await this.abTesting.assignVariant(
      userId,
      'model',
      {
        ...context,
        taskType
      }
    );

    if (assignment?.config.model) {
      return {
        model: assignment.config.model,
        experimentId: assignment.experimentId,
        variantId: assignment.variantId
      };
    }

    return { model: defaultModel };
  }

  /**
   * 프롬프트 A/B 테스트
   */
  async getPromptWithABTest(
    userId: string,
    defaultPrompt: string,
    context?: any
  ): Promise<{
    prompt: string;
    experimentId?: string;
    variantId?: string;
  }> {
    const assignment = await this.abTesting.assignVariant(
      userId,
      'prompt',
      context
    );

    if (assignment?.config.prompt) {
      return {
        prompt: assignment.config.prompt,
        experimentId: assignment.experimentId,
        variantId: assignment.variantId
      };
    }

    return { prompt: defaultPrompt };
  }

  /**
   * 파라미터 A/B 테스트
   */
  async getParametersWithABTest(
    userId: string,
    defaultParams: Record<string, any>,
    context?: any
  ): Promise<{
    parameters: Record<string, any>;
    experimentId?: string;
    variantId?: string;
  }> {
    const assignment = await this.abTesting.assignVariant(
      userId,
      'parameter',
      context
    );

    if (assignment?.config.parameters) {
      return {
        parameters: { ...defaultParams, ...assignment.config.parameters },
        experimentId: assignment.experimentId,
        variantId: assignment.variantId
      };
    }

    return { parameters: defaultParams };
  }

  /**
   * 분석 결과에 A/B 테스트 메트릭 기록
   */
  async recordAnalysisMetrics(
    analysisResult: any,
    experimentInfo?: {
      experimentId: string;
      variantId: string;
    }
  ): Promise<void> {
    if (!experimentInfo) return;

    const metrics = {
      converted: analysisResult.success,
      qualityScore: analysisResult.confidence || 0,
      responseTime: analysisResult.metadata?.processingTime || 0,
      cost: analysisResult.metadata?.totalCost || 0,
      modelUsed: analysisResult.metadata?.modelUsed,
      userSatisfaction: analysisResult.feedback?.rating
    };

    await this.abTesting.recordResult({
      experimentId: experimentInfo.experimentId,
      variantId: experimentInfo.variantId,
      userId: analysisResult.userId || 'anonymous',
      sessionId: analysisResult.sessionId || 'default',
      metrics
    });
  }

  /**
   * 실험 생성 헬퍼
   */
  async createModelExperiment(config: {
    name: string;
    description: string;
    controlModel: string;
    testModels: Array<{ model: string; allocation: number }>;
    targetTiers?: string[];
    duration?: number; // days
  }): Promise<string> {
    const experiment = await this.abTesting.createExperiment({
      name: config.name,
      description: config.description,
      status: 'active',
      type: 'model',
      variants: [
        {
          name: 'Control',
          description: `기본 모델: ${config.controlModel}`,
          allocation: 100 - config.testModels.reduce((sum, m) => sum + m.allocation, 0),
          config: { model: config.controlModel }
        },
        ...config.testModels.map((tm, index) => ({
          name: `Test ${index + 1}`,
          description: `테스트 모델: ${tm.model}`,
          allocation: tm.allocation,
          config: { model: tm.model }
        }))
      ],
      targetAudience: config.targetTiers ? {
        tierRestriction: config.targetTiers
      } : undefined,
      metrics: ['conversionRate', 'qualityScore', 'responseTime', 'cost'],
      startDate: new Date(),
      endDate: config.duration ? 
        new Date(Date.now() + config.duration * 24 * 60 * 60 * 1000) : 
        undefined
    });

    return experiment.id;
  }

  /**
   * 프롬프트 실험 생성 헬퍼
   */
  async createPromptExperiment(config: {
    name: string;
    description: string;
    basePrompt: string;
    variations: Array<{
      name: string;
      prompt: string;
      allocation: number;
    }>;
    modelFilter?: string;
  }): Promise<string> {
    const experiment = await this.abTesting.createExperiment({
      name: config.name,
      description: config.description,
      status: 'active',
      type: 'prompt',
      variants: [
        {
          name: 'Control',
          description: '기본 프롬프트',
          allocation: 100 - config.variations.reduce((sum, v) => sum + v.allocation, 0),
          config: { prompt: config.basePrompt }
        },
        ...config.variations.map(v => ({
          name: v.name,
          description: `변형 프롬프트: ${v.name}`,
          allocation: v.allocation,
          config: { prompt: v.prompt }
        }))
      ],
      metrics: ['conversionRate', 'qualityScore', 'userSatisfaction'],
      startDate: new Date()
    });

    return experiment.id;
  }

  /**
   * 실험 대시보드 데이터
   */
  async getExperimentDashboard(): Promise<{
    activeExperiments: any[];
    recentResults: any[];
    recommendations: string[];
  }> {
    // TODO: 실제 구현
    return {
      activeExperiments: [],
      recentResults: [],
      recommendations: []
    };
  }
}

// 사용 예시를 위한 유틸리티 함수들
export const abTestingHelpers = {
  /**
   * 향상된 분석 서비스에 A/B 테스팅 적용
   */
  async analyzeWithABTesting(
    request: any,
    analysisService: EnhancedAnalysisService
  ): Promise<any> {
    const integration = ABTestingIntegration.getInstance();
    
    // 모델 A/B 테스트
    const modelTest = await integration.getModelWithABTest(
      request.userId,
      'default-model',
      request.type === 'image' ? 'vision' : 'chat',
      { userTier: request.userTier }
    );

    // 프롬프트 A/B 테스트 (텍스트 분석인 경우)
    let promptTest;
    if (request.type === 'text' && request.query) {
      promptTest = await integration.getPromptWithABTest(
        request.userId,
        request.query,
        { userTier: request.userTier }
      );
      request.query = promptTest.prompt;
    }

    // 분석 수행
    const result = await analysisService.analyze(request);

    // A/B 테스트 메트릭 기록
    if (modelTest.experimentId) {
      await integration.recordAnalysisMetrics(result, {
        experimentId: modelTest.experimentId,
        variantId: modelTest.variantId!
      });
    }

    if (promptTest?.experimentId) {
      await integration.recordAnalysisMetrics(result, {
        experimentId: promptTest.experimentId,
        variantId: promptTest.variantId!
      });
    }

    return result;
  },

  /**
   * 일반적인 모델 실험 시작
   */
  async startCommonExperiments(): Promise<void> {
    const integration = ABTestingIntegration.getInstance();

    // 1. Gemini vs Claude 비교 (Tier 2)
    await integration.createModelExperiment({
      name: 'Gemini vs Claude - Tier 2 Vision',
      description: 'Tier 2 사용자를 위한 Vision 모델 성능 비교',
      controlModel: 'google/gemini-1.5-flash',
      testModels: [
        { model: 'anthropic/claude-3-haiku', allocation: 30 }
      ],
      targetTiers: ['TIER2'],
      duration: 14 // 2주
    });

    // 2. GPT-3.5 vs DeepSeek 비교 (Tier 1)
    await integration.createModelExperiment({
      name: 'Budget Chat Model Comparison',
      description: 'Tier 1 사용자를 위한 경제적인 채팅 모델 비교',
      controlModel: 'deepseek/deepseek-chat',
      testModels: [
        { model: 'openai/gpt-3.5-turbo', allocation: 20 }
      ],
      targetTiers: ['TIER1'],
      duration: 7
    });

    // 3. 프롬프트 최적화 실험
    await integration.createPromptExperiment({
      name: 'Excel Error Analysis Prompt Optimization',
      description: 'Excel 오류 분석을 위한 프롬프트 최적화',
      basePrompt: 'Excel 스크린샷을 분석하고 오류를 찾아주세요.',
      variations: [
        {
          name: '구조화된 프롬프트',
          prompt: `Excel 스크린샷을 분석해주세요:
1. 발견된 오류와 위치
2. 오류 원인
3. 해결 방법
4. 예방 조치`,
          allocation: 25
        },
        {
          name: '전문가 프롬프트',
          prompt: '당신은 20년 경력의 Excel 전문가입니다. 제공된 스크린샷을 면밀히 분석하여 모든 오류를 찾고 전문적인 해결책을 제시해주세요.',
          allocation: 25
        }
      ]
    });

    console.log('기본 A/B 테스트 실험이 시작되었습니다.');
  }
};