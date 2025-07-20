/**
 * 향상된 AI 분석 서비스
 * 멀티모달 폴백, 품질 평가, 피드백 학습을 통합
 */

import { MultimodalFallbackService, VisionAnalysisRequest } from './multimodal-fallback';
import { FeedbackLearningService } from './feedback-learning';
import { RAGService } from './rag-service';
import { PipeDataIntegrationService } from '@/lib/services/pipedata-integration.service';
import { tierHelpers } from './tier-config-enhanced';
import { ExcelError } from '@/types/excel';

export interface EnhancedAnalysisRequest {
  type: 'text' | 'image' | 'hybrid';
  userId: string;
  userTier: 'TIER1' | 'TIER2' | 'TIER3';
  // 텍스트 분석용
  query?: string;
  errors?: ExcelError[];
  // 이미지 분석용
  imageData?: string; // Base64
  imagePrompt?: string;
  // 하이브리드 분석용 (Excel + 이미지)
  sessionId?: string; // 연관된 파일들의 세션 ID
  excelData?: any; // 파싱된 Excel 데이터
  imageDataArray?: string[]; // 여러 이미지 Base64 배열
  // 옵션
  options?: {
    preferredModel?: string;
    maxCost?: number;
    urgency?: 'low' | 'normal' | 'high';
    compareMode?: boolean; // Excel과 이미지 비교 모드
  };
}

export interface EnhancedAnalysisResponse {
  success: boolean;
  analysisId: string;
  result: {
    content: string;
    confidence: number;
    suggestions?: string[];
    formulas?: string[];
    corrections?: any[];
  };
  metadata: {
    modelUsed: string;
    processingTime: number;
    totalCost: number;
    isTextOnly?: boolean;
    fallbackOccurred?: boolean;
    qualityScore?: number;
  };
  feedback?: {
    enabled: boolean;
    analysisId: string;
  };
}

export class EnhancedAnalysisService {
  private multimodalFallback: MultimodalFallbackService;
  private feedbackLearning: FeedbackLearningService;
  private ragService: RAGService;
  private pipeDataIntegration: PipeDataIntegrationService;

  constructor() {
    this.multimodalFallback = new MultimodalFallbackService();
    this.feedbackLearning = new FeedbackLearningService();
    this.ragService = new RAGService();
    this.pipeDataIntegration = new PipeDataIntegrationService();
  }

  /**
   * 통합 분석 엔트리 포인트
   */
  async analyze(request: EnhancedAnalysisRequest): Promise<EnhancedAnalysisResponse> {
    const startTime = Date.now();
    const analysisId = this.generateAnalysisId();

    try {
      // 1. 사용자 Tier 설정 확인
      const tierConfig = tierHelpers.getUserTierConfig(request.userTier);
      
      // 2. 비용 한도 확인
      if (request.options?.maxCost) {
        const costCheck = tierHelpers.checkCostLimit(
          request.userTier,
          request.options.maxCost,
          'request'
        );
        
        if (!costCheck.allowed) {
          throw new Error(`비용 한도 초과: 허용된 한도 $${costCheck.limit}`);
        }
      }

      // 3. 분석 유형별 처리
      let analysisResult;
      
      switch (request.type) {
        case 'text':
          analysisResult = await this.performTextAnalysis(request);
          break;
          
        case 'image':
          analysisResult = await this.performImageAnalysis(request);
          break;
          
        case 'hybrid':
          analysisResult = await this.performHybridAnalysis(request);
          break;
          
        default:
          throw new Error(`지원되지 않는 분석 유형: ${request.type}`);
      }

      // 4. 결과 후처리
      const enhancedResult = await this.enhanceResult(analysisResult, request);

      // 5. 피드백 준비
      const processingTime = Date.now() - startTime;
      
      // 피드백 기록을 위한 기본 정보 저장 (실제 피드백은 나중에)
      const feedbackData = {
        analysisId,
        userId: request.userId,
        modelUsed: analysisResult.modelUsed || 'unknown',
        responseTime: processingTime,
        cost: analysisResult.totalCost || 0
      };

      return {
        success: true,
        analysisId,
        result: enhancedResult,
        metadata: {
          modelUsed: analysisResult.modelUsed || 'unknown',
          processingTime,
          totalCost: analysisResult.totalCost || 0,
          isTextOnly: analysisResult.isTextOnly,
          fallbackOccurred: analysisResult.attempts?.length > 1,
          qualityScore: analysisResult.confidence
        },
        feedback: {
          enabled: true,
          analysisId
        }
      };

    } catch (error) {
      console.error('Enhanced analysis error:', error);
      
      return {
        success: false,
        analysisId,
        result: {
          content: '분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
          confidence: 0
        },
        metadata: {
          modelUsed: 'none',
          processingTime: Date.now() - startTime,
          totalCost: 0,
          qualityScore: 0
        }
      };
    }
  }

