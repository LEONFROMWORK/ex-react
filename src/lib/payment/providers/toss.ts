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

// 토스페이먼츠 Provider 구현
export class TossPaymentsProvider extends BasePaymentProvider {
  private readonly baseURL = 'https://api.tosspayments.com/v1';
  private widgetClientKey: string;

  constructor(config: {
    testMode?: boolean;
    clientKey: string;
    secretKey: string;
    widgetClientKey: string;
  }) {
    super({
      testMode: config.testMode,
      apiKey: config.clientKey,
      secretKey: config.secretKey
    });
    this.widgetClientKey = config.widgetClientKey;
  }

  getProviderName(): string {
    return 'TossPayments';
  }

  protected getSupportedCurrencies(): string[] {
    return ['KRW'];
  }

  protected mapStatusToPaymentStatus(status: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      'READY': 'pending',
      'IN_PROGRESS': 'processing',
      'WAITING_FOR_DEPOSIT': 'processing',
      'DONE': 'succeeded',
      'CANCELED': 'canceled',
      'PARTIAL_CANCELED': 'partial_refunded',
      'ABORTED': 'failed',
      'EXPIRED': 'failed'
    };
    return statusMap[status] || 'pending';
  }

  private getAuthHeader(): string {
    // Basic 인증: secretKey를 base64로 인코딩
    const encodedKey = Buffer.from(this.secretKey + ':').toString('base64');
    return `Basic ${encodedKey}`;
  }

  async createPaymentIntent(
    amount: PaymentAmount,
    customer: PaymentCustomer,
    items?: PaymentItem[],
    metadata?: Record<string, any>
  ): Promise<PaymentIntent> {
    this.validateAmount(amount);

    const orderId = this.generatePaymentIntentId();
    const orderName = items && items.length > 0 
      ? items[0].name + (items.length > 1 ? ` 외 ${items.length - 1}건` : '')
      : '주문';

    try {
      // 토스페이먼츠는 클라이언트에서 결제창을 띄우고 서버에서 승인하는 방식
      // 여기서는 주문 정보만 생성
      const paymentIntent: PaymentIntent = {
        id: orderId,
        amount: amount,
        status: 'pending',
        customer: customer,
        items: items,
        metadata: {
          ...metadata,
          orderName,
          tossOrderId: orderId
        },
        createdAt: new Date(),
        updatedAt: new Date()
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
      const response = await fetch(`${this.baseURL}/payments/confirm`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paymentKey: paymentIntentId,
          orderId: paymentIntentId,
          amount: paymentMethod?.metadata?.amount
        })
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          status: 'failed',
          error: this.createError(
            data.code || 'UNKNOWN_ERROR',
            data.message || '결제 승인에 실패했습니다.'
          )
        };
      }

      return {
        success: true,
        paymentIntentId: data.paymentKey,
        status: this.mapStatusToPaymentStatus(data.status),
        transactionId: data.transactionKey,
        receipt: data.receipt ? {
          url: data.receipt.url,
          id: data.receiptKey
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
        `${this.baseURL}/payments/${paymentIntentId}/cancel`,
        {
          method: 'POST',
          headers: {
            'Authorization': this.getAuthHeader(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            cancelReason: reason || '고객 요청'
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          status: 'failed',
          error: this.createError(
            data.code || 'CANCEL_FAILED',
            data.message || '결제 취소에 실패했습니다.'
          )
        };
      }

      return {
        success: true,
        paymentIntentId: data.paymentKey,
        status: 'canceled',
        transactionId: data.transactionKey
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
      const body: any = {
        cancelReason: reason || '고객 요청'
      };

      if (amount) {
        body.cancelAmount = amount;
      }

      const response = await fetch(
        `${this.baseURL}/payments/${paymentIntentId}/cancel`,
        {
          method: 'POST',
          headers: {
            'Authorization': this.getAuthHeader(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          status: 'failed',
          error: this.createError(
            data.code || 'REFUND_FAILED',
            data.message || '환불 처리에 실패했습니다.'
          )
        };
      }

      return {
        success: true,
        paymentIntentId: data.paymentKey,
        status: amount && amount < data.totalAmount ? 'partial_refunded' : 'refunded',
        transactionId: data.transactionKey
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
        `${this.baseURL}/payments/${paymentIntentId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': this.getAuthHeader()
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '결제 정보를 조회할 수 없습니다.');
      }

      return {
        id: data.paymentKey,
        amount: {
          value: data.totalAmount,
          currency: data.currency as 'KRW'
        },
        status: this.mapStatusToPaymentStatus(data.status),
        customer: {
          name: data.customerName || '',
          email: data.customerEmail || ''
        },
        metadata: {
          orderId: data.orderId,
          orderName: data.orderName,
          method: data.method,
          approvedAt: data.approvedAt
        },
        createdAt: new Date(data.requestedAt),
        updatedAt: new Date(data.approvedAt || data.requestedAt)
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
    // 토스페이먼츠 웹훅은 별도의 서명 검증이 없음
    // IP 화이트리스트로 검증
    try {
      const event: WebhookEvent = {
        id: payload.data.paymentKey,
        type: payload.eventType,
        data: payload.data,
        createdAt: new Date(payload.createdAt)
      };

      this.log('Webhook received', event);
      return event;
    } catch (error) {
      this.logError('Failed to handle webhook', error);
      throw error;
    }
  }

  // 토스페이먼츠 전용 메서드
  getWidgetClientKey(): string {
    return this.widgetClientKey;
  }

  // 간편결제 목록 조회
  async getEasyPayProviders(): Promise<string[]> {
    return ['토스페이', '네이버페이', '카카오페이', '페이코', '삼성페이'];
  }
}