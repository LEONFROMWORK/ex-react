/**
 * 향상된 AI Tier 설정 시스템
 * Vision과 Chat 모델을 분리하여 효율적인 비용 관리
 */

export interface TierConfiguration {
  chat: {
    models: string[];
    defaultModel: string;
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
  };
  vision: {
    models: string[];
    defaultModel: string;
    imageDetail: 'low' | 'high' | 'auto';
    maxImages: number;
    ocrMode: boolean;
    temperature: number;
    maxTokens: number;
  };
  routing: {
    useVisionForScreenshots: boolean;
    fallbackToChatOnly: boolean;
    hybridProcessing: boolean;
    qualityThreshold: number;
  };
  limits: {
    maxFileSize: number; // MB
    maxCellsPerRequest: number;
    maxComplexity: 'low' | 'medium' | 'high' | 'unlimited';
    maxRetries: number;
    timeout: number; // ms
  };
  features: string[];
  costLimits?: {
    maxCostPerRequest?: number; // USD
    dailyLimit?: number; // USD
    monthlyLimit?: number; // USD
  };
}

export const ENHANCED_TIER_CONFIGS: Record<string, TierConfiguration> = {
  TIER1: {
    chat: {
      models: ['deepseek/deepseek-chat', 'mistralai/mistral-7b-instruct'],
      defaultModel: 'deepseek/deepseek-chat',
      temperature: 0.7,
      maxTokens: 1000,
      systemPrompt: '당신은 Excel 전문가입니다. 사용자의 질문에 간단명료하게 답변해주세요.'
    },
    vision: {
      models: ['google/gemini-1.5-flash', 'google/gemini-1.5-flash-8b'],
      defaultModel: 'google/gemini-1.5-flash',
      imageDetail: 'auto',
      maxImages: 1,
      ocrMode: true,
      temperature: 0.3,
      maxTokens: 1500
    },
    routing: {
      useVisionForScreenshots: true,
      fallbackToChatOnly: true,
      hybridProcessing: false,
      qualityThreshold: 0.7
    },
    limits: {
      maxFileSize: 10,
      maxCellsPerRequest: 1000,
      maxComplexity: 'medium',
      maxRetries: 1,
      timeout: 10000
    },
    features: [
      'basic_qa',
      'simple_formulas',
      'basic_error_detection',
      'ocr',
      'simple_charts'
    ],
    costLimits: {
      maxCostPerRequest: 0.01,
      dailyLimit: 1.0,
      monthlyLimit: 20.0
    }
  },

  TIER2: {
    chat: {
      models: ['openai/gpt-3.5-turbo', 'anthropic/claude-3-haiku'],
      defaultModel: 'openai/gpt-3.5-turbo',
      temperature: 0.5,
      maxTokens: 2000,
      systemPrompt: '당신은 고급 Excel 전문가입니다. 복잡한 문제에 대해 단계별 해결책을 제시해주세요.'
    },
    vision: {
      models: [
        'google/gemini-1.5-flash',
        'anthropic/claude-3-haiku',
        'openai/gpt-4o-mini'
      ],
      defaultModel: 'google/gemini-1.5-flash',
      imageDetail: 'high',
      maxImages: 5,
      ocrMode: true,
      temperature: 0.3,
      maxTokens: 2000
    },
    routing: {
      useVisionForScreenshots: true,
      fallbackToChatOnly: true,
      hybridProcessing: true,
      qualityThreshold: 0.75
    },
    limits: {
      maxFileSize: 50,
      maxCellsPerRequest: 10000,
      maxComplexity: 'high',
      maxRetries: 2,
      timeout: 20000
    },
    features: [
      ...TIER1.features,
      'complex_analysis',
      'multi_step_solutions',
      'advanced_formulas',
      'multi_sheet_analysis',
      'detailed_error_analysis',
      'formula_extraction',
      'chart_recommendations'
    ],
    costLimits: {
      maxCostPerRequest: 0.05,
      dailyLimit: 5.0,
      monthlyLimit: 100.0
    }
  },

  TIER3: {
    chat: {
      models: [
        'openai/gpt-4-turbo',
        'openai/gpt-4-turbo-preview',
        'anthropic/claude-3-opus'
      ],
      defaultModel: 'openai/gpt-4-turbo',
      temperature: 0.3,
      maxTokens: 4000,
      systemPrompt: '당신은 최고 수준의 Excel 및 데이터 분석 전문가입니다. 엔터프라이즈 수준의 복잡한 문제를 해결하고, 맞춤형 솔루션을 제공해주세요.'
    },
    vision: {
      models: [
        'openai/gpt-4o',
        'openai/gpt-4-vision-preview',
        'anthropic/claude-3-opus',
        'google/gemini-1.5-pro'
      ],
      defaultModel: 'openai/gpt-4o',
      imageDetail: 'high',
      maxImages: 20,
      ocrMode: true,
      temperature: 0.2,
      maxTokens: 4000
    },
    routing: {
      useVisionForScreenshots: true,
      fallbackToChatOnly: false, // 항상 최고 품질 유지
      hybridProcessing: true,
      qualityThreshold: 0.8
    },
    limits: {
      maxFileSize: 200,
      maxCellsPerRequest: 100000,
      maxComplexity: 'unlimited',
      maxRetries: 3,
      timeout: 60000
    },
    features: [
      ...TIER2.features,
      'expert_consultation',
      'custom_solutions',
      'premium_vision',
      'complex_chart_analysis',
      'custom_macros',
      'batch_processing',
      'priority_queue',
      'dedicated_support',
      'api_access',
      'white_label'
    ],
    costLimits: {
      maxCostPerRequest: 0.5,
      dailyLimit: 50.0,
      monthlyLimit: 1000.0
    }
  }
};

// Vision 모델별 세부 사양
export const VISION_MODEL_SPECS = {
  'google/gemini-1.5-flash': {
    maxImageSize: 20, // MB
    supportedFormats: ['jpeg', 'png', 'webp', 'gif'],
    contextWindow: 1000000,
    strengths: ['fast', 'cheap', 'good_ocr', 'large_context'],
    weaknesses: ['complex_charts'],
    costPer1kTokens: 0.00035
  },
  'anthropic/claude-3-haiku': {
    maxImageSize: 10,
    supportedFormats: ['jpeg', 'png', 'webp'],
    contextWindow: 200000,
    strengths: ['structured_data', 'tables', 'accuracy'],
    weaknesses: ['handwriting'],
    costPer1kTokens: 0.00025
  },
  'openai/gpt-4o': {
    maxImageSize: 20,
    supportedFormats: ['jpeg', 'png', 'webp', 'gif'],
    contextWindow: 128000,
    strengths: ['best_quality', 'multimodal', 'complex_analysis'],
    weaknesses: ['expensive'],
    costPer1kTokens: 0.005
  },
  'openai/gpt-4-vision-preview': {
    maxImageSize: 20,
    supportedFormats: ['jpeg', 'png', 'webp', 'gif'],
    contextWindow: 128000,
    strengths: ['comprehensive', 'accurate', 'detailed'],
    weaknesses: ['slow', 'expensive'],
    costPer1kTokens: 0.01
  }
};

// 사용자 Tier 관리 헬퍼 함수들
export const tierHelpers = {
  /**
   * 사용자의 효과적인 Tier 설정 가져오기
   */
  getUserTierConfig(userTier: string): TierConfiguration {
    return ENHANCED_TIER_CONFIGS[userTier] || ENHANCED_TIER_CONFIGS.TIER1;
  },

  /**
   * 작업 난이도에 따른 최적 모델 선택
   */
  selectOptimalModel(
    userTier: string,
    taskType: 'chat' | 'vision',
    taskComplexity: 'low' | 'medium' | 'high'
  ): string {
    const config = this.getUserTierConfig(userTier);
    const models = taskType === 'chat' ? config.chat.models : config.vision.models;
    
    // 복잡도에 따라 모델 선택
    if (taskComplexity === 'low' && models.length > 0) {
      return models[0]; // 가장 경제적인 모델
    } else if (taskComplexity === 'high' && models.length > 1) {
      return models[models.length - 1]; // 가장 강력한 모델
    }
    
    return taskType === 'chat' 
      ? config.chat.defaultModel 
      : config.vision.defaultModel;
  },

  /**
   * 기능 접근 권한 확인
   */
  hasFeature(userTier: string, feature: string): boolean {
    const config = this.getUserTierConfig(userTier);
    return config.features.includes(feature);
  },

  /**
   * 비용 한도 확인
   */
  checkCostLimit(
    userTier: string,
    estimatedCost: number,
    limitType: 'request' | 'daily' | 'monthly'
  ): { allowed: boolean; limit?: number; remaining?: number } {
    const config = this.getUserTierConfig(userTier);
    if (!config.costLimits) return { allowed: true };
    
    const limitKey = `max${limitType.charAt(0).toUpperCase()}${limitType.slice(1)}`;
    const limit = config.costLimits[limitKey as keyof typeof config.costLimits];
    
    if (!limit) return { allowed: true };
    
    // TODO: 실제 사용량 조회 로직 추가
    const currentUsage = 0; // 데이터베이스에서 조회
    
    return {
      allowed: currentUsage + estimatedCost <= limit,
      limit,
      remaining: Math.max(0, limit - currentUsage)
    };
  },

  /**
   * Tier 업그레이드 권장 확인
   */
  shouldRecommendUpgrade(
    currentTier: string,
    failureRate: number,
    avgQualityScore: number
  ): { recommend: boolean; reason?: string } {
    if (currentTier === 'TIER3') return { recommend: false };
    
    if (failureRate > 0.3) {
      return {
        recommend: true,
        reason: '현재 Tier에서 처리 실패율이 높습니다. 더 강력한 모델이 필요합니다.'
      };
    }
    
    if (avgQualityScore < 0.7) {
      return {
        recommend: true,
        reason: '분석 품질이 낮습니다. 상위 Tier로 업그레이드하면 더 정확한 분석이 가능합니다.'
      };
    }
    
    return { recommend: false };
  }
};

// 동적 Tier 조정을 위한 인터페이스
export interface DynamicTierAdjustment {
  userId: string;
  baseTier: string;
  temporaryUpgrade?: {
    toTier: string;
    reason: string;
    expiresAt: Date;
  };
  usageStats: {
    dailyCost: number;
    monthlyFailures: number;
    avgQualityScore: number;
  };
}

/**
 * 사용자의 실제 사용 패턴에 따른 동적 Tier 조정
 */
export function getEffectiveTier(adjustment: DynamicTierAdjustment): string {
  // 임시 업그레이드 확인
  if (adjustment.temporaryUpgrade && 
      adjustment.temporaryUpgrade.expiresAt > new Date()) {
    return adjustment.temporaryUpgrade.toTier;
  }
  
  // 사용량 기반 자동 조정 (선택적)
  const stats = adjustment.usageStats;
  if (stats.monthlyFailures > 10 && adjustment.baseTier === 'TIER1') {
    console.log('High failure rate detected, considering temporary upgrade');
  }
  
  return adjustment.baseTier;
}