/**
 * AI 시스템 통합 테스트
 * Rails 영감 받은 업그레이드 시스템 검증
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { 
  initializeAISystem, 
  aiHelpers,
  ABTestingService,
  PromptOptimizer,
  DynamicRoutingEnhancer,
  CostOptimizationStrategy,
  costOptimizationHelpers
} from '../index';

// 모의 Prisma 클라이언트
jest.mock('@/lib/prisma', () => ({
  prisma: {
    aIModelConfig: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'test-1',
          modelName: 'deepseek/deepseek-chat',
          provider: 'openrouter',
          isActive: true,
          priority: 1,
          taskTypes: ['chat'],
          maxTokens: 2000,
          temperature: 0.7,
          costPerCredit: 0.0001
        },
        {
          id: 'test-2',
          modelName: 'openai/gpt-3.5-turbo',
          provider: 'openai',
          isActive: true,
          priority: 2,
          taskTypes: ['chat'],
          maxTokens: 4000,
          temperature: 0.7,
          costPerCredit: 0.0015
        }
      ])
    },
    aIModelPolicy: {
      findFirst: jest.fn().mockResolvedValue(null)
    },
    experiment: {
      create: jest.fn().mockResolvedValue({
        id: 'test-experiment-1',
        name: 'Test Experiment',
        status: 'active'
      }),
      findMany: jest.fn().mockResolvedValue([])
    },
    promptTemplate: {
      create: jest.fn().mockResolvedValue({
        id: 'test-template-1',
        name: 'Test Template'
      })
    },
    aIUsageLog: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn()
    },
    aIResponseCache: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn()
    }
  }
}));

describe('AI 시스템 통합 테스트', () => {
  beforeAll(async () => {
    // AI 시스템 초기화
    await initializeAISystem();
  });

  describe('A/B 테스팅 프레임워크', () => {
    test('실험 생성 및 변형 할당', async () => {
      const abTesting = new ABTestingService();
      
      // 실험 생성
      const experiment = await abTesting.createExperiment({
        name: '모델 성능 비교',
        description: 'DeepSeek vs GPT-3.5 비교',
        status: 'active',
        type: 'model',
        variants: [
          {
            name: 'Control',
            allocation: 50,
            config: { model: 'deepseek/deepseek-chat' }
          },
          {
            name: 'Test',
            allocation: 50,
            config: { model: 'openai/gpt-3.5-turbo' }
          }
        ],
        metrics: ['conversionRate', 'qualityScore'],
        startDate: new Date()
      });

      expect(experiment).toBeDefined();
      expect(experiment.id).toBe('test-experiment-1');
    });

    test('변형 할당 균등성', async () => {
      const abTesting = new ABTestingService();
      const assignments = new Map<string, number>();
      
      // 100명의 사용자에게 변형 할당
      for (let i = 0; i < 100; i++) {
        const assignment = await abTesting.assignVariant(
          `user-${i}`,
          'model',
          {}
        );
        
        if (assignment) {
          const variant = assignment.variantId;
          assignments.set(variant, (assignments.get(variant) || 0) + 1);
        }
      }

      // 각 변형이 대략 균등하게 할당되었는지 확인
      const counts = Array.from(assignments.values());
      expect(Math.max(...counts) - Math.min(...counts)).toBeLessThan(20);
    });
  });

  describe('프롬프트 최적화 엔진', () => {
    test('프롬프트 구조 개선', async () => {
      const optimizer = new PromptOptimizer();
      
      const result = await optimizer.optimizePrompt(
        'Excel 파일에서 오류를 찾아주세요 그리고 수정 방법을 알려주세요',
        { category: 'error_analysis' }
      );

      expect(result.optimizedPrompt).toBeDefined();
      expect(result.improvements.length).toBeGreaterThan(0);
      expect(result.expectedQualityImprovement).toBeGreaterThan(0);
    });

    test('템플릿 생성 및 적용', async () => {
      const optimizer = new PromptOptimizer();
      
      const template = await optimizer.createTemplate({
        name: '수식 오류 분석',
        category: 'error_analysis',
        language: 'ko',
        template: 'Excel 파일에서 {{question}}\n\n다음을 확인해주세요:\n1. 수식 오류\n2. 참조 오류\n3. 데이터 타입 오류',
        variables: ['question'],
        isActive: true
      });

      expect(template).toBeDefined();
      expect(template.id).toBe('test-template-1');
    });
  });

  describe('동적 모델 라우팅', () => {
    test('사용자별 최적 모델 선택', async () => {
      const router = new DynamicRoutingEnhancer();
      
      const decision = await router.selectOptimalModel(
        'test-user-1',
        'chat',
        {
          userTier: 'TIER1',
          taskComplexity: 'low',
          urgency: 'normal',
          costSensitive: true
        }
      );

      expect(decision).toBeDefined();
      expect(decision.selectedModel).toBeDefined();
      expect(decision.reason).toBeDefined();
      expect(decision.confidenceScore).toBeGreaterThan(0);
    });

    test('모델 히스토리 업데이트', async () => {
      const router = new DynamicRoutingEnhancer();
      
      await router.updateUserModelHistory(
        'test-user-1',
        'deepseek/deepseek-chat',
        'chat',
        {
          success: true,
          responseTime: 1500,
          qualityScore: 0.85,
          cost: 0.001
        }
      );

      // 두 번째 선택시 히스토리 반영 확인
      const secondDecision = await router.selectOptimalModel(
        'test-user-1',
        'chat',
        {
          userTier: 'TIER1',
          taskComplexity: 'low',
          urgency: 'normal',
          costSensitive: false
        }
      );

      expect(secondDecision.metadata?.userPreference).toBeDefined();
    });
  });

  describe('비용 최적화 전략', () => {
    test('요청 최적화', async () => {
      const config = costOptimizationHelpers.getConfigByTier('TIER1');
      const optimizer = new CostOptimizationStrategy(config);
      
      const result = await optimizer.optimizeRequest({
        prompt: 'Excel 파일의 A1:Z100 범위에서 모든 수식 오류를 찾아서 상세하게 분석하고 각각의 해결 방법을 단계별로 설명해주세요.',
        userId: 'test-user-1',
        taskType: 'error_analysis',
        userTier: 'TIER1'
      });

      expect(result.optimizations.length).toBeGreaterThan(0);
      expect(result.estimatedCost).toBeGreaterThan(0);
      expect(result.optimizedPrompt.length).toBeLessThanOrEqual(result.prompt.length);
    });

    test('캐싱 전략', async () => {
      const config = {
        ...costOptimizationHelpers.getDefaultConfig(),
        cachingStrategy: 'aggressive' as const
      };
      const optimizer = new CostOptimizationStrategy(config);
      
      // 첫 번째 요청
      const first = await optimizer.optimizeRequest({
        prompt: '간단한 질문',
        userId: 'test-user-1',
        taskType: 'general',
        userTier: 'TIER1'
      });

      // 응답 캐싱
      await optimizer.postProcessResponse(
        first.optimizedPrompt,
        { content: '답변', qualityScore: 0.9 },
        'test-model',
        0.001
      );

      // 두 번째 동일 요청 (캐시 히트 예상)
      const second = await optimizer.optimizeRequest({
        prompt: '간단한 질문',
        userId: 'test-user-1',
        taskType: 'general',
        userTier: 'TIER1'
      });

      expect(second.estimatedCost).toBe(0);
      expect(second.selectedModel).toBe('cache');
    });
  });

  describe('통합 워크플로우', () => {
    test('Excel 분석 전체 플로우', async () => {
      const result = await aiHelpers.analyzeExcel({
        type: 'text',
        content: 'Excel 수식 오류를 분석해주세요',
        userId: 'test-user-1',
        userTier: 'TIER2'
      });

      expect(result).toBeDefined();
      expect(result.metadata?.optimizations).toBeDefined();
      expect(result.metadata?.selectedModel).toBeDefined();
    });

    test('대시보드 데이터 조회', async () => {
      const dashboardData = await aiHelpers.getDashboardData({
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date()
      });

      expect(dashboardData).toBeDefined();
      expect(dashboardData.overview).toBeDefined();
      expect(dashboardData.modelPerformance).toBeDefined();
      expect(dashboardData.abTestResults).toBeDefined();
      expect(dashboardData.costAnalysis).toBeDefined();
    });

    test('비용 분석 리포트', async () => {
      const costReport = await aiHelpers.getCostAnalysis();

      expect(costReport).toBeDefined();
      expect(costReport.currentMonthSpend).toBeDefined();
      expect(costReport.projectedMonthlySpend).toBeDefined();
      expect(costReport.savingsOpportunities).toBeDefined();
      expect(costReport.recommendations).toBeDefined();
    });
  });

  describe('성능 및 확장성', () => {
    test('동시 요청 처리', async () => {
      const promises = [];
      
      // 10개의 동시 요청
      for (let i = 0; i < 10; i++) {
        promises.push(
          aiHelpers.analyzeExcel({
            type: 'text',
            content: `요청 ${i}: Excel 분석`,
            userId: `user-${i}`,
            userTier: 'TIER1'
          })
        );
      }

      const results = await Promise.all(promises);
      expect(results.length).toBe(10);
      expect(results.every(r => r !== null)).toBe(true);
    });

    test('메모리 사용 최적화', () => {
      // 메모리 사용량 체크 (실제 환경에서는 process.memoryUsage() 사용)
      const used = process.memoryUsage();
      expect(used.heapUsed).toBeLessThan(200 * 1024 * 1024); // 200MB 이하
    });
  });
});

// 에러 케이스 테스트
describe('에러 처리', () => {
  test('잘못된 모델 선택 처리', async () => {
    const router = new DynamicRoutingEnhancer();
    
    const decision = await router.selectOptimalModel(
      'test-user',
      'invalid-type' as any,
      {
        userTier: 'INVALID_TIER',
        taskComplexity: 'low',
        urgency: 'normal',
        costSensitive: true
      }
    );

    // 폴백 모델이 선택되어야 함
    expect(decision.selectedModel).toBeDefined();
    expect(decision.alternativeModels.length).toBeGreaterThan(0);
  });

  test('프롬프트 최적화 실패 처리', async () => {
    const optimizer = new PromptOptimizer();
    
    const result = await optimizer.optimizePrompt(
      '', // 빈 프롬프트
      { category: 'unknown' }
    );

    // 기본 처리가 되어야 함
    expect(result.optimizedPrompt).toBeDefined();
    expect(result.optimizedPrompt.length).toBeGreaterThan(0);
  });
});