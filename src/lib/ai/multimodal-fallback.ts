/**
 * 멀티모달 AI 폴백 시스템
 * Vision 모델 간 지능적 폴백 및 텍스트 전용 모드 지원
 */

import { MultimodalQualityAssessor, AIResponse, QualityAssessment } from './quality-assessment';
import { OpenRouterProvider } from './providers/openrouter';

export interface VisionAnalysisRequest {
  imageData: string; // Base64 encoded image
  textPrompt: string;
  userTier: 'TIER1' | 'TIER2' | 'TIER3';
  userId?: string;
  options?: {
    maxRetries?: number;
    qualityThreshold?: number;
    timeout?: number;
  };
}

export interface AnalysisResult {
  success: boolean;
  content?: string;
  modelUsed?: string;
  confidence?: number;
  isTextOnly?: boolean;
  warning?: string;
  attempts: AttemptRecord[];
  totalCost?: number;
  processingTime: number;
  qualityAssessment?: QualityAssessment;
}

export interface AttemptRecord {
  model: string;
  timestamp: Date;
  success: boolean;
  score?: number;
  error?: string;
  cost?: number;
  duration?: number;
}

interface ModelConfig {
  model: string;
  costPer1kTokens: number;
  timeout: number;
  strengths: string[];
  weaknesses: string[];
}

export class MultimodalFallbackService {
  private qualityAssessor: MultimodalQualityAssessor;
  private openRouterProvider: OpenRouterProvider;

  // Tier별 모델 체인 설정
  private tierConfigs = {
    TIER1: {
      vision: [
        {
          model: 'google/gemini-1.5-flash',
          costPer1kTokens: 0.00035,
          timeout: 5000,
          strengths: ['fast', 'cheap', 'good_ocr'],
          weaknesses: ['complex_charts']
        }
      ],
      chat: ['deepseek/deepseek-chat'],
      maxRetries: 1,
      qualityThreshold: 0.7
    },
    TIER2: {
      vision: [
        {
          model: 'google/gemini-1.5-flash',
          costPer1kTokens: 0.00035,
          timeout: 5000,
          strengths: ['fast', 'cheap', 'good_ocr'],
          weaknesses: ['complex_charts']
        },
        {
          model: 'anthropic/claude-3-haiku',
          costPer1kTokens: 0.00025,
          timeout: 8000,
          strengths: ['structured_data', 'tables'],
          weaknesses: ['handwriting']
        }
      ],
      chat: ['openai/gpt-3.5-turbo'],
      maxRetries: 2,
      qualityThreshold: 0.75
    },
    TIER3: {
      vision: [
        {
          model: 'anthropic/claude-3-haiku',
          costPer1kTokens: 0.00025,
          timeout: 8000,
          strengths: ['structured_data', 'tables'],
          weaknesses: ['handwriting']
        },
        {
          model: 'openai/gpt-4-vision-preview',
          costPer1kTokens: 0.01,
          timeout: 15000,
          strengths: ['comprehensive', 'accurate'],
          weaknesses: ['slow', 'expensive']
        },
        {
          model: 'openai/gpt-4o',
          costPer1kTokens: 0.005,
          timeout: 12000,
          strengths: ['best_quality', 'multimodal'],
          weaknesses: ['expensive']
        }
      ],
      chat: ['openai/gpt-4-turbo'],
      maxRetries: 3,
      qualityThreshold: 0.8
    }
  };

  constructor() {
    this.qualityAssessor = new MultimodalQualityAssessor();
    this.openRouterProvider = new OpenRouterProvider(
      process.env.OPENROUTER_API_KEY || '',
      'google/gemini-1.5-flash' // 기본 모델
    );
  }

