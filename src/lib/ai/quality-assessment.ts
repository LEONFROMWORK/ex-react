/**
 * AI 응답 품질 평가 시스템
 * Excel-Rails의 품질 판단 로직을 TypeScript로 구현
 */

export interface QualityAssessment {
  score: number;
  breakdown: {
    baseScore: number;
    structureBonus: number;
    detailBonus: number;
    expertiseBonus: number;
    imageAnalysisBonus: number;
  };
  recommendation: 'accept' | 'retry' | 'fallback';
  details: string[];
}

export interface AIResponse {
  content: string;
  model?: string;
  tokensUsed?: number;
  processingTime?: number;
  error?: string;
}

export class MultimodalQualityAssessor {
  // 모델별 기본 신뢰도 점수
  private modelBaseScores: Record<string, number> = {
    // Vision 모델
    'google/gemini-1.5-flash': 0.75,
    'google/gemini-1.5-flash-8b': 0.73,
    'anthropic/claude-3-haiku': 0.85,
    'anthropic/claude-3-sonnet': 0.88,
    'anthropic/claude-3-opus': 0.92,
    'openai/gpt-4-vision-preview': 0.95,
    'openai/gpt-4o': 0.98,
    'openai/gpt-4o-mini': 0.90,
    
    // Chat 모델
    'deepseek/deepseek-chat': 0.70,
    'openai/gpt-3.5-turbo': 0.80,
    'openai/gpt-4-turbo': 0.93,
    'openai/gpt-4-turbo-preview': 0.93,
  };

  // Excel 관련 전문 용어
  private excelTerms = {
    ko: [
      '셀', '수식', '차트', '워크시트', '열', '행', '피벗테이블',
      '함수', '범위', '참조', '조건부서식', '필터', '정렬', '매크로'
    ],
    en: [
      'cell', 'formula', 'chart', 'worksheet', 'column', 'row', 'pivot',
      'function', 'range', 'reference', 'conditional', 'filter', 'sort', 'macro',
      'VLOOKUP', 'SUMIF', 'INDEX', 'MATCH', 'COUNTIF'
    ]
  };

  /**
   * AI 응답의 품질 점수를 계산
   */
  calculateConfidenceScore(
    result: AIResponse,
    model: string,
    isImageAnalysis: boolean = false
  ): QualityAssessment {
    const content = result.content || '';
    const details: string[] = [];
    
    // 빈 응답 처리
    if (!content || content.trim().length === 0) {
      return {
        score: 0.5,
        breakdown: {
          baseScore: 0.5,
          structureBonus: 0,
          detailBonus: 0,
          expertiseBonus: 0,
          imageAnalysisBonus: 0
        },
        recommendation: 'fallback',
        details: ['응답이 비어있습니다']
      };
    }

    // 모델별 기본 점수
    let score = this.modelBaseScores[model] || 0.7;
    const breakdown = {
      baseScore: score,
      structureBonus: 0,
      detailBonus: 0,
      expertiseBonus: 0,
      imageAnalysisBonus: 0
    };

    // 1. 구조화된 응답 확인 (+0.1)
    if (this.hasStructuredContent(content)) {
      breakdown.structureBonus = 0.1;
      score += 0.1;
      details.push('구조화된 응답 감지');
    }

    // 2. 상세한 분석 확인 (+0.05)
    if (content.length > 200) {
      breakdown.detailBonus = 0.05;
      score += 0.05;
      details.push('상세한 응답 (200자 이상)');
    }

    // 3. Excel 전문 용어 사용 확인 (+0.1)
    const expertiseScore = this.assessExpertise(content);
    if (expertiseScore > 0) {
      breakdown.expertiseBonus = expertiseScore;
      score += expertiseScore;
      details.push(`Excel 전문성 확인 (점수: ${expertiseScore})`);
    }

    // 4. 이미지 분석 특화 평가
    if (isImageAnalysis) {
      const imageScore = this.assessImageAnalysisQuality(content);
      breakdown.imageAnalysisBonus = imageScore.bonus;
      score += imageScore.bonus;
      details.push(...imageScore.details);
    }

    // 점수 정규화 (0.0 ~ 1.0)
    score = Math.min(Math.max(score, 0), 1);

    return {
      score,
      breakdown,
      recommendation: this.getRecommendation(score),
      details
    };
  }

  /**
   * 구조화된 콘텐츠 확인
   */
  private hasStructuredContent(content: string): boolean {
    // 코드 블록
    if (content.includes('```')) return true;
    
    // 번호 목록
    if (/\d+\.\s+/m.test(content)) return true;
    
    // 불릿 포인트
    if (/^[\-\*]\s+/m.test(content)) return true;
    
    // 단계별 설명
    if (/단계\s*\d+|Step\s*\d+/i.test(content)) return true;
    
    return false;
  }

  /**
   * Excel 전문성 평가
   */
  private assessExpertise(content: string): number {
    let score = 0;
    const lowerContent = content.toLowerCase();
    
    // 한국어 용어 체크
    const koTermsFound = this.excelTerms.ko.filter(term => 
      content.includes(term)
    ).length;
    
    // 영어 용어 체크
    const enTermsFound = this.excelTerms.en.filter(term => 
      lowerContent.includes(term.toLowerCase())
    ).length;
    
    const totalTermsFound = koTermsFound + enTermsFound;
    
    if (totalTermsFound >= 5) score = 0.1;
    else if (totalTermsFound >= 3) score = 0.08;
    else if (totalTermsFound >= 1) score = 0.05;
    
    return score;
  }

  /**
   * 이미지 분석 품질 평가
   */
  private assessImageAnalysisQuality(content: string): {
    bonus: number;
    details: string[];
  } {
    let bonus = 0;
    const details: string[] = [];
    
    // 1. 이미지 인식 관련 언급 (+0.05)
    if (/보입니다|확인됩니다|분석됩니다|detected|found|identified|스크린샷/i.test(content)) {
      bonus += 0.05;
      details.push('이미지 인식 언급 확인');
    }
    
    // 2. 구체적 위치 언급 (+0.05)
    if (/상단|하단|왼쪽|오른쪽|중앙|[A-Z]+\d+|cell [A-Z]\d+|셀 [A-Z]\d+/i.test(content)) {
      bonus += 0.05;
      details.push('구체적 위치 언급');
    }
    
    // 3. 수치 데이터 언급 (+0.05)
    if (/\d+%|\d+원|\d+개|\$[\d,]+|[\d,]+원/i.test(content)) {
      bonus += 0.05;
      details.push('수치 데이터 포함');
    }
    
    // 4. 실행 가능한 조언 (+0.05)
    if (/수정|변경|추가|삭제|클릭|선택|입력|modify|change|add|delete|click|select/i.test(content)) {
      bonus += 0.05;
      details.push('실행 가능한 조언 제공');
    }
    
    // 5. Excel UI 요소 언급 (+0.03)
    if (/리본|메뉴|탭|버튼|대화상자|ribbon|menu|tab|button|dialog/i.test(content)) {
      bonus += 0.03;
      details.push('Excel UI 요소 언급');
    }
    
    return { bonus, details };
  }

  /**
   * 점수 기반 권장 사항 결정
   */
  private getRecommendation(score: number): 'accept' | 'retry' | 'fallback' {
    if (score >= 0.85) return 'accept';
    if (score >= 0.7) return 'retry';
    return 'fallback';
  }

  /**
   * 에러 응답 품질 평가
   */
  assessErrorResponse(error: any): QualityAssessment {
    const errorMessage = error?.message || error?.toString() || '';
    
    // 일반적인 오류 메시지 감지
    const genericErrors = [
      '이미지를 인식할 수 없습니다',
      '분석할 수 없습니다',
      'cannot process',
      'unable to analyze',
      'error occurred'
    ];
    
    const isGenericError = genericErrors.some(msg => 
      errorMessage.toLowerCase().includes(msg.toLowerCase())
    );
    
    return {
      score: isGenericError ? 0.3 : 0.5,
      breakdown: {
        baseScore: 0.5,
        structureBonus: 0,
        detailBonus: 0,
        expertiseBonus: 0,
        imageAnalysisBonus: 0
      },
      recommendation: 'fallback',
      details: [`오류 발생: ${errorMessage}`]
    };
  }

  /**
   * 사용자 피드백 기반 점수 조정
   */
  adjustScoreWithFeedback(
    baseScore: number,
    model: string,
    avgSatisfaction: number // 0-1 범위
  ): number {
    // 피드백 가중치 (50%)
    const feedbackWeight = 0.5;
    const adjustedScore = baseScore * (1 - feedbackWeight) + 
                         (baseScore * avgSatisfaction) * feedbackWeight;
    
    return Math.min(Math.max(adjustedScore, 0), 1);
  }
}

// 품질 평가 헬퍼 함수들
export const qualityHelpers = {
  /**
   * 여러 평가 결과 중 최고 점수 선택
   */
  getBestQuality(assessments: QualityAssessment[]): QualityAssessment | null {
    if (assessments.length === 0) return null;
    return assessments.reduce((best, current) => 
      current.score > best.score ? current : best
    );
  },

  /**
   * 평균 품질 점수 계산
   */
  getAverageQuality(assessments: QualityAssessment[]): number {
    if (assessments.length === 0) return 0;
    const sum = assessments.reduce((acc, curr) => acc + curr.score, 0);
    return sum / assessments.length;
  },

  /**
   * 품질 점수를 사용자 친화적 문자열로 변환
   */
  getQualityLabel(score: number): string {
    if (score >= 0.9) return '매우 높음';
    if (score >= 0.8) return '높음';
    if (score >= 0.7) return '보통';
    if (score >= 0.6) return '낮음';
    return '매우 낮음';
  }
};