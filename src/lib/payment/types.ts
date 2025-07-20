// 결제 관련 타입 정의

export interface PaymentAmount {
  value: number;
  currency: 'KRW' | 'USD' | 'EUR' | 'JPY';
}

export interface PaymentCustomer {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  country?: string;
}

export interface PaymentItem {
  name: string;
  quantity: number;
  amount: number;
  tax?: number;
}

export interface PaymentIntent {
  id: string;
  amount: PaymentAmount;
  status: PaymentStatus;
  customer: PaymentCustomer;
  items?: PaymentItem[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'canceled'
  | 'refunded'
  | 'partial_refunded';

export interface PaymentResult {
  success: boolean;
  paymentIntentId?: string;
  status: PaymentStatus;
  error?: PaymentError;
  transactionId?: string;
  receipt?: PaymentReceipt;
}

export interface PaymentError {
  code: string;
  message: string;
  details?: any;
}

export interface PaymentReceipt {
  url: string;
  id: string;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_transfer' | 'virtual_account' | 'mobile' | 'easy_pay';
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  easyPay?: {
    provider: string; // 토스페이, 네이버페이, 카카오페이 등
  };
}

export interface WebhookEvent {
  id: string;
  type: string;
  data: any;
  createdAt: Date;
}

// 결제 Provider 인터페이스
export interface PaymentProvider {
  // 결제 인텐트 생성
  createPaymentIntent(
    amount: PaymentAmount,
    customer: PaymentCustomer,
    items?: PaymentItem[],
    metadata?: Record<string, any>
  ): Promise<PaymentIntent>;

  // 결제 확인
  confirmPayment(
    paymentIntentId: string,
    paymentMethod?: PaymentMethod
  ): Promise<PaymentResult>;

  // 결제 취소
  cancelPayment(
    paymentIntentId: string,
    reason?: string
  ): Promise<PaymentResult>;

  // 환불 처리
  refundPayment(
    paymentIntentId: string,
    amount?: number,
    reason?: string
  ): Promise<PaymentResult>;

  // 결제 상태 조회
  getPaymentStatus(paymentIntentId: string): Promise<PaymentIntent>;

  // 웹훅 처리
  handleWebhook(
    payload: any,
    signature: string
  ): Promise<WebhookEvent>;

  // Provider 이름
  getProviderName(): string;
}

// 지역 정보
export interface UserLocation {
  country: string;
  region: 'KR' | 'GLOBAL';
  currency: 'KRW' | 'USD' | 'EUR' | 'JPY';
  paymentGateway: 'TOSS' | 'STRIPE';
  timezone?: string;
  locale?: string;
}

// 결제 설정
export interface PaymentConfig {
  provider: 'TOSS' | 'STRIPE';
  testMode: boolean;
  webhookEndpoint: string;
  supportedCurrencies: string[];
  supportedPaymentMethods: string[];
}