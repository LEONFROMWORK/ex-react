import { Result } from '@/src/Common/Result';
import { ProcessedExcelData } from '@/src/Features/ExcelAnalysis/ExcelProcessingService';
import { TierSelector, AI_TIERS, TierPromptOptimizer, TierCostCalculator, TierUpgradeManager } from './tier-system';
import { RetryManager } from '@/src/Common/Utils/RetryManager';
import { ErrorRecoveryService } from '@/src/Features/ExcelAnalysis/ErrorRecoveryService';
import { OpenRouterProvider } from '@/src/lib/ai/providers/openrouter';

export interface EnhancedAnalysisRequest {
  type: 'hybrid';
  userId: string;
  userTier: 'TIER1' | 'TIER2' | 'TIER3';
  sessionId: string;
  excelData: ProcessedExcelData;
  imageDataArray: string[];
  query?: string;
  options?: {
    compareMode?: boolean;
    analysisDepth?: 'basic' | 'detailed' | 'comprehensive';
  };
}

export interface EnhancedAnalysisResult {
  analysisId: string;
  result: {
    content: string;
    confidence: number;
    comparisons?: Array<{
      aspect: string;
      excelValue: any;
      imageValue: any;
      difference: string;
      severity: 'low' | 'medium' | 'high';
    }>;
    corrections?: Array<{
      cell: string;
      currentValue: any;
      suggestedValue: any;
      reason: string;
      confidence: number;
    }>;
  };
  metadata: {
    processingTime: number;
    selectedModel: string;
    tokensUsed: number;
    estimatedCost?: number;
    tier?: string;
    scenario?: any;
  };
}

export class EnhancedAnalysisService {
  private provider: OpenRouterProvider;

  constructor() {
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || 'demo-key';
    // 기본적으로 GPT-4 Vision 모델 사용 (OpenRouter 경유)
    this.provider = new OpenRouterProvider(apiKey, 'openai/gpt-4-vision-preview');
  }

  async analyze(request: EnhancedAnalysisRequest): Promise<EnhancedAnalysisResult> {
    const startTime = Date.now();
    
    try {
      // 재시도 가능한 작업으로 래핑
      const resultWithRetry = await RetryManager.withRetry(
        async () => {
          try {
            // 시나리오 분석 및 티어 선택
            const scenario = TierSelector.analyzeScenario({
              type: request.type,
              hasExcel: !!request.excelData,
              hasImages: request.imageDataArray.length > 0,
              query: request.query,
              excelErrors: request.excelData?.summary?.totalErrors || 0
            });
            
            // 사용자가 선택한 티어가 있으면 우선 사용, 없으면 자동 선택
            const selectedTier = request.userTier || TierSelector.selectTier(scenario);
            const tierConfig = AI_TIERS[selectedTier];
            
            // 티어별 분석 수행
            let result = await this.performExcelImageComparison(request, selectedTier);
            
            // 신뢰도 확인 및 티어 업그레이드 필요 여부 판단
            const upgradeDecision = TierUpgradeManager.shouldUpgrade(
              selectedTier,
              result.confidence,
              0
            );
            
            if (upgradeDecision.upgrade && upgradeDecision.nextTier) {
              console.log(`Upgrading from ${selectedTier} to ${upgradeDecision.nextTier} due to low confidence`);
              result = await this.performExcelImageComparison(request, upgradeDecision.nextTier);
            }
            
            // 토큰 및 비용 계산
            const estimatedTokens = TierCostCalculator.estimateTokens(
              JSON.stringify(request.excelData) + (request.query || ''),
              request.imageDataArray.length
            );
            const cost = TierCostCalculator.calculateCost(selectedTier, estimatedTokens);
            
            const analysisResult = {
              analysisId: request.sessionId,
              result,
              metadata: {
                processingTime: Date.now() - startTime,
                selectedModel: tierConfig.model,
                tokensUsed: estimatedTokens,
                tier: selectedTier,
                estimatedCost: cost,
                scenario: scenario
              }
            };
            
            // 분석 이력 저장 (비동기로 처리)
            this.saveAnalysisHistory(request, analysisResult, selectedTier).catch(error => {
              console.error('Failed to save analysis history:', error);
            });
            
            return Result.success(analysisResult);
          } catch (error) {
            const errorCode = (error as any)?.response?.status === 429 ? 'RATE_LIMIT' : 
                            (error as any)?.code === 'ECONNREFUSED' ? 'NETWORK_ERROR' : 'AI_SERVICE_ERROR';
            return Result.failure({
              code: errorCode,
              message: error instanceof Error ? error.message : 'AI 분석 중 오류 발생'
            });
          }
        },
        {
          maxRetries: 3,
          retryableErrors: ['NETWORK_ERROR', 'RATE_LIMIT', 'AI_SERVICE_ERROR', 'TIMEOUT']
        }
      );

      if (!resultWithRetry.isSuccess) {
        // 에러 복구 시도
        const recoveryResult = await ErrorRecoveryService.handleError({
          sessionId: request.sessionId,
          stage: 'analysis',
          error: new Error(resultWithRetry.error.message),
          attemptNumber: 3,
          partialData: { tier: request.userTier }
        }, {
          autoRetry: false,
          notifyUser: true
        });

        throw new Error(resultWithRetry.error.message);
      }
      
      return resultWithRetry.value;
    } catch (error) {
      console.error('Enhanced analysis error:', error);
      
      // 에러 로깅
      await ErrorRecoveryService.logError({
        sessionId: request.sessionId,
        stage: 'analysis',
        error: error instanceof Error ? error : new Error(String(error)),
        attemptNumber: 1
      });
      
      throw error;
    }
  }