  /**
   * 스마트 폴백을 사용한 이미지 분석
   */
  async analyzeWithSmartFallback(
    request: VisionAnalysisRequest
  ): Promise<AnalysisResult> {
    const startTime = Date.now();
    const tierConfig = this.tierConfigs[request.userTier];
    const attempts: AttemptRecord[] = [];
    let totalCost = 0;

    // Vision 모델 체인 시도
    for (const modelConfig of tierConfig.vision) {
      const attemptStartTime = Date.now();
      
      try {
        // 1. Vision 모델로 분석 시도
        const result = await this.tryVisionModel(
          modelConfig,
          request.imageData,
          request.textPrompt,
          request.options?.timeout || modelConfig.timeout
        );

        // 2. 품질 평가
        const quality = this.qualityAssessor.calculateConfidenceScore(
          result,
          modelConfig.model,
          true // isImageAnalysis
        );

        // 3. 비용 계산
        const tokensUsed = result.tokensUsed || 1000; // 예상값
        const cost = (tokensUsed / 1000) * modelConfig.costPer1kTokens;
        totalCost += cost;

        // 4. 시도 기록
        attempts.push({
          model: modelConfig.model,
          timestamp: new Date(),
          success: quality.recommendation === 'accept',
          score: quality.score,
          cost,
          duration: Date.now() - attemptStartTime
        });

        // 5. 품질 기준 통과 확인
        if (quality.recommendation === 'accept' || 
            (quality.score >= tierConfig.qualityThreshold)) {
          return {
            success: true,
            content: result.content,
            modelUsed: modelConfig.model,
            confidence: quality.score,
            attempts,
            totalCost,
            processingTime: Date.now() - startTime,
            qualityAssessment: quality
          };
        }

        // 6. retry 권장시 재시도
        if (quality.recommendation === 'retry' && 
            attempts.length < tierConfig.maxRetries) {
          console.log(`품질 미달 (${quality.score}), 같은 모델로 재시도...`);
          
          const retryResult = await this.tryVisionModel(
            modelConfig,
            request.imageData,
            request.textPrompt,
            modelConfig.timeout
          );
          
          const retryQuality = this.qualityAssessor.calculateConfidenceScore(
            retryResult,
            modelConfig.model,
            true
          );

          if (retryQuality.score > quality.score && 
              retryQuality.score >= tierConfig.qualityThreshold) {
            return {
              success: true,
              content: retryResult.content,
              modelUsed: modelConfig.model,
              confidence: retryQuality.score,
              attempts,
              totalCost,
              processingTime: Date.now() - startTime,
              qualityAssessment: retryQuality
            };
          }
        }

      } catch (error: any) {
        console.error(`Model ${modelConfig.model} failed:`, error);

        // 오류 기록
        attempts.push({
          model: modelConfig.model,
          timestamp: new Date(),
          success: false,
          error: error.message,
          duration: Date.now() - attemptStartTime
        });

        // 치명적 오류인지 확인
        if (!this.shouldContinueFallback(error)) {
          throw new Error(`치명적 오류 발생: ${error.message}`);
        }
      }
    }

    // 모든 Vision 모델 실패시 텍스트 전용 폴백
    console.log('모든 Vision 모델 실패, 텍스트 전용 모드로 전환...');
    return this.fallbackToTextOnly(
      request.textPrompt,
      request.userTier,
      attempts,
      totalCost,
      startTime
    );
  }

