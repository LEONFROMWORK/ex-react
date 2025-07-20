import { Result } from '@/src/Common/Result';

export interface RetryOptions {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: any) => boolean;
}

export class RetryManager {
  static async retry<T>(
    operation: () => Promise<T>,
    options: RetryOptions
  ): Promise<Result<T>> {
    const {
      maxAttempts,
      delayMs,
      backoffMultiplier = 1,
      shouldRetry = () => true
    } = options;

    let lastError: any;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await operation();
        return Result.success(result);
      } catch (error) {
        lastError = error;
        
        if (attempt === maxAttempts || !shouldRetry(error)) {
          break;
        }
        
        const delay = delayMs * Math.pow(backoffMultiplier, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return Result.failure({
      code: 'RETRY_FAILED',
      message: `Operation failed after ${maxAttempts} attempts`,
      details: lastError
    });
  }
}