  private async performExcelImageComparison(request: EnhancedAnalysisRequest, tier: keyof typeof AI_TIERS = 'TIER3'): Promise<any> {
    const { excelData, imageDataArray, query } = request;
    
    // Excel 데이터 요약 생성
    const excelSummary = this.generateExcelSummary(excelData);
    
    // 데모 모드 체크
    const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || (!process.env.OPENROUTER_API_KEY && !process.env.OPENAI_API_KEY);
    
    let analysisContent: string;
    
    if (isDemoMode) {
      // 데모 모드에서는 mock 응답 반환
      analysisContent = this.generateMockAnalysis(excelData, query);
    } else {
      // 실제 OpenAI API 호출
      const messages: any[] = [
        {
          role: 'system',
          content: `당신은 Excel 파일 분석 전문가입니다. 사용자가 제공한 Excel 파일 데이터와 스크린샷을 비교 분석하여 차이점, 오류, 개선사항을 찾아주세요.
        
분석 시 다음 사항을 중점적으로 확인하세요:
1. Excel 파일과 스크린샷 간의 데이터 차이
2. 수식 오류 (#DIV/0!, #REF!, #VALUE! 등)
3. 데이터 불일치
4. 서식 문제
5. 개선 가능한 부분

응답은 한국어로 작성하고, 구체적인 해결책을 제시해주세요.`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Excel 파일 데이터:\n${excelSummary}\n\n사용자 요청: ${query || '이미지와 Excel 파일을 비교 분석해주세요.'}`
            },
            ...imageDataArray.map(imageData => ({
              type: 'image_url',
              image_url: {
                url: imageData,
                detail: 'high'
              }
            }))
          ]
        }
      ];

      const tierConfig = AI_TIERS[tier];
      const optimizedPrompt = TierPromptOptimizer.optimizePrompt(tier, query || '');
      
      // 티어별 메시지 조정
      if (tier === 'TIER1') {
        // TIER1은 이미지 분석 불가, 텍스트만 분석
        messages[1].content = `Excel 파일 데이터:\n${excelSummary}\n\n요청: ${optimizedPrompt}`;
      } else {
        // TIER2, TIER3는 원래대로
        messages[1].content[0].text = `Excel 파일 데이터:\n${excelSummary}\n\n사용자 요청: ${optimizedPrompt}`;
      }
      
      // OpenRouter를 통한 분석 실행
      const modelMap = {
        'gpt-3.5-turbo': 'openai/gpt-3.5-turbo',
        'gpt-4': 'openai/gpt-4',
        'gpt-4-vision-preview': 'openai/gpt-4-vision-preview'
      };
      
      const openRouterModel = modelMap[tierConfig.model as keyof typeof modelMap] || tierConfig.model;
      
      // Vision 모델인 경우 generateVisionResponse 사용
      if (tier !== 'TIER1' && imageDataArray.length > 0) {
        const response = await this.provider.generateVisionResponse(
          openRouterModel,
          messages,
          {
            temperature: tierConfig.temperature,
            maxTokens: tierConfig.maxTokens,
            systemPrompt: messages[0].content
          }
        );
        analysisContent = response.content;
      } else {
        // 텍스트 전용 분석
        const response = await this.provider.generateResponse(
          messages[1].content,
          {
            systemPrompt: messages[0].content,
            temperature: tierConfig.temperature,
            maxTokens: tierConfig.maxTokens
          }
        );
        analysisContent = response.content;
      }
    }
    
    // 분석 결과 파싱
    const comparisons = this.extractComparisons(analysisContent, excelData);
    const corrections = this.extractCorrections(analysisContent, excelData);
    
    return {
      content: analysisContent,
      confidence: 0.85,
      comparisons,
      corrections
    };
  }

  private generateExcelSummary(excelData: ProcessedExcelData): string {
    const { sheets, summary: stats } = excelData;
    
    // Aggregate errors and formulas from all sheets
    const allErrors = sheets.flatMap(sheet => sheet.errors || []);
    const allFormulas = sheets.flatMap(sheet => sheet.formulas || []);
    
    let summary = `Excel 파일 분석 결과:\n`;
    summary += `- 시트 수: ${sheets.length}\n`;
    summary += `- 총 셀 수: ${stats.totalCells}\n`;
    summary += `- 총 수식 수: ${stats.totalFormulas}\n`;
    summary += `- 총 오류 수: ${stats.totalErrors}\n\n`;
    
    if (allErrors.length > 0) {
      summary += `발견된 오류:\n`;
      allErrors.forEach(error => {
        summary += `- ${error.cell}: ${error.type} - ${error.value}\n`;
      });
      summary += '\n';
    }
    
    // 첫 번째 시트의 데이터 샘플
    if (sheets.length > 0 && sheets[0].data.length > 0) {
      summary += `데이터 샘플 (첫 5행):\n`;
      sheets[0].data.slice(0, 5).forEach((row, index) => {
        summary += `행 ${index + 1}: ${JSON.stringify(row)}\n`;
      });
    }
    
    return summary;
  }

  private extractComparisons(analysis: string, excelData: ProcessedExcelData): any[] {
    // 실제 구현에서는 AI 응답을 파싱하여 비교 결과 추출
    // 여기서는 예시 데이터 반환
    const comparisons = [];
    
    // Aggregate errors from all sheets
    const allErrors = excelData.sheets.flatMap(sheet => sheet.errors || []);
    
    if (allErrors.length > 0) {
      allErrors.forEach(error => {
        comparisons.push({
          aspect: '수식 오류',
          excelValue: error.value,
          imageValue: '스크린샷에서 확인된 오류',
          difference: `${error.cell} 셀에서 ${error.type} 오류 발생`,
          severity: 'high'
        });
      });
    }
    
    return comparisons;
  }

  private extractCorrections(analysis: string, excelData: ProcessedExcelData): any[] {
    // 실제 구현에서는 AI 응답을 파싱하여 수정 제안 추출
    // 여기서는 예시 데이터 반환
    const corrections = [];
    
    // Aggregate errors from all sheets
    const allErrors = excelData.sheets.flatMap(sheet => sheet.errors || []);
    
    allErrors.forEach(error => {
      if (error.type === '#DIV/0!') {
        corrections.push({
          cell: error.cell,
          currentValue: error.value,
          suggestedValue: `=IFERROR(${error.formula}, 0)`,
          reason: '0으로 나누기 오류를 방지하기 위해 IFERROR 함수 사용',
          confidence: 0.9
        });
      } else if (error.type === '#REF!') {
        corrections.push({
          cell: error.cell,
          currentValue: error.value,
          suggestedValue: '참조 범위 재설정 필요',
          reason: '삭제된 셀이나 범위를 참조하고 있음',
          confidence: 0.85
        });
      }
    });
    
    return corrections;
  }

  private generateMockAnalysis(excelData: ProcessedExcelData, query?: string): string {
    // Aggregate errors from all sheets
    const allErrors = excelData.sheets.flatMap(sheet => sheet.errors || []);
    const hasErrors = allErrors.length > 0;
    
    if (hasErrors) {
      return `## Excel 파일과 스크린샷 비교 분석 결과

### 🔍 발견된 주요 오류

${allErrors.map(error => `
**${error.cell} 셀 오류**
- 오류 유형: ${error.type}
- 현재 수식: ${error.formula || 'N/A'}
- 오류 원인: ${this.getErrorReason(error.type)}
`).join('\n')}

### 📊 데이터 불일치 분석

스크린샷과 Excel 파일을 비교한 결과:
- 이영희(3행)의 2월 매출 데이터에서 #DIV/0! 오류 발생
- 박민수(4행)의 3월 매출 데이터에서 #REF! 오류 발생  
- 최지연(5행)의 1월 매출 데이터에서 #VALUE! 오류 발생

### 💡 해결 방안

1. **#DIV/0! 오류 해결**
   - IFERROR 함수를 사용하여 0으로 나누기 오류 방지
   - 예시: =IFERROR(B3/C3, 0)

2. **#REF! 오류 해결**
   - 참조 범위를 올바르게 재설정
   - 삭제된 셀이나 시트를 참조하는지 확인

3. **#VALUE! 오류 해결**
   - 텍스트와 숫자가 혼재되어 있는지 확인
   - 데이터 타입을 통일하거나 VALUE 함수 사용

### 🎯 추가 개선 제안

${query?.includes('데이터가 나오면 좋겠어') ? `
- 오류가 발생한 셀에 기본값 설정 (예: 0 또는 "N/A")
- 데이터 유효성 검사 규칙 추가
- 조건부 서식을 통해 오류 셀 시각적 강조
` : ''}

이러한 수정사항을 적용하면 더 안정적이고 신뢰할 수 있는 Excel 파일이 될 것입니다.`;
    } else {
      return `## Excel 파일과 스크린샷 분석 결과

### 📊 데이터 분석

제공된 Excel 파일은 제품별 월별 매출 데이터를 포함하고 있습니다.

${query?.includes('차트') ? `
### 📈 차트 시각화 제안

스크린샷에서 요청하신 대로 다음과 같은 차트를 추가하는 것을 추천합니다:

1. **월별 추세 차트**
   - 선 그래프로 각 제품의 월별 매출 추이 표시
   - X축: 월, Y축: 매출액

2. **제품별 비교 차트**
   - 막대 그래프로 제품별 총 매출 비교
   - 각 제품의 상대적 성과 한눈에 파악

3. **파이 차트**
   - 전체 매출에서 각 제품이 차지하는 비중 시각화

### 🛠️ 구현 방법

1. 데이터 범위 선택
2. 삽입 → 차트 → 원하는 차트 유형 선택
3. 차트 디자인 및 레이아웃 조정
` : '데이터가 정상적으로 구성되어 있습니다.'}

### ✨ 추가 개선 사항

- 데이터 테이블에 조건부 서식 적용으로 가독성 향상
- 자동 합계 및 평균 계산 수식 추가
- 데이터 검증 규칙으로 입력 오류 방지`;
    }
  }

  private getErrorReason(errorType: string): string {
    const errorReasons: Record<string, string> = {
      '#DIV/0!': '0으로 나누기를 시도했습니다',
      '#REF!': '유효하지 않은 셀 참조입니다',
      '#VALUE!': '잘못된 데이터 타입이 사용되었습니다',
      '#NAME?': '인식할 수 없는 함수명 또는 범위명입니다',
      '#NUM!': '숫자가 너무 크거나 작습니다',
      '#N/A': '값을 사용할 수 없습니다',
      '#NULL!': '잘못된 범위 연산자입니다'
    };
    
    return errorReasons[errorType] || '알 수 없는 오류입니다';
  }
  
  private async saveAnalysisHistory(
    request: EnhancedAnalysisRequest,
    result: EnhancedAnalysisResult,
    tier: keyof typeof AI_TIERS
  ): Promise<void> {
    try {
      const response = await fetch('/api/ai/analysis-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          analysisId: result.analysisId,
          type: request.type,
          tier: tier,
          fileInfo: {
            excelFileName: 'excel-file.xlsx', // 실제로는 request에서 가져와야 함
            excelFileSize: JSON.stringify(request.excelData).length,
            imageCount: request.imageDataArray.length,
            totalSize: JSON.stringify(request.excelData).length + 
                      request.imageDataArray.reduce((sum, img) => sum + img.length, 0)
          },
          query: request.query,
          result: {
            confidence: result.result.confidence,
            errorCount: result.result.corrections?.length || 0,
            correctionCount: result.result.corrections?.length || 0
          },
          cost: {
            tokensUsed: result.metadata.tokensUsed,
            estimatedCost: result.metadata.estimatedCost
          },
          metadata: result.metadata
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save analysis history');
      }
    } catch (error) {
      // 이력 저장 실패는 분석 결과에 영향을 주지 않도록 함
      console.error('Error saving analysis history:', error);
    }
  }
}

// Create singleton instance and helper functions
const enhancedAnalysisService = new EnhancedAnalysisService();

export const aiHelpers = {
  analyzeExcel: async (params: any) => {
    // Map old API to new EnhancedAnalysisService
    return enhancedAnalysisService.analyze({
      type: 'hybrid',
      userId: params.userId,
      userTier: params.userTier || 'TIER2',
      sessionId: params.sessionId || Date.now().toString(),
      excelData: params.excelData || { sheets: [], summary: { totalSheets: 0, totalCells: 0, totalFormulas: 0, totalErrors: 0 } },
      imageDataArray: params.imageDataArray || [],
      query: params.content || params.query,
      options: params.options
    });
  },
  
  submitFeedback: async (params: any) => {
    // Placeholder for feedback submission
    console.log('Feedback received:', params);
    return { success: true };
  },
  
  getDashboardData: async (timeRange?: string) => {
    // Placeholder for dashboard data
    return {
      totalAnalyses: 0,
      activeUsers: 0,
      errorRate: 0,
      avgProcessingTime: 0
    };
  },
  
  getCostAnalysis: async () => {
    // Placeholder for cost analysis
    return {
      totalCost: 0,
      costByTier: {},
      costTrend: []
    };
  }
};