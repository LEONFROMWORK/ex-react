'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { UserLocation } from '@/src/lib/payment/types';
import { locationDetector } from '@/src/lib/payment/location-detector';
import { isPaymentEnabled } from '@/lib/config/features';

interface PaymentButtonProps {
  amount: number;
  planName: string;
  onSuccess?: (paymentId: string) => void;
  onError?: (error: Error) => void;
  className?: string;
}

export function PaymentButton({ 
  amount, 
  planName,
  onSuccess,
  onError,
  className 
}: PaymentButtonProps) {
  // 결제 기능이 비활성화된 경우 null 반환
  if (!isPaymentEnabled()) {
    return null;
  }
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);

  useEffect(() => {
    // 사용자 위치 감지
    locationDetector.detectUserLocation().then(setUserLocation);
  }, []);

  const handlePayment = async () => {
    if (!userLocation) return;

    setIsLoading(true);
    try {
      // 결제 인텐트 생성
      const response = await fetch('/api/payment/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          currency: userLocation.currency,
          planName,
          region: userLocation.region
        }),
      });

      if (!response.ok) {
        throw new Error('결제 준비 중 오류가 발생했습니다.');
      }

      const { paymentIntent, provider } = await response.json();

      // 지역별 결제창 호출
      if (provider === 'TOSS') {
        await handleTossPayment(paymentIntent);
      } else {
        await handleStripePayment(paymentIntent);
      }
    } catch (error) {
      console.error('Payment error:', error);
      onError?.(error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTossPayment = async (paymentIntent: any) => {
    // 토스페이먼츠 결제위젯 로드
    const { loadPaymentWidget } = await import('@tosspayments/payment-widget-sdk');
    
    const widget = await loadPaymentWidget(
      paymentIntent.metadata.tossClientKey,
      paymentIntent.customer.id
    );

    // 결제창 렌더링
    await widget.renderPaymentMethods('#payment-widget', paymentIntent.amount.value);

    // 결제 요청
    await widget.requestPayment({
      orderId: paymentIntent.id,
      orderName: planName,
      customerName: paymentIntent.customer.name,
      customerEmail: paymentIntent.customer.email,
      successUrl: `${window.location.origin}/payment/success`,
      failUrl: `${window.location.origin}/payment/fail`,
    });
  };

  const handleStripePayment = async (paymentIntent: any) => {
    // Stripe 결제 처리
    const { loadStripe } = await import('@stripe/stripe-js');
    
    const stripe = await loadStripe(paymentIntent.metadata.stripePublishableKey);
    if (!stripe) throw new Error('Stripe 로드 실패');

    // Stripe Elements를 사용한 결제 처리
    const { error } = await stripe.confirmPayment({
      clientSecret: paymentIntent.metadata.clientSecret,
      confirmParams: {
        return_url: `${window.location.origin}/payment/success`,
      },
    });

    if (error) {
      throw new Error(error.message);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat(userLocation?.locale || 'ko-KR', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return (
    <>
      <Button
        onClick={handlePayment}
        disabled={isLoading || !userLocation}
        className={className}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            처리 중...
          </>
        ) : (
          <>
            {userLocation && formatCurrency(amount, userLocation.currency)} 결제하기
          </>
        )}
      </Button>
      
      {/* 토스페이먼츠 위젯 컨테이너 */}
      <div id="payment-widget" style={{ display: 'none' }} />
    </>
  );
}