import { Result } from '@/Common/Result';

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  timeout?: number;
  retryableErrors?: string[];
}

export interface RetryResult<T> {
  attempts: number;
  finalError?: Error;
  successful: boolean;
  result?: T;
}

export class RetryManager {
  private static readonly DEFAULT_OPTIONS: Required<RetryOptions> = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    timeout: 30000,
    retryableErrors: [
      'NETWORK_ERROR',
      'TIMEOUT',
      'RATE_LIMIT',
      'TEMPORARY_FAILURE',
      'SERVICE_UNAVAILABLE'
    ]
  };

  static async withRetry<T>(
    operation: () => Promise<Result<T>>,
    options?: RetryOptions
  ): Promise<Result<T>> {
    const config = { ...this.DEFAULT_OPTIONS, ...options };
    let lastError: Error | undefined;
    let delay = config.initialDelay;

    for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
      try {
        // 타임아웃 처리
        const result = await this.withTimeout(
          operation(),
          config.timeout
        );

        if (result.isSuccess) {
          return result;
        }

        // 재시도 가능한 에러인지 확인
        if (!this.isRetryableError(result.error, config.retryableErrors)) {
          return result;
        }

        lastError = new Error(result.error.message || result.error.code);

        // 마지막 시도가 아니면 대기
        if (attempt < config.maxRetries) {
          await this.delay(delay);
          delay = Math.min(delay * config.backoffMultiplier, config.maxDelay);
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // 마지막 시도가 아니면 대기
        if (attempt < config.maxRetries) {
          await this.delay(delay);
          delay = Math.min(delay * config.backoffMultiplier, config.maxDelay);
        }
      }
    }

    return Result.failure({
      code: 'MAX_RETRIES_EXCEEDED',
      message: `작업이 ${config.maxRetries}번의 재시도 후에도 실패했습니다: ${lastError?.message}`
    });
  }

  static async withCircuitBreaker<T>(
    operation: () => Promise<Result<T>>,
    breakerKey: string,
    options?: {
      failureThreshold?: number;
      resetTimeout?: number;
      halfOpenRetries?: number;
    }
  ): Promise<Result<T>> {
    const breaker = CircuitBreakerManager.getBreaker(breakerKey, options);
    
    if (breaker.state === 'OPEN') {
      return Result.failure({
        code: 'CIRCUIT_BREAKER_OPEN',
        message: '서비스가 일시적으로 사용 불가능합니다. 잠시 후 다시 시도해 주세요.'
      });
    }

    try {
      const result = await operation();
      
      if (result.isSuccess) {
        breaker.onSuccess();
        return result;
      } else {
        breaker.onFailure();
        return result;
      }
    } catch (error) {
      breaker.onFailure();
      throw error;
    }
  }

  private static async withTimeout<T>(
    promise: Promise<T>,
    timeout: number
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`작업이 ${timeout}ms 내에 완료되지 않았습니다.`));
      }, timeout);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  private static isRetryableError(
    error: any,
    retryableErrors: string[]
  ): boolean {
    if (!error) return false;
    
    return retryableErrors.some(code => 
      error.code === code || 
      error.message?.includes(code)
    );
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Circuit Breaker 구현
interface CircuitBreaker {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  lastFailureTime?: number;
  successCount: number;
}

class CircuitBreakerManager {
  private static breakers = new Map<string, CircuitBreaker>();
  
  static getBreaker(
    key: string,
    options?: {
      failureThreshold?: number;
      resetTimeout?: number;
      halfOpenRetries?: number;
    }
  ): {
    state: string;
    onSuccess: () => void;
    onFailure: () => void;
  } {
    const config = {
      failureThreshold: options?.failureThreshold || 5,
      resetTimeout: options?.resetTimeout || 60000, // 1분
      halfOpenRetries: options?.halfOpenRetries || 3
    };

    if (!this.breakers.has(key)) {
      this.breakers.set(key, {
        state: 'CLOSED',
        failureCount: 0,
        successCount: 0
      });
    }

    const breaker = this.breakers.get(key)!;
    
    // 상태 업데이트 확인
    if (breaker.state === 'OPEN' && breaker.lastFailureTime) {
      const elapsed = Date.now() - breaker.lastFailureTime;
      if (elapsed > config.resetTimeout) {
        breaker.state = 'HALF_OPEN';
        breaker.successCount = 0;
      }
    }

    return {
      state: breaker.state,
      onSuccess: () => {
        if (breaker.state === 'HALF_OPEN') {
          breaker.successCount++;
          if (breaker.successCount >= config.halfOpenRetries) {
            breaker.state = 'CLOSED';
            breaker.failureCount = 0;
            breaker.successCount = 0;
          }
        } else if (breaker.state === 'CLOSED') {
          breaker.failureCount = 0;
        }
      },
      onFailure: () => {
        breaker.failureCount++;
        breaker.lastFailureTime = Date.now();
        
        if (breaker.failureCount >= config.failureThreshold) {
          breaker.state = 'OPEN';
        }
        
        if (breaker.state === 'HALF_OPEN') {
          breaker.state = 'OPEN';
          breaker.successCount = 0;
        }
      }
    };
  }
}