import { PaymentProvider, UserLocation } from './types';
import { TossPaymentsProvider } from './providers/toss';
import { StripeProvider } from './providers/stripe';

// 결제 게이트웨이 팩토리
export class PaymentGatewayFactory {
  private static tossProvider: TossPaymentsProvider | null = null;
  private static stripeProvider: StripeProvider | null = null;

  /**
   * 지역에 따른 결제 Provider 생성
   */
  static create(region: 'KR' | 'GLOBAL'): PaymentProvider {
    switch (region) {
      case 'KR':
        return this.getTossProvider();
      case 'GLOBAL':
        return this.getStripeProvider();
      default:
        throw new Error(`Unsupported region: ${region}`);
    }
  }

  /**
   * 사용자 위치 정보에 따른 결제 Provider 생성
   */
  static createFromLocation(location: UserLocation): PaymentProvider {
    return this.create(location.region);
  }

  /**
   * 토스페이먼츠 Provider 싱글톤
   */
  private static getTossProvider(): TossPaymentsProvider {
    if (!this.tossProvider) {
      const config = {
        testMode: process.env.NODE_ENV !== 'production',
        clientKey: process.env.TOSS_CLIENT_KEY || '',
        secretKey: process.env.TOSS_SECRET_KEY || '',
        widgetClientKey: process.env.TOSS_WIDGET_CLIENT_KEY || ''
      };

      if (!config.clientKey || !config.secretKey) {
        throw new Error('TossPayments configuration is missing');
      }

      this.tossProvider = new TossPaymentsProvider(config);
    }
    return this.tossProvider;
  }

  /**
   * Stripe Provider 싱글톤
   */
  private static getStripeProvider(): StripeProvider {
    if (!this.stripeProvider) {
      const config = {
        testMode: process.env.NODE_ENV !== 'production',
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
        secretKey: process.env.STRIPE_SECRET_KEY || '',
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || ''
      };

      if (!config.publishableKey || !config.secretKey) {
        throw new Error('Stripe configuration is missing');
      }

      this.stripeProvider = new StripeProvider(config);
    }
    return this.stripeProvider;
  }

  /**
   * 특정 Provider 직접 가져오기 (테스트용)
   */
  static getToss(): TossPaymentsProvider {
    return this.getTossProvider();
  }

  static getStripe(): StripeProvider {
    return this.getStripeProvider();
  }

  /**
   * Provider 초기화 (설정 변경 시)
   */
  static reset(): void {
    this.tossProvider = null;
    this.stripeProvider = null;
  }
}

// 결제 관련 환경 변수 타입
export interface PaymentEnvironmentVariables {
  // TossPayments
  TOSS_CLIENT_KEY?: string;
  TOSS_SECRET_KEY?: string;
  TOSS_WIDGET_CLIENT_KEY?: string;
  TOSS_WEBHOOK_URL?: string;

  // Stripe
  STRIPE_PUBLISHABLE_KEY?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_WEBHOOK_URL?: string;

  // IP Geolocation
  IP_GEOLOCATION_API_KEY?: string;
  IP_GEOLOCATION_SERVICE?: string;

  // Regional Settings
  ENABLE_REGIONAL_ROUTING?: string;
  KR_PAYMENT_GATEWAY?: string;
  GLOBAL_PAYMENT_GATEWAY?: string;
  PAYMENT_GATEWAY_DEFAULT?: string;
}

// 환경 변수 검증
export function validatePaymentEnvironment(): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // 토스페이먼츠 설정 검증
  if (process.env.KR_PAYMENT_GATEWAY === 'TOSS' || process.env.PAYMENT_GATEWAY_DEFAULT === 'TOSS') {
    if (!process.env.TOSS_CLIENT_KEY) {
      errors.push('TOSS_CLIENT_KEY is required for TossPayments');
    }
    if (!process.env.TOSS_SECRET_KEY) {
      errors.push('TOSS_SECRET_KEY is required for TossPayments');
    }
  }

  // Stripe 설정 검증
  if (process.env.GLOBAL_PAYMENT_GATEWAY === 'STRIPE' || process.env.PAYMENT_GATEWAY_DEFAULT === 'STRIPE') {
    if (!process.env.STRIPE_PUBLISHABLE_KEY) {
      errors.push('STRIPE_PUBLISHABLE_KEY is required for Stripe');
    }
    if (!process.env.STRIPE_SECRET_KEY) {
      errors.push('STRIPE_SECRET_KEY is required for Stripe');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}