  /**
   * Vision 모델 호출
   */
  private async tryVisionModel(
    modelConfig: ModelConfig,
    imageData: string,
    textPrompt: string,
    timeout: number
  ): Promise<AIResponse> {
    // OpenRouter를 통한 Vision API 호출
    const messages = [
      {
        role: 'user' as const,
        content: [
          {
            type: 'text' as const,
            text: this.buildVisionPrompt(textPrompt)
          },
          {
            type: 'image_url' as const,
            image_url: {
              url: `data:image/jpeg;base64,${imageData}`,
              detail: 'high' as const
            }
          }
        ]
      }
    ];

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), timeout);
    });

    try {
      const responsePromise = this.openRouterProvider.generateVisionResponse(
        modelConfig.model,
        messages,
        {
          temperature: 0.3,
          maxTokens: 1500
        }
      );

      const response = await Promise.race([responsePromise, timeoutPromise]);
      
      return {
        content: response.content || '',
        model: modelConfig.model,
        tokensUsed: response.usage?.total_tokens,
        processingTime: response.processingTime
      };
    } catch (error: any) {
      throw new Error(`Vision model error: ${error.message}`);
    }
  }

  /**
   * 텍스트 전용 폴백
   */
  private async fallbackToTextOnly(
    textPrompt: string,
    userTier: string,
    previousAttempts: AttemptRecord[],
    previousCost: number,
    startTime: number
  ): Promise<AnalysisResult> {
    const chatModels = this.tierConfigs[userTier].chat;
    
    for (const model of chatModels) {
      try {
        const result = await this.openRouterProvider.generateResponse(
          this.buildTextOnlyPrompt(textPrompt),
          {
            model,
            temperature: 0.5,
            maxTokens: 1000
          }
        );

        return {
          success: true,
          content: result.content || '',
          modelUsed: model,
          confidence: 0.6, // 텍스트 전용은 낮은 신뢰도
          isTextOnly: true,
          warning: '이미지 분석이 불가능하여 텍스트 기반 답변을 제공합니다. 스크린샷의 내용을 텍스트로 설명해 주시면 더 정확한 도움을 드릴 수 있습니다.',
          attempts: previousAttempts,
          totalCost: previousCost,
          processingTime: Date.now() - startTime
        };
      } catch (error) {
        console.error(`Text model ${model} failed:`, error);
        continue;
      }
    }

    return {
      success: false,
      attempts: previousAttempts,
      totalCost: previousCost,
      processingTime: Date.now() - startTime,
      warning: '모든 AI 모델이 일시적으로 사용 불가능합니다. 잠시 후 다시 시도해 주세요.'
    };
  }

  /**
   * 폴백 계속 여부 판단
   */
  private shouldContinueFallback(error: any): boolean {
    const errorMessage = error.message || error.toString();

    // 재시도 가능한 오류
    const retryableErrors = [
      /rate limit/i,
      /quota/i,
      /model.*unavailable/i,
      /timeout/i,
      /temporary/i,
      /503/,
      /429/
    ];

    // 치명적 오류 (재시도 불가)
    const fatalErrors = [
      /authentication/i,
      /invalid.*api.*key/i,
      /forbidden/i,
      /401/,
      /403/
    ];

    // 치명적 오류면 즉시 중단
    if (fatalErrors.some(pattern => pattern.test(errorMessage))) {
      return false;
    }

    // 재시도 가능한 오류면 계속
    return retryableErrors.some(pattern => pattern.test(errorMessage));
  }

  /**
   * Vision 프롬프트 생성
   */
  private buildVisionPrompt(userPrompt: string): string {
    return `당신은 Excel 전문가입니다. 제공된 Excel 스크린샷을 분석하고 사용자의 질문에 답변해주세요.

사용자 질문: ${userPrompt}

분석 시 다음 사항을 포함해주세요:
1. 스크린샷에서 확인되는 Excel 오류나 문제점
2. 구체적인 셀 위치나 범위 언급 (예: A1, B2:C10)
3. 발견된 수식이나 함수
4. 데이터 구조나 형식 문제
5. 해결 방법과 단계별 조치 사항

가능한 한 구체적이고 실행 가능한 조언을 제공해주세요.`;
  }

  /**
   * 텍스트 전용 프롬프트 생성
   */
  private buildTextOnlyPrompt(userPrompt: string): string {
    return `사용자가 Excel 스크린샷에 대해 질문했지만, 이미지를 분석할 수 없습니다.
텍스트 설명만으로 도움을 제공해주세요.

사용자 질문: ${userPrompt}

다음과 같이 답변해주세요:
1. 일반적인 Excel 문제 해결 방법 제시
2. 사용자가 확인해야 할 사항 안내
3. 텍스트로 상황을 설명하도록 요청
4. 가능한 해결책 제안`;
  }

  /**
   * 모델 성능 통계 조회
   */
  async getModelPerformanceStats(): Promise<Record<string, any>> {
    // TODO: 데이터베이스에서 모델별 성능 통계 조회
    return {
      'google/gemini-1.5-flash': {
        avgScore: 0.82,
        successRate: 0.78,
        avgResponseTime: 2.3
      },
      'anthropic/claude-3-haiku': {
        avgScore: 0.87,
        successRate: 0.85,
        avgResponseTime: 3.1
      },
      'openai/gpt-4-vision-preview': {
        avgScore: 0.94,
        successRate: 0.92,
        avgResponseTime: 5.7
      }
    };
  }
}