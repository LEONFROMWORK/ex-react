import { Result } from '@/Common/Result';
import { RetryManager } from '@/Common/Utils/RetryManager';
import { progressManager } from '@/lib/websocket/analysis-progress';

export interface RecoveryOptions {
  autoRetry?: boolean;
  maxRetries?: number;
  savePartialResults?: boolean;
  notifyUser?: boolean;
}

export interface RecoveryContext {
  sessionId: string;
  stage: 'upload' | 'processing' | 'analysis' | 'download';
  error: Error;
  attemptNumber: number;
  partialData?: any;
}

export class ErrorRecoveryService {
  private static readonly ERROR_STRATEGIES = {
    // 업로드 관련 에러
    FILE_TOO_LARGE: {
      retryable: false,
      suggestion: '파일 크기를 줄이거나 압축해 주세요. 최대 크기: 50MB',
      action: 'USER_ACTION_REQUIRED'
    },
    NETWORK_ERROR: {
      retryable: true,
      suggestion: '네트워크 연결을 확인해 주세요.',
      action: 'AUTO_RETRY'
    },
    INVALID_FILE_FORMAT: {
      retryable: false,
      suggestion: '올바른 Excel 파일 형식(.xlsx, .xls, .csv)을 사용해 주세요.',
      action: 'USER_ACTION_REQUIRED'
    },
    
    // AI 분석 관련 에러
    RATE_LIMIT_EXCEEDED: {
      retryable: true,
      suggestion: '요청 한도를 초과했습니다. 잠시 후 다시 시도됩니다.',
      action: 'AUTO_RETRY_WITH_DELAY'
    },
    AI_SERVICE_ERROR: {
      retryable: true,
      suggestion: 'AI 서비스가 일시적으로 사용 불가능합니다.',
      action: 'FALLBACK_TO_LOWER_TIER'
    },
    INSUFFICIENT_CREDITS: {
      retryable: false,
      suggestion: '크레딧이 부족합니다. 충전 후 다시 시도해 주세요.',
      action: 'USER_ACTION_REQUIRED'
    },
    
    // 처리 관련 에러
    MEMORY_LIMIT_EXCEEDED: {
      retryable: true,
      suggestion: '메모리 부족으로 처리에 실패했습니다. 파일을 분할하여 처리합니다.',
      action: 'CHUNK_PROCESSING'
    },
    TIMEOUT: {
      retryable: true,
      suggestion: '처리 시간이 초과되었습니다. 다시 시도합니다.',
      action: 'AUTO_RETRY'
    }
  };

  // 에러 복구 실행
  static async handleError(
    context: RecoveryContext,
    options: RecoveryOptions = {}
  ): Promise<Result<any>> {
    const strategy = this.getRecoveryStrategy(context.error);
    
    // 사용자에게 에러 알림
    if (options.notifyUser) {
      progressManager.updateProgress(
        context.sessionId,
        context.stage,
        'error',
        0,
        `에러 발생: ${strategy.suggestion}`
      );
    }

    // 부분 결과 저장
    if (options.savePartialResults && context.partialData) {
      await this.savePartialResults(context);
    }

    // 복구 전략 실행
    switch (strategy.action) {
      case 'AUTO_RETRY':
        return await this.autoRetry(context, options);
        
      case 'AUTO_RETRY_WITH_DELAY':
        return await this.autoRetryWithDelay(context, options);
        
      case 'FALLBACK_TO_LOWER_TIER':
        return await this.fallbackToLowerTier(context);
        
      case 'CHUNK_PROCESSING':
        return await this.chunkProcessing(context);
        
      case 'USER_ACTION_REQUIRED':
        return Result.failure({
          code: 'USER_ACTION_REQUIRED',
          message: strategy.suggestion,
          recoverable: false
        });
        
      default:
        return Result.failure({
          code: 'UNRECOVERABLE_ERROR',
          message: '복구할 수 없는 에러가 발생했습니다.'
        });
    }
  }

  // 자동 재시도
  private static async autoRetry(
    context: RecoveryContext,
    options: RecoveryOptions
  ): Promise<Result<any>> {
    if (!options.autoRetry || context.attemptNumber >= (options.maxRetries || 3)) {
      return Result.failure({
        code: 'MAX_RETRIES_EXCEEDED',
        message: '최대 재시도 횟수를 초과했습니다.'
      });
    }

    progressManager.updateProgress(
      context.sessionId,
      context.stage,
      'processing',
      0,
      `재시도 중... (${context.attemptNumber + 1}/${options.maxRetries || 3})`
    );

    // 재시도 로직은 호출하는 쪽에서 구현
    return Result.success({
      action: 'RETRY',
      attemptNumber: context.attemptNumber + 1
    });
  }

  // 지연된 자동 재시도
  private static async autoRetryWithDelay(
    context: RecoveryContext,
    options: RecoveryOptions
  ): Promise<Result<any>> {
    const delay = Math.min(1000 * Math.pow(2, context.attemptNumber), 30000); // 최대 30초
    
    progressManager.updateProgress(
      context.sessionId,
      context.stage,
      'processing',
      0,
      `${delay / 1000}초 후 재시도합니다...`
    );

    await new Promise(resolve => setTimeout(resolve, delay));
    
    return this.autoRetry(context, options);
  }

  // 하위 티어로 폴백
  private static async fallbackToLowerTier(
    context: RecoveryContext
  ): Promise<Result<any>> {
    const tierFallback = {
      'TIER3': 'TIER2',
      'TIER2': 'TIER1',
      'TIER1': null
    };

    const currentTier = context.partialData?.tier || 'TIER2';
    const fallbackTier = tierFallback[currentTier as keyof typeof tierFallback];

    if (!fallbackTier) {
      return Result.failure({
        code: 'NO_FALLBACK_AVAILABLE',
        message: '사용 가능한 대체 티어가 없습니다.'
      });
    }

    progressManager.updateProgress(
      context.sessionId,
      context.stage,
      'processing',
      0,
      `${fallbackTier}로 재시도합니다...`
    );

    return Result.success({
      action: 'FALLBACK',
      fallbackTier
    });
  }

  // 청크 단위 처리
  private static async chunkProcessing(
    context: RecoveryContext
  ): Promise<Result<any>> {
    progressManager.updateProgress(
      context.sessionId,
      context.stage,
      'processing',
      0,
      '파일을 분할하여 처리합니다...'
    );

    return Result.success({
      action: 'CHUNK_PROCESSING',
      chunkSize: 1000 // 행 단위
    });
  }

  // 부분 결과 저장
  private static async savePartialResults(
    context: RecoveryContext
  ): Promise<void> {
    try {
      const { prisma } = await import('@/lib/prisma');
      
      await prisma.partialResult.create({
        data: {
          sessionId: context.sessionId,
          stage: context.stage,
          data: context.partialData,
          errorMessage: context.error.message,
          attemptNumber: context.attemptNumber,
          createdAt: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to save partial results:', error);
    }
  }

  // 복구 전략 결정
  private static getRecoveryStrategy(error: Error): {
    retryable: boolean;
    suggestion: string;
    action: string;
  } {
    const errorCode = (error as any).code || error.message;
    
    for (const [code, strategy] of Object.entries(this.ERROR_STRATEGIES)) {
      if (errorCode.includes(code)) {
        return strategy;
      }
    }

    // 기본 전략
    return {
      retryable: true,
      suggestion: '일시적인 오류가 발생했습니다. 다시 시도합니다.',
      action: 'AUTO_RETRY'
    };
  }

  // 에러 로깅
  static async logError(
    context: RecoveryContext,
    resolution?: string
  ): Promise<void> {
    try {
      const { prisma } = await import('@/lib/prisma');
      
      await prisma.errorLog.create({
        data: {
          sessionId: context.sessionId,
          stage: context.stage,
          errorMessage: context.error.message,
          errorStack: context.error.stack,
          attemptNumber: context.attemptNumber,
          resolution,
          metadata: {
            partialData: context.partialData,
            timestamp: new Date().toISOString()
          }
        }
      });
    } catch (error) {
      console.error('Failed to log error:', error);
    }
  }

  // 세션 복구
  static async recoverSession(sessionId: string): Promise<Result<any>> {
    try {
      const { prisma } = await import('@/lib/prisma');
      
      // 마지막 성공한 단계 조회
      const lastSuccess = await prisma.analysisHistory.findFirst({
        where: { analysisId: sessionId },
        orderBy: { createdAt: 'desc' }
      });

      // 부분 결과 조회
      const partialResults = await prisma.partialResult.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'desc' }
      });

      if (!lastSuccess && partialResults.length === 0) {
        return Result.failure({
          code: 'NO_RECOVERY_DATA',
          message: '복구할 데이터가 없습니다.'
        });
      }

      return Result.success({
        lastSuccess,
        partialResults,
        recoveryPoint: partialResults[0]?.stage || 'upload'
      });
    } catch (error) {
      return Result.failure({
        code: 'RECOVERY_FAILED',
        message: '세션 복구에 실패했습니다.'
      });
    }
  }
}