import { PrismaClient } from "@prisma/client";
import { Result } from "@/Common/Result";
import { ExcelErrors } from "@/Common/Errors";

// 트랜잭션 타입 정의
export type PrismaTransaction = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

// 트랜잭션 옵션
export interface TransactionOptions {
  maxWait?: number; // 트랜잭션 대기 시간 (ms)
  timeout?: number; // 트랜잭션 실행 시간 (ms)
  isolationLevel?: 'Serializable' | 'ReadCommitted' | 'RepeatableRead';
}

// 트랜잭션 재시도 옵션
export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

/**
 * 트랜잭션을 안전하게 실행하는 유틸리티 클래스
 */
export class TransactionManager {
  constructor(private prisma: PrismaClient) {}

  /**
   * 트랜잭션 내에서 함수를 실행합니다.
   */
  async withTransaction<T>(
    operation: (tx: PrismaTransaction) => Promise<T>,
    options: TransactionOptions = {}
  ): Promise<Result<T>> {
    try {
      const result = await this.prisma.$transaction(
        operation,
        {
          maxWait: options.maxWait || 5000, // 5초 대기
          timeout: options.timeout || 10000, // 10초 타임아웃
          isolationLevel: options.isolationLevel || 'ReadCommitted'
        }
      );

      return Result.success(result);
    } catch (error: any) {
      console.error('Transaction failed:', error);
      
      // Prisma 에러 코드에 따른 분류
      if (error.code === 'P2034') {
        return Result.failure(ExcelErrors.ProcessingFailed); // Deadlock
      } else if (error.code === 'P2028') {
        return Result.failure(ExcelErrors.ProcessingFailed); // Timeout
      } else {
        return Result.failure(ExcelErrors.ProcessingFailed);
      }
    }
  }

  /**
   * 재시도 로직을 포함한 트랜잭션 실행
   */
  async withRetryableTransaction<T>(
    operation: (tx: PrismaTransaction) => Promise<T>,
    transactionOptions: TransactionOptions = {},
    retryOptions: RetryOptions = {}
  ): Promise<Result<T>> {
    const {
      maxRetries = 3,
      baseDelayMs = 100,
      maxDelayMs = 1000
    } = retryOptions;

    let lastError: any = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.prisma.$transaction(
          operation,
          {
            maxWait: transactionOptions.maxWait || 5000,
            timeout: transactionOptions.timeout || 10000,
            isolationLevel: transactionOptions.isolationLevel || 'ReadCommitted'
          }
        );

        return Result.success(result);
      } catch (error: any) {
        lastError = error;
        console.warn(`Transaction attempt ${attempt + 1} failed:`, error.message);

        // 재시도 가능한 에러인지 확인
        if (!this.isRetryableError(error) || attempt === maxRetries) {
          break;
        }

        // 지수 백오프로 대기
        const delay = Math.min(
          baseDelayMs * Math.pow(2, attempt),
          maxDelayMs
        );
        await this.sleep(delay);
      }
    }

    console.error(`Transaction failed after ${maxRetries + 1} attempts:`, lastError);
    
    // 최종 에러 처리
    if (lastError?.code === 'P2034') {
      return Result.failure(ExcelErrors.ProcessingFailed); // Deadlock
    } else if (lastError?.code === 'P2028') {
      return Result.failure(ExcelErrors.ProcessingFailed); // Timeout
    } else {
      return Result.failure(ExcelErrors.ProcessingFailed);
    }
  }

  /**
   * 재시도 가능한 에러인지 확인
   */
  private isRetryableError(error: any): boolean {
    const retryableCodes = [
      'P2034', // Deadlock
      'P2028', // Timeout
      'P2024', // Connection timeout
    ];

    return retryableCodes.includes(error.code);
  }

  /**
   * 지정된 시간만큼 대기
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 여러 작업을 하나의 트랜잭션으로 묶어서 실행
   */
  async batchOperations<T>(
    operations: Array<(tx: PrismaTransaction) => Promise<any>>,
    options: TransactionOptions = {}
  ): Promise<Result<T[]>> {
    return this.withTransaction(async (tx) => {
      const results = [];
      for (const operation of operations) {
        const result = await operation(tx);
        results.push(result);
      }
      return results;
    }, options);
  }

  /**
   * 조건부 트랜잭션 실행
   */
  async conditionalTransaction<T>(
    condition: () => Promise<boolean>,
    operation: (tx: PrismaTransaction) => Promise<T>,
    options: TransactionOptions = {}
  ): Promise<Result<T | null>> {
    return this.withTransaction(async (tx) => {
      const shouldExecute = await condition();
      if (!shouldExecute) {
        return null;
      }
      return await operation(tx);
    }, options);
  }
}