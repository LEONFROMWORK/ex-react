import { AI_TIERS } from './tier-system';

// 사용자 프로필 및 사용 패턴
export interface UserProfile {
  userId: string;
  usageHistory: {
    totalAnalyses: number;
    errorDetectionCount: number;
    visualComparisonCount: number;
    improvementSuggestionCount: number;
    averageFileSize: number;
    averageErrorCount: number;
    preferredTier?: keyof typeof AI_TIERS;
  };
  subscription: {
    plan: 'free' | 'basic' | 'pro' | 'enterprise';
    monthlyBudget?: number;
    remainingCredits?: number;
  };
  preferences: {
    speedVsAccuracy: 'speed' | 'balanced' | 'accuracy';
    costSensitivity: 'low' | 'medium' | 'high';
  };
}

// 분석 컨텍스트
export interface AnalysisContext {
  fileSize: number;
  errorCount: number;
  hasImages: boolean;
  imageCount: number;
  queryComplexity: 'simple' | 'moderate' | 'complex';
  urgency: 'low' | 'normal' | 'high';
  previousAttempts?: number;
}

export class TierRecommendationEngine {
  // 사용자별 최적 티어 추천
  static recommendTier(
    userProfile: UserProfile,
    context: AnalysisContext
  ): {
    recommendedTier: keyof typeof AI_TIERS;
    confidence: number;
    reasons: string[];
    alternativeTiers: Array<{
      tier: keyof typeof AI_TIERS;
      tradeoffs: string[];
    }>;
  } {
    const reasons: string[] = [];
    let score = 0;
    
    // 1. 기본 요구사항 분석
    if (context.hasImages) {
      score += 30;
      reasons.push('이미지 분석이 필요하여 고급 모델 권장');
    }
    
    if (context.errorCount > 10) {
      score += 20;
      reasons.push('많은 오류가 감지되어 정밀 분석 필요');
    } else if (context.errorCount > 5) {
      score += 10;
    }
    
    // 2. 쿼리 복잡도 평가
    switch (context.queryComplexity) {
      case 'complex':
        score += 25;
        reasons.push('복잡한 분석 요청으로 고급 추론 필요');
        break;
      case 'moderate':
        score += 15;
        break;
      case 'simple':
        score += 5;
        break;
    }
    
    // 3. 사용자 선호도 반영
    if (userProfile.preferences.speedVsAccuracy === 'accuracy') {
      score += 15;
      reasons.push('정확도 우선 설정');
    } else if (userProfile.preferences.speedVsAccuracy === 'speed') {
      score -= 10;
      reasons.push('속도 우선 설정');
    }
    
    // 4. 비용 민감도 고려
    if (userProfile.preferences.costSensitivity === 'high') {
      score -= 20;
      reasons.push('비용 절감 우선');
    } else if (userProfile.preferences.costSensitivity === 'low') {
      score += 10;
    }
    
    // 5. 구독 플랜 고려
    switch (userProfile.subscription.plan) {
      case 'enterprise':
        score += 15;
        reasons.push('엔터프라이즈 플랜으로 고급 기능 활용 가능');
        break;
      case 'pro':
        score += 10;
        break;
      case 'basic':
        score -= 5;
        break;
      case 'free':
        score -= 15;
        reasons.push('무료 플랜으로 비용 효율적 선택 필요');
        break;
    }
    
    // 6. 사용 이력 기반 학습
    const history = userProfile.usageHistory;
    if (history.visualComparisonCount > history.totalAnalyses * 0.5) {
      score += 10;
      reasons.push('시각적 비교를 자주 사용');
    }
    
    // 7. 긴급도 반영
    if (context.urgency === 'high') {
      score -= 5; // 빠른 응답을 위해 낮은 티어 선호
      reasons.push('긴급 처리 요청');
    }
    
    // 최종 티어 결정
    let recommendedTier: keyof typeof AI_TIERS;
    if (score >= 50) {
      recommendedTier = 'TIER3';
    } else if (score >= 25) {
      recommendedTier = 'TIER2';
    } else {
      recommendedTier = 'TIER1';
    }
    
    // 사용자 이력의 선호 티어가 있으면 가중치 부여
    if (history.preferredTier && Math.abs(score - 25) < 10) {
      recommendedTier = history.preferredTier;
      reasons.push('과거 사용 패턴 반영');
    }
    
    // 대안 티어 제시
    const alternativeTiers = this.generateAlternatives(recommendedTier, context, userProfile);
    
    return {
      recommendedTier,
      confidence: Math.min(0.95, 0.6 + (Math.abs(score - 25) / 100)),
      reasons,
      alternativeTiers
    };
  }
  
  // 대안 티어 생성
  private static generateAlternatives(
    recommendedTier: keyof typeof AI_TIERS,
    context: AnalysisContext,
    userProfile: UserProfile
  ): Array<{ tier: keyof typeof AI_TIERS; tradeoffs: string[] }> {
    const alternatives: Array<{ tier: keyof typeof AI_TIERS; tradeoffs: string[] }> = [];
    
    if (recommendedTier !== 'TIER1') {
      alternatives.push({
        tier: 'TIER1',
        tradeoffs: [
          '✅ 비용 80% 절감',
          '✅ 빠른 응답 속도',
          '❌ 이미지 분석 불가',
          '❌ 복잡한 수식 분석 제한'
        ]
      });
    }
    
    if (recommendedTier !== 'TIER2') {
      alternatives.push({
        tier: 'TIER2',
        tradeoffs: [
          '✅ 균형잡힌 성능과 비용',
          '✅ 복잡한 분석 가능',
          '❌ 이미지 분석 제한적',
          '❌ TIER3 대비 정확도 낮음'
        ]
      });
    }
    
    if (recommendedTier !== 'TIER3') {
      alternatives.push({
        tier: 'TIER3',
        tradeoffs: [
          '✅ 최고 수준의 정확도',
          '✅ 완벽한 이미지 분석',
          '✅ 고급 추론 능력',
          '❌ 높은 비용',
          '❌ 상대적으로 느린 속도'
        ]
      });
    }
    
    return alternatives;
  }
  
  // 사용자 프로필 업데이트
  static updateUserProfile(
    profile: UserProfile,
    usedTier: keyof typeof AI_TIERS,
    context: AnalysisContext,
    satisfaction: number // 1-5
  ): UserProfile {
    const history = profile.usageHistory;
    
    // 사용 횟수 업데이트
    history.totalAnalyses++;
    
    // 시나리오별 카운트 업데이트
    if (context.errorCount > 0) history.errorDetectionCount++;
    if (context.hasImages) history.visualComparisonCount++;
    if (context.queryComplexity === 'complex') history.improvementSuggestionCount++;
    
    // 평균값 업데이트
    history.averageFileSize = (history.averageFileSize * (history.totalAnalyses - 1) + context.fileSize) / history.totalAnalyses;
    history.averageErrorCount = (history.averageErrorCount * (history.totalAnalyses - 1) + context.errorCount) / history.totalAnalyses;
    
    // 만족도가 높으면 선호 티어로 설정
    if (satisfaction >= 4) {
      history.preferredTier = usedTier;
    }
    
    return profile;
  }
  
  // 비용 예측
  static estimateCost(
    tier: keyof typeof AI_TIERS,
    context: AnalysisContext
  ): {
    estimatedCost: number;
    breakdown: {
      textAnalysis: number;
      imageAnalysis: number;
      total: number;
    };
  } {
    const tierConfig = AI_TIERS[tier];
    
    // 텍스트 토큰 예측 (파일 크기 기반)
    const textTokens = Math.ceil(context.fileSize / 1000) * 100;
    
    // 이미지 토큰 예측
    const imageTokens = context.imageCount * 1000;
    
    const totalTokens = textTokens + imageTokens;
    const totalCost = (totalTokens / 1000) * tierConfig.costPerToken;
    
    return {
      estimatedCost: totalCost,
      breakdown: {
        textAnalysis: (textTokens / 1000) * tierConfig.costPerToken,
        imageAnalysis: (imageTokens / 1000) * tierConfig.costPerToken,
        total: totalCost
      }
    };
  }
  
  // 쿼리 복잡도 분석
  static analyzeQueryComplexity(query: string): 'simple' | 'moderate' | 'complex' {
    if (!query) return 'simple';
    
    const complexKeywords = [
      '비교', '분석', '차이', '개선', '최적화', '시각화', '차트',
      '추세', '패턴', '예측', '통계', '상관관계', '원인'
    ];
    
    const moderateKeywords = [
      '확인', '검토', '수정', '변경', '계산', '합계', '평균'
    ];
    
    const queryLower = query.toLowerCase();
    const complexCount = complexKeywords.filter(k => queryLower.includes(k)).length;
    const moderateCount = moderateKeywords.filter(k => queryLower.includes(k)).length;
    
    if (complexCount >= 2 || query.length > 100) return 'complex';
    if (complexCount >= 1 || moderateCount >= 2) return 'moderate';
    return 'simple';
  }
}