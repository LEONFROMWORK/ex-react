import { 
  PaymentProvider, 
  PaymentAmount, 
  PaymentCustomer, 
  PaymentItem, 
  PaymentIntent, 
  PaymentResult, 
  PaymentMethod,
  WebhookEvent,
  PaymentStatus,
  PaymentError
} from '../types';

// 기본 Payment Provider 추상 클래스
export abstract class BasePaymentProvider implements PaymentProvider {
  protected testMode: boolean;
  protected apiKey: string;
  protected secretKey: string;

  constructor(config: {
    testMode?: boolean;
    apiKey: string;
    secretKey: string;
  }) {
    this.testMode = config.testMode ?? true;
    this.apiKey = config.apiKey;
    this.secretKey = config.secretKey;
  }

  // 추상 메서드들
  abstract createPaymentIntent(
    amount: PaymentAmount,
    customer: PaymentCustomer,
    items?: PaymentItem[],
    metadata?: Record<string, any>
  ): Promise<PaymentIntent>;

  abstract confirmPayment(
    paymentIntentId: string,
    paymentMethod?: PaymentMethod
  ): Promise<PaymentResult>;

  abstract cancelPayment(
    paymentIntentId: string,
    reason?: string
  ): Promise<PaymentResult>;

  abstract refundPayment(
    paymentIntentId: string,
    amount?: number,
    reason?: string
  ): Promise<PaymentResult>;

  abstract getPaymentStatus(paymentIntentId: string): Promise<PaymentIntent>;

  abstract handleWebhook(
    payload: any,
    signature: string
  ): Promise<WebhookEvent>;

  abstract getProviderName(): string;

  // 공통 유틸리티 메서드들
  protected generatePaymentIntentId(): string {
    const prefix = this.testMode ? 'test_' : 'live_';
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 9);
    return `${prefix}pi_${timestamp}_${random}`;
  }

  protected createError(code: string, message: string, details?: any): PaymentError {
    return {
      code,
      message,
      details
    };
  }

  protected mapStatusToPaymentStatus(providerStatus: string): PaymentStatus {
    // 각 Provider에서 오버라이드하여 구현
    return 'pending';
  }

  protected validateAmount(amount: PaymentAmount): void {
    if (amount.value <= 0) {
      throw new Error('결제 금액은 0보다 커야 합니다.');
    }

    const supportedCurrencies = this.getSupportedCurrencies();
    if (!supportedCurrencies.includes(amount.currency)) {
      throw new Error(`지원하지 않는 통화입니다: ${amount.currency}`);
    }
  }

  protected getSupportedCurrencies(): string[] {
    // 각 Provider에서 오버라이드하여 구현
    return ['USD'];
  }

  // 로깅 헬퍼
  protected log(message: string, data?: any): void {
    if (this.testMode) {
      console.log(`[${this.getProviderName()}] ${message}`, data || '');
    }
  }

  protected logError(message: string, error: any): void {
    console.error(`[${this.getProviderName()}] ${message}`, error);
  }
}