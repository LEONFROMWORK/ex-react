import { BasePaymentProvider } from './base';
import {
  PaymentAmount,
  PaymentCustomer,
  PaymentItem,
  PaymentIntent,
  PaymentResult,
  PaymentMethod,
  WebhookEvent,
  PaymentStatus
} from '../types';

// Stripe Provider 구현
export class StripeProvider extends BasePaymentProvider {
  private readonly baseURL = 'https://api.stripe.com/v1';
  private publishableKey: string;
  private webhookSecret: string;

  constructor(config: {
    testMode?: boolean;
    publishableKey: string;
    secretKey: string;
    webhookSecret: string;
  }) {
    super({
      testMode: config.testMode,
      apiKey: config.publishableKey,
      secretKey: config.secretKey
    });
    this.publishableKey = config.publishableKey;
    this.webhookSecret = config.webhookSecret;
  }

  getProviderName(): string {
    return 'Stripe';
  }

  protected getSupportedCurrencies(): string[] {
    return ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CNY'];
  }

  protected mapStatusToPaymentStatus(status: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      'requires_payment_method': 'pending',
      'requires_confirmation': 'pending',
      'requires_action': 'processing',
      'processing': 'processing',
      'requires_capture': 'processing',
      'succeeded': 'succeeded',
      'canceled': 'canceled',
      'failed': 'failed'
    };
    return statusMap[status] || 'pending';
  }

  private getAuthHeader(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': '2023-10-16'
    };
  }

  private encodeFormData(data: Record<string, any>): string {
    const encode = (key: string, value: any): string[] => {
      if (value === null || value === undefined) return [];
      
      if (Array.isArray(value)) {
        return value.flatMap((v, i) => encode(`${key}[${i}]`, v));
      }
      
      if (typeof value === 'object') {
        return Object.entries(value).flatMap(([k, v]) => 
          encode(`${key}[${k}]`, v)
        );
      }
      
      return [`${encodeURIComponent(key)}=${encodeURIComponent(value)}`];
    };

    return Object.entries(data)
      .flatMap(([key, value]) => encode(key, value))
      .join('&');
  }

  async createPaymentIntent(
    amount: PaymentAmount,
    customer: PaymentCustomer,
    items?: PaymentItem[],
    metadata?: Record<string, any>
  ): Promise<PaymentIntent> {
    this.validateAmount(amount);

    try {
      // Stripe는 가장 작은 통화 단위를 사용 (센트, 엔 등)
      const stripeAmount = amount.currency === 'JPY' 
        ? Math.round(amount.value) 
        : Math.round(amount.value * 100);

      const params = {
        amount: stripeAmount,
        currency: amount.currency.toLowerCase(),
        automatic_payment_methods: { enabled: true },
        metadata: {
          ...metadata,
          customerName: customer.name,
          customerEmail: customer.email
        }
      };

      if (customer.email) {
        params['receipt_email'] = customer.email;
      }

      if (items && items.length > 0) {
        params.metadata['orderDescription'] = items
          .map(item => `${item.name} x${item.quantity}`)
          .join(', ');
      }

      const response = await fetch(`${this.baseURL}/payment_intents`, {
        method: 'POST',
        headers: this.getAuthHeader(),
        body: this.encodeFormData(params)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || '결제 인텐트 생성에 실패했습니다.');
      }

      const paymentIntent: PaymentIntent = {
        id: data.id,
        amount: amount,
        status: this.mapStatusToPaymentStatus(data.status),
        customer: customer,
        items: items,
        metadata: {
          ...metadata,
          stripePaymentIntentId: data.id,
          clientSecret: data.client_secret
        },
        createdAt: new Date(data.created * 1000),
        updatedAt: new Date(data.created * 1000)
      };

      this.log('Payment intent created', paymentIntent);
      return paymentIntent;
    } catch (error) {
      this.logError('Failed to create payment intent', error);
      throw error;
    }
  }

  async confirmPayment(
    paymentIntentId: string,
    paymentMethod?: PaymentMethod
  ): Promise<PaymentResult> {
    try {
      const response = await fetch(
        `${this.baseURL}/payment_intents/${paymentIntentId}/confirm`,
        {
          method: 'POST',
          headers: this.getAuthHeader(),
          body: this.encodeFormData({
            payment_method: paymentMethod?.id
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          status: 'failed',
          error: this.createError(
            data.error?.code || 'UNKNOWN_ERROR',
            data.error?.message || '결제 확인에 실패했습니다.'
          )
        };
      }

      return {
        success: data.status === 'succeeded',
        paymentIntentId: data.id,
        status: this.mapStatusToPaymentStatus(data.status),
        transactionId: data.charges?.data[0]?.id,
        receipt: data.charges?.data[0]?.receipt_url ? {
          url: data.charges.data[0].receipt_url,
          id: data.charges.data[0].id
        } : undefined
      };
    } catch (error) {
      this.logError('Failed to confirm payment', error);
      return {
        success: false,
        status: 'failed',
        error: this.createError('CONFIRM_FAILED', '결제 확인 중 오류가 발생했습니다.')
      };
    }
  }

  async cancelPayment(
    paymentIntentId: string,
    reason?: string
  ): Promise<PaymentResult> {
    try {
      const response = await fetch(
        `${this.baseURL}/payment_intents/${paymentIntentId}/cancel`,
        {
          method: 'POST',
          headers: this.getAuthHeader(),
          body: this.encodeFormData({
            cancellation_reason: reason || 'requested_by_customer'
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          status: 'failed',
          error: this.createError(
            data.error?.code || 'CANCEL_FAILED',
            data.error?.message || '결제 취소에 실패했습니다.'
          )
        };
      }

      return {
        success: true,
        paymentIntentId: data.id,
        status: 'canceled',
        transactionId: data.id
      };
    } catch (error) {
      this.logError('Failed to cancel payment', error);
      return {
        success: false,
        status: 'failed',
        error: this.createError('CANCEL_ERROR', '결제 취소 중 오류가 발생했습니다.')
      };
    }
  }

  async refundPayment(
    paymentIntentId: string,
    amount?: number,
    reason?: string
  ): Promise<PaymentResult> {
    try {
      const params: any = {
        payment_intent: paymentIntentId,
        reason: reason || 'requested_by_customer'
      };

      if (amount) {
        // Stripe는 센트 단위 사용
        params.amount = Math.round(amount * 100);
      }

      const response = await fetch(`${this.baseURL}/refunds`, {
        method: 'POST',
        headers: this.getAuthHeader(),
        body: this.encodeFormData(params)
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          status: 'failed',
          error: this.createError(
            data.error?.code || 'REFUND_FAILED',
            data.error?.message || '환불 처리에 실패했습니다.'
          )
        };
      }

      return {
        success: true,
        paymentIntentId: paymentIntentId,
        status: amount ? 'partial_refunded' : 'refunded',
        transactionId: data.id,
        receipt: data.receipt_url ? {
          url: data.receipt_url,
          id: data.id
        } : undefined
      };
    } catch (error) {
      this.logError('Failed to refund payment', error);
      return {
        success: false,
        status: 'failed',
        error: this.createError('REFUND_ERROR', '환불 처리 중 오류가 발생했습니다.')
      };
    }
  }

  async getPaymentStatus(paymentIntentId: string): Promise<PaymentIntent> {
    try {
      const response = await fetch(
        `${this.baseURL}/payment_intents/${paymentIntentId}`,
        {
          method: 'GET',
          headers: this.getAuthHeader()
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || '결제 정보를 조회할 수 없습니다.');
      }

      const amount = data.currency === 'jpy' 
        ? data.amount 
        : data.amount / 100;

      return {
        id: data.id,
        amount: {
          value: amount,
          currency: data.currency.toUpperCase() as any
        },
        status: this.mapStatusToPaymentStatus(data.status),
        customer: {
          name: data.metadata?.customerName || '',
          email: data.metadata?.customerEmail || data.receipt_email || ''
        },
        metadata: {
          ...data.metadata,
          paymentMethodTypes: data.payment_method_types,
          charges: data.charges?.data
        },
        createdAt: new Date(data.created * 1000),
        updatedAt: new Date(data.created * 1000)
      };
    } catch (error) {
      this.logError('Failed to get payment status', error);
      throw error;
    }
  }

  async handleWebhook(
    payload: any,
    signature: string
  ): Promise<WebhookEvent> {
    try {
      // Stripe 웹훅 서명 검증
      // 실제 구현에서는 stripe 패키지의 constructEvent 사용 권장
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex');

      if (signature !== expectedSignature) {
        throw new Error('Invalid webhook signature');
      }

      const event: WebhookEvent = {
        id: payload.id,
        type: payload.type,
        data: payload.data,
        createdAt: new Date(payload.created * 1000)
      };

      this.log('Webhook received', event);
      return event;
    } catch (error) {
      this.logError('Failed to handle webhook', error);
      throw error;
    }
  }

  // Stripe 전용 메서드
  getPublishableKey(): string {
    return this.publishableKey;
  }

  // 클라이언트 시크릿 생성 (Stripe Elements용)
  getClientSecret(paymentIntentId: string): string {
    return `${paymentIntentId}_secret_${this.testMode ? 'test' : 'live'}`;
  }
}