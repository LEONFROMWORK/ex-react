"use client"

import { useEffect, useRef, useState } from "react"
import { loadTossPayments } from "@tosspayments/tosspayments-sdk"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import { useSession } from "next-auth/react"

interface PaymentWidgetProps {
  plan: "BASIC" | "PREMIUM" | "ENTERPRISE"
  billingPeriod: "MONTHLY" | "YEARLY"
  onSuccess?: () => void
}

const PRICING = {
  BASIC: {
    MONTHLY: 29900,
    YEARLY: 299000,
  },
  PREMIUM: {
    MONTHLY: 59900,
    YEARLY: 599000,
  },
  ENTERPRISE: {
    MONTHLY: 99900,
    YEARLY: 999000,
  },
}

export function PaymentWidget({ plan, billingPeriod, onSuccess }: PaymentWidgetProps) {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paymentIntent, setPaymentIntent] = useState<any>(null)
  const paymentWidgetRef = useRef<any>(null)
  const paymentMethodsWidgetRef = useRef<any>(null)
  const agreementWidgetRef = useRef<any>(null)

  const amount = PRICING[plan][billingPeriod]
  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!

  useEffect(() => {
    if (!session?.user?.id) return

    // Create payment intent
    createPaymentIntent()
  }, [session, plan, billingPeriod])

  useEffect(() => {
    if (!paymentIntent) return

    // Initialize TossPayments
    initializePaymentWidget()
  }, [paymentIntent])

  const createPaymentIntent = async () => {
    try {
      const response = await fetch("/api/payments/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptionPlan: plan,
          billingPeriod: billingPeriod,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create payment intent")
      }

      const data = await response.json()
      setPaymentIntent(data)
    } catch (err) {
      setError("결제 준비 중 오류가 발생했습니다.")
      console.error(err)
    }
  }

  const initializePaymentWidget = async () => {
    try {
      const tossPayments = await loadTossPayments(clientKey)
      
      // Initialize payment widget
      const paymentWidget = tossPayments.widgets({
        customerKey: paymentIntent.customerKey,
      })

      // Render payment methods widget
      paymentMethodsWidgetRef.current = paymentWidget.renderPaymentMethods({
        selector: "#payment-methods",
        variantKey: "DEFAULT"
      })

      // Render agreement widget
      agreementWidgetRef.current = paymentWidget.renderAgreement({
        selector: "#agreement"
      })

      paymentWidgetRef.current = paymentWidget
      setLoading(false)
    } catch (err) {
      setError("결제 위젯 초기화에 실패했습니다.")
      console.error(err)
      setLoading(false)
    }
  }

  const handlePayment = async () => {
    if (!paymentWidgetRef.current || !paymentIntent) return

    try {
      await paymentWidgetRef.current.requestPayment({
        orderId: paymentIntent.orderId,
        orderName: paymentIntent.orderName,
        successUrl: paymentIntent.successUrl,
        failUrl: paymentIntent.failUrl,
      })
    } catch (err: any) {
      if (err.code === "USER_CANCEL") {
        setError("결제가 취소되었습니다.")
      } else {
        setError(err.message || "결제 요청 중 오류가 발생했습니다.")
      }
    }
  }

  if (!session) {
    return (
      <Alert>
        <AlertDescription>
          결제를 진행하려면 로그인이 필요합니다.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <>
          {/* Payment Methods Widget */}
          <div id="payment-methods" className="w-full" />

          {/* Agreement Widget */}
          <div id="agreement" className="w-full" />

          {/* Payment Button */}
          <Button
            onClick={handlePayment}
            className="w-full"
            size="lg"
            disabled={!paymentIntent}
          >
            {amount.toLocaleString()}원 결제하기
          </Button>
        </>
      )}
    </div>
  )
}