  /**
   * 텍스트 전용 분석
   */
  private async performTextAnalysis(request: EnhancedAnalysisRequest): Promise<any> {
    if (!request.query) {
      throw new Error('텍스트 분석을 위한 query가 필요합니다.');
    }

    // 1. PipeData 지식 활용
    const pipeDataContext = await this.pipeDataIntegration.analyzeWithPipeDataKnowledge(
      request.query
    );

    // 2. RAG 서비스 활용
    await this.ragService.initialize();
    const ragResponse = await this.ragService.generateAnswer(request.query);

    // 3. 최적 모델 추천
    const recommendedModel = await this.feedbackLearning.recommendModel(
      'chat',
      request.userTier,
      request.userId
    );

    return {
      content: ragResponse.answer,
      confidence: ragResponse.confidence,
      modelUsed: recommendedModel.recommended,
      totalCost: this.estimateCost(recommendedModel.recommended, ragResponse.answer.length),
      sources: ragResponse.sources,
      context: pipeDataContext
    };
  }

  /**
   * 이미지 분석
   */
  private async performImageAnalysis(request: EnhancedAnalysisRequest): Promise<any> {
    if (!request.imageData) {
      throw new Error('이미지 분석을 위한 imageData가 필요합니다.');
    }

    const visionRequest: VisionAnalysisRequest = {
      imageData: request.imageData,
      textPrompt: request.imagePrompt || 'Excel 스크린샷을 분석하고 오류를 찾아주세요.',
      userTier: request.userTier,
      userId: request.userId,
      options: {
        maxRetries: 3,
        qualityThreshold: 0.7,
        timeout: 30000
      }
    };

    return await this.multimodalFallback.analyzeWithSmartFallback(visionRequest);
  }

  /**
   * 하이브리드 분석 (텍스트 + 이미지)
   */
  private async performHybridAnalysis(request: EnhancedAnalysisRequest): Promise<any> {
    // Excel + 이미지 비교 모드인 경우
    if (request.options?.compareMode && request.excelData && request.imageDataArray) {
      return await this.performExcelImageComparison(request);
    }
    
    // 기존 하이브리드 분석 (이미지 + 텍스트)
    // 1. 이미지 분석 먼저 수행
    const imageAnalysis = await this.performImageAnalysis(request);
    
    // 2. 이미지 분석 결과를 텍스트 분석에 포함
    const enhancedQuery = `
      ${request.query || ''}
      
      이미지 분석 결과:
      ${imageAnalysis.content}
    `;
    
    const textRequest = {
      ...request,
      query: enhancedQuery,
      type: 'text' as const
    };
    
    const textAnalysis = await this.performTextAnalysis(textRequest);
    
    // 3. 결과 통합
    return {
      content: textAnalysis.content,
      confidence: (imageAnalysis.confidence + textAnalysis.confidence) / 2,
      modelUsed: `${imageAnalysis.modelUsed} + ${textAnalysis.modelUsed}`,
      totalCost: (imageAnalysis.totalCost || 0) + (textAnalysis.totalCost || 0),
      imageAnalysis: imageAnalysis.content,
      isHybrid: true
    };
  }

  /**
   * Excel과 이미지 비교 분석
   */
  private async performExcelImageComparison(request: EnhancedAnalysisRequest): Promise<any> {
    const { excelData, imageDataArray, query } = request;
    
    // 1. 각 이미지 분석
    const imageAnalyses = [];
    for (const imageData of imageDataArray!) {
      const imageAnalysis = await this.performImageAnalysis({
        ...request,
        imageData,
        imagePrompt: `Excel 스크린샷을 분석하고 다음 사항을 확인해주세요:
1. 표시된 데이터와 수식
2. 셀 위치와 내용
3. 오류나 경고 표시
4. 서식과 스타일`
      });
      imageAnalyses.push(imageAnalysis);
    }
    
    // 2. Excel 데이터와 이미지 분석 결과 비교
    const comparisonPrompt = `
다음 Excel 파일 데이터와 스크린샷 분석 결과를 비교해주세요:

Excel 파일 데이터:
${JSON.stringify(excelData, null, 2)}

스크린샷 분석 결과:
${imageAnalyses.map((a, i) => `이미지 ${i + 1}: ${a.content}`).join('\n\n')}

사용자 요청: ${query || '차이점을 찾고 문제를 해결해주세요.'}

다음을 포함하여 분석해주세요:
1. 파일과 스크린샷 간의 차이점
2. 발견된 오류나 불일치
3. 사용자 요청에 대한 구체적인 해결 방법
4. 수정이 필요한 부분과 수식
`;

    // 3. 종합 분석
    const comprehensiveAnalysis = await this.performTextAnalysis({
      ...request,
      query: comparisonPrompt,
      type: 'text'
    });
    
    // 4. 결과 구성
    return {
      content: comprehensiveAnalysis.content,
      confidence: Math.min(...imageAnalyses.map(a => a.confidence), comprehensiveAnalysis.confidence),
      modelUsed: comprehensiveAnalysis.modelUsed,
      totalCost: imageAnalyses.reduce((sum, a) => sum + (a.totalCost || 0), 0) + (comprehensiveAnalysis.totalCost || 0),
      comparisons: {
        excelSummary: this.summarizeExcelData(excelData),
        imageSummaries: imageAnalyses.map((a, i) => ({
          imageIndex: i + 1,
          content: a.content,
          confidence: a.confidence
        })),
        differences: this.extractDifferences(comprehensiveAnalysis.content),
        suggestions: this.extractSuggestions(comprehensiveAnalysis.content)
      },
      isComparison: true
    };
  }

  /**
   * Excel 데이터 요약
   */
  private summarizeExcelData(excelData: any): any {
    if (!excelData || !excelData.sheets) return null;
    
    return {
      sheetCount: excelData.sheets.length,
      sheets: excelData.sheets.map((sheet: any) => ({
        name: sheet.name,
        rowCount: sheet.rowCount,
        columnCount: sheet.columnCount,
        hasFormulas: sheet.formulas?.length > 0,
        hasErrors: sheet.errors?.length > 0
      }))
    };
  }

  /**
   * 차이점 추출
   */
  private extractDifferences(content: string): string[] {
    const differences: string[] = [];
    
    // "차이", "불일치", "다른", "맞지 않" 등의 키워드를 포함한 문장 추출
    const lines = content.split('\n');
    const differenceKeywords = ['차이', '불일치', '다른', '맞지 않', '일치하지', '상이'];
    
    for (const line of lines) {
      if (differenceKeywords.some(keyword => line.includes(keyword))) {
        differences.push(line.trim());
      }
    }
    
    return differences.slice(0, 10); // 최대 10개
  }

  /**
   * 결과 향상
   */
  private async enhanceResult(analysisResult: any, request: EnhancedAnalysisRequest): Promise<any> {
    const enhanced: any = {
      content: analysisResult.content,
      confidence: analysisResult.confidence
    };

    // Excel 특화 정보 추출
    if (analysisResult.content) {
      // 수식 추출
      const formulas = this.extractFormulas(analysisResult.content);
      if (formulas.length > 0) {
        enhanced.formulas = formulas;
      }

      // 제안 사항 추출
      const suggestions = this.extractSuggestions(analysisResult.content);
      if (suggestions.length > 0) {
        enhanced.suggestions = suggestions;
      }

      // 에러별 수정 사항
      if (request.errors && request.errors.length > 0) {
        enhanced.corrections = this.mapErrorsToCorrections(
          request.errors,
          analysisResult.content
        );
      }
    }

    return enhanced;
  }

  /**
   * 수식 추출
   */
  private extractFormulas(content: string): string[] {
    const formulas: string[] = [];
    const formulaPattern = /=\w+\([^)]*\)/g;
    const matches = content.match(formulaPattern);
    
    if (matches) {
      formulas.push(...matches);
    }

    return [...new Set(formulas)]; // 중복 제거
  }

  /**
   * 제안 사항 추출
   */
  private extractSuggestions(content: string): string[] {
    const suggestions: string[] = [];
    
    // 번호 목록 패턴
    const numberedPattern = /\d+\.\s*([^\n]+)/g;
    let match;
    while ((match = numberedPattern.exec(content)) !== null) {
      suggestions.push(match[1].trim());
    }

    // 불릿 포인트 패턴
    const bulletPattern = /^[\-\*]\s*([^\n]+)/gm;
    while ((match = bulletPattern.exec(content)) !== null) {
      suggestions.push(match[1].trim());
    }

    return suggestions.slice(0, 5); // 최대 5개
  }

  /**
   * 에러를 수정 사항으로 매핑
   */
  private mapErrorsToCorrections(errors: ExcelError[], analysisContent: string): any[] {
    return errors.map(error => ({
      error: {
        type: error.type,
        location: error.location,
        description: error.description
      },
      correction: this.findCorrectionForError(error, analysisContent),
      implemented: false
    }));
  }

  /**
   * 특정 에러에 대한 수정 사항 찾기
   */
  private findCorrectionForError(error: ExcelError, content: string): string {
    // 에러 위치나 타입이 언급된 부분 찾기
    const locationPattern = new RegExp(error.location, 'i');
    const lines = content.split('\n');
    
    for (const line of lines) {
      if (locationPattern.test(line)) {
        return line.trim();
      }
    }

    return error.suggestion || '수동으로 확인이 필요합니다.';
  }

  /**
   * 비용 추정
   */
  private estimateCost(model: string, outputLength: number): number {
    // 간단한 비용 추정 (실제로는 더 정교해야 함)
    const costPerChar = {
      'deepseek/deepseek-chat': 0.000001,
      'openai/gpt-3.5-turbo': 0.000002,
      'openai/gpt-4-turbo': 0.00001,
      'google/gemini-1.5-flash': 0.0000015
    };

    return (costPerChar[model] || 0.000005) * outputLength;
  }

  /**
   * 분석 ID 생성
   */
  private generateAnalysisId(): string {
    return `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 사용자 피드백 제출
   */
  async submitFeedback(
    analysisId: string,
    feedback: {
      helpful: boolean;
      accuracyScore: number;
      feedbackText?: string;
      errorReported?: boolean;
    }
  ): Promise<void> {
    // 분석 메타데이터 조회 (실제로는 캐시나 DB에서)
    // 여기서는 간단히 구현
    
    await this.feedbackLearning.recordUserFeedback({
      analysisId,
      userId: 'current_user', // 실제로는 세션에서 가져옴
      modelUsed: 'unknown', // 실제로는 저장된 데이터에서
      helpful: feedback.helpful,
      accuracyScore: feedback.accuracyScore,
      responseTime: 1000, // 실제로는 저장된 데이터에서
      cost: 0.01, // 실제로는 저장된 데이터에서
      feedbackText: feedback.feedbackText,
      errorReported: feedback.errorReported
    });
  }

  /**
   * 분석 통계 조회
   */
  async getAnalysisStats(userId?: string): Promise<any> {
    const dashboardData = await this.feedbackLearning.getDashboardData();
    
    return {
      ...dashboardData,
      userSpecific: userId ? {
        // 사용자별 통계 추가
        totalAnalyses: 0, // TODO: 실제 구현
        averageSatisfaction: 0,
        preferredModels: []
      } : null
    };
  }
}