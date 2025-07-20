/**
 * AI 시스템 통합 인덱스
 * 모든 AI 관련 서비스와 유틸리티를 중앙에서 관리
 */

// 핵심 서비스
export { AIModelManager } from './model-manager';
export { EnhancedAnalysisService } from './enhanced-analysis-service';
export { MultimodalFallbackService } from './multimodal-fallback';
export { FeedbackLearningService } from './feedback-learning';

// Rails 영감 받은 업그레이드 시스템
export { ABTestingService } from './ab-testing-service';
export { ABTestingIntegration, abTestingHelpers } from './ab-testing-integration';
export { PromptOptimizer, promptHelpers } from './prompt-optimizer';
export { DynamicRoutingEnhancer } from './dynamic-routing-enhancer';
export { PerformanceDashboard, dashboardUtils } from './performance-dashboard';
export { CostOptimizationStrategy, costOptimizationHelpers } from './cost-optimization-strategy';

// 프로바이더
export * from './providers';

// 타입 정의
export * from './types';

// 통합 초기화 함수
export async function initializeAISystem(): Promise<void> {
  const { AIModelManager } = await import('./model-manager');
  const { FeedbackLearningService } = await import('./feedback-learning');
  const { ABTestingIntegration, abTestingHelpers } = await import('./ab-testing-integration');
  
  // AI 모델 매니저 초기화
  const modelManager = AIModelManager.getInstance();
  await modelManager.initialize();
  
  // 피드백 학습 서비스 초기화
  const feedbackService = new FeedbackLearningService();
  
  // 기본 A/B 테스트 실험 시작 (선택적)
  if (process.env.ENABLE_AB_TESTING === 'true') {
    await abTestingHelpers.startCommonExperiments();
  }
  
  console.log('AI 시스템이 성공적으로 초기화되었습니다.');
}

// 편의 함수들
export const aiHelpers = {
  /**
   * 향상된 Excel 분석 요청
   */
  async analyzeExcel(request: {
    type: 'text' | 'image';
    content: string | Buffer;
    userId: string;
    userTier?: string;
    options?: any;
  }) {
    const { EnhancedAnalysisService } = await import('./enhanced-analysis-service');
    const { ABTestingIntegration } = await import('./ab-testing-integration');
    const { CostOptimizationStrategy, costOptimizationHelpers } = await import('./cost-optimization-strategy');
    
    const analysisService = new EnhancedAnalysisService();
    const abTesting = ABTestingIntegration.getInstance();
    const costOptimizer = new CostOptimizationStrategy(
      costOptimizationHelpers.getConfigByTier(request.userTier || 'TIER1')
    );
    
    // 비용 최적화 적용
    const optimized = await costOptimizer.optimizeRequest({
      prompt: request.type === 'text' ? request.content as string : 'Excel 이미지 분석',
      userId: request.userId,
      taskType: 'excel_analysis',
      userTier: request.userTier || 'TIER1',
      context: request.options
    });
    
    // A/B 테스팅 적용
    const modelTest = await abTesting.getModelWithABTest(
      request.userId,
      optimized.selectedModel,
      request.type === 'image' ? 'vision' : 'chat',
      { userTier: request.userTier }
    );
    
    // 분석 수행
    const result = await analysisService.analyze({
      ...request,
      query: request.type === 'text' ? optimized.optimizedPrompt : undefined,
      metadata: {
        ...request.options,
        selectedModel: modelTest.model,
        experimentId: modelTest.experimentId,
        variantId: modelTest.variantId,
        optimizations: optimized.optimizations
      }
    });
    
    // A/B 테스트 메트릭 기록
    if (modelTest.experimentId) {
      await abTesting.recordAnalysisMetrics(result, {
        experimentId: modelTest.experimentId,
        variantId: modelTest.variantId!
      });
    }
    
    // 비용 최적화 후처리
    await costOptimizer.postProcessResponse(
      optimized.optimizedPrompt,
      result,
      modelTest.model,
      result.metadata?.totalCost || 0
    );
    
    return result;
  },
  
  /**
   * 대시보드 데이터 가져오기
   */
  async getDashboardData(timeRange?: { start: Date; end: Date }) {
    const { PerformanceDashboard } = await import('./performance-dashboard');
    const dashboard = new PerformanceDashboard();
    return dashboard.getDashboardMetrics(timeRange);
  },
  
  /**
   * 비용 분석 리포트
   */
  async getCostAnalysis() {
    const { CostOptimizationStrategy, costOptimizationHelpers } = await import('./cost-optimization-strategy');
    const optimizer = new CostOptimizationStrategy(costOptimizationHelpers.getDefaultConfig());
    return optimizer.analyzeMonthlyCosts();
  },
  
  /**
   * 피드백 제출
   */
  async submitFeedback(feedback: {
    sessionId: string;
    rating: number;
    accuracy: number;
    usefulness: number;
    comments?: string;
  }) {
    const { FeedbackLearningService } = await import('./feedback-learning');
    const feedbackService = new FeedbackLearningService();
    await feedbackService.recordFeedback(feedback);
  }
};

// 기본 내보내기
export default {
  initializeAISystem,
  aiHelpers
};