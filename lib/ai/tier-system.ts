export interface TierConfig {
  model: string;
  maxTokens: number;
  temperature: number;
  costPerToken: number;
  capabilities: string[];
  useCase: string;
  confidenceThreshold: number;
}

export const AI_TIERS: Record<string, TierConfig> = {
  TIER1: {
    model: 'mistralai/mistral-small-3.1', // OpenRouter 경유 - 저비용
    maxTokens: 1000,
    temperature: 0.7,
    costPerToken: 0.00015, // $0.15 per 1M tokens (OpenRouter 가격)
    capabilities: ['text-analysis', 'basic-formulas', 'simple-errors'],
    useCase: '기본 Excel 분석, 간단한 수식 오류 감지',
    confidenceThreshold: 0.85
  },
  TIER2: {
    model: 'openai/gpt-4', // OpenRouter 경유
    maxTokens: 2000,
    temperature: 0.7,
    costPerToken: 0.03, // $30 per 1M tokens (OpenRouter 가격)
    capabilities: ['text-analysis', 'complex-formulas', 'error-diagnosis', 'data-validation'],
    useCase: '복잡한 수식 분석, 데이터 검증, 오류 진단',
    confidenceThreshold: 0.80
  },
  TIER3: {
    model: 'openai/gpt-4-vision-preview', // OpenRouter 경유 - Vision 지원
    maxTokens: 4000,
    temperature: 0.8,
    costPerToken: 0.05, // $50 per 1M tokens (OpenRouter 가격, vision 포함)
    capabilities: ['text-analysis', 'complex-formulas', 'image-analysis', 'multi-modal', 'advanced-reasoning', 'visual-comparison'],
    useCase: 'Excel + 이미지 비교 분석, 시각적 차이점 감지, 고급 개선 제안',
    confidenceThreshold: 0.75
  }
};

// 시나리오별 티어 선택 로직
export interface AnalysisScenario {
  type: 'error-detection' | 'visual-comparison' | 'improvement-suggestion' | 'data-validation';
  hasImages: boolean;
  complexity: 'low' | 'medium' | 'high';
  requiresVisualAnalysis: boolean;
}

export class TierSelector {
  static selectTier(scenario: AnalysisScenario): keyof typeof AI_TIERS {
    // 이미지가 포함된 경우 무조건 TIER3
    if (scenario.hasImages && scenario.requiresVisualAnalysis) {
      return 'TIER3';
    }
    
    // 시나리오 타입별 티어 선택
    switch (scenario.type) {
      case 'error-detection':
        // 간단한 오류는 TIER1, 복잡한 오류는 TIER2
        return scenario.complexity === 'low' ? 'TIER1' : 'TIER2';
        
      case 'visual-comparison':
        // 시각적 비교는 항상 TIER3
        return 'TIER3';
        
      case 'improvement-suggestion':
        // 개선 제안은 복잡도에 따라 TIER2 또는 TIER3
        return scenario.complexity === 'high' ? 'TIER3' : 'TIER2';
        
      case 'data-validation':
        // 데이터 검증은 주로 TIER2
        return 'TIER2';
        
      default:
        return 'TIER1';
    }
  }
  
  static analyzeScenario(request: {
    type: string;
    hasExcel: boolean;
    hasImages: boolean;
    query?: string;
    excelErrors?: number;
  }): AnalysisScenario {
    const hasVisualComparison = request.hasImages && request.hasExcel;
    const hasComplexQuery = request.query && (
      request.query.includes('차트') || 
      request.query.includes('시각화') || 
      request.query.includes('개선') ||
      request.query.includes('비교')
    );
    
    // 복잡도 판단
    let complexity: 'low' | 'medium' | 'high' = 'low';
    if (request.excelErrors && request.excelErrors > 5) complexity = 'medium';
    if (hasComplexQuery || hasVisualComparison) complexity = 'high';
    
    // 시나리오 타입 결정
    let type: AnalysisScenario['type'] = 'error-detection';
    if (hasVisualComparison) {
      type = 'visual-comparison';
    } else if (hasComplexQuery) {
      type = 'improvement-suggestion';
    } else if (request.excelErrors && request.excelErrors > 0) {
      type = 'error-detection';
    }
    
    return {
      type,
      hasImages: request.hasImages,
      complexity,
      requiresVisualAnalysis: hasVisualComparison
    };
  }
}

// 티어별 프롬프트 최적화
export class TierPromptOptimizer {
  static optimizePrompt(tier: keyof typeof AI_TIERS, originalPrompt: string): string {
    switch (tier) {
      case 'TIER1':
        // 간단하고 직접적인 프롬프트
        return `간단히 분석해주세요: ${originalPrompt}`;
        
      case 'TIER2':
        // 상세한 분석 요청
        return `다음을 상세히 분석하고 해결책을 제시해주세요:\n${originalPrompt}`;
        
      case 'TIER3':
        // 고급 분석 및 비교
        return `전문가 수준으로 다음을 분석해주세요. 시각적 요소와 데이터를 비교하고, 구체적인 개선 방안을 제시해주세요:\n${originalPrompt}`;
        
      default:
        return originalPrompt;
    }
  }
}

// 비용 계산기
export class TierCostCalculator {
  static calculateCost(tier: keyof typeof AI_TIERS, tokens: number): number {
    const tierConfig = AI_TIERS[tier];
    return (tokens / 1000) * tierConfig.costPerToken;
  }
  
  static estimateTokens(text: string, imageCount: number = 0): number {
    // 텍스트: 대략 4글자당 1토큰
    const textTokens = Math.ceil(text.length / 4);
    
    // 이미지: 각 이미지당 약 1000토큰 (고해상도 기준)
    const imageTokens = imageCount * 1000;
    
    return textTokens + imageTokens;
  }
}

// 티어 업그레이드 로직
export class TierUpgradeManager {
  static shouldUpgrade(
    currentTier: keyof typeof AI_TIERS, 
    confidence: number,
    retryCount: number = 0
  ): { upgrade: boolean; nextTier?: keyof typeof AI_TIERS } {
    const tierConfig = AI_TIERS[currentTier];
    
    // 신뢰도가 임계값보다 낮으면 업그레이드
    if (confidence < tierConfig.confidenceThreshold) {
      switch (currentTier) {
        case 'TIER1':
          return { upgrade: true, nextTier: 'TIER2' };
        case 'TIER2':
          return { upgrade: true, nextTier: 'TIER3' };
        case 'TIER3':
          // 최고 티어에서도 신뢰도가 낮으면 재시도 권장
          return { upgrade: false };
      }
    }
    
    // 재시도 횟수가 2회 이상이면 업그레이드 고려
    if (retryCount >= 2 && currentTier !== 'TIER3') {
      return { 
        upgrade: true, 
        nextTier: currentTier === 'TIER1' ? 'TIER2' : 'TIER3' 
      };
    }
    
    return { upgrade: false };
  }
}