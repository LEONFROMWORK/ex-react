import { NextRequest, NextResponse } from 'next/server';
import { PaymentGatewayFactory } from '@/src/lib/payment/factory';
import { LocationDetector } from '@/src/lib/payment/location-detector';
import { PaymentAmount, PaymentCustomer } from '@/src/lib/payment/types';
import { isPaymentEnabled } from '@/lib/config/features';

export async function POST(request: NextRequest) {
  // 결제 기능이 비활성화된 경우 에러 반환
  if (!isPaymentEnabled()) {
    return NextResponse.json(
      { error: '결제 기능이 현재 준비중입니다.' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { amount, currency, planName, region, customerInfo } = body;

    // 요청 검증
    if (!amount || !currency || !planName) {
      return NextResponse.json(
        { error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 지역 정보가 없으면 IP 기반으로 감지
    let userRegion = region;
    if (!userRegion) {
      const ip = LocationDetector.extractIPFromRequest(request);
      const location = await LocationDetector.getInstance().detectUserLocation(undefined, ip || undefined);
      userRegion = location.region;
    }

    // 결제 Provider 선택
    const provider = PaymentGatewayFactory.create(userRegion);
    
    // 결제 금액 정보
    const paymentAmount: PaymentAmount = {
      value: amount,
      currency: currency
    };

    // 고객 정보 (실제로는 세션에서 가져와야 함)
    const customer: PaymentCustomer = customerInfo || {
      id: `customer_${Date.now()}`,
      name: 'Test Customer',
      email: 'customer@example.com',
      country: userRegion === 'KR' ? 'KR' : 'US'
    };

    // 결제 인텐트 생성
    const paymentIntent = await provider.createPaymentIntent(
      paymentAmount,
      customer,
      [{ name: planName, quantity: 1, amount: amount }],
      { planName, region: userRegion }
    );

    // Provider별 추가 정보 설정
    if (userRegion === 'KR') {
      const tossProvider = PaymentGatewayFactory.getToss();
      paymentIntent.metadata.tossClientKey = tossProvider.getWidgetClientKey();
    } else {
      const stripeProvider = PaymentGatewayFactory.getStripe();
      paymentIntent.metadata.stripePublishableKey = stripeProvider.getPublishableKey();
    }

    return NextResponse.json({
      paymentIntent,
      provider: provider.getProviderName(),
      region: userRegion
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    return NextResponse.json(
      { error: '결제 준비 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}