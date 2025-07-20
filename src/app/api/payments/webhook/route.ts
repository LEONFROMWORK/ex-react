import { NextRequest, NextResponse } from "next/server"
import { PaymentWebhookHandler } from "@/Features/Payment/WebhookHandler/PaymentWebhookHandler"
import { isPaymentEnabled } from '@/lib/config/features'

export async function POST(req: NextRequest) {
  // 결제 기능이 비활성화된 경우 빈 응답 반환 (웹훅은 계속 받되 처리하지 않음)
  if (!isPaymentEnabled()) {
    return NextResponse.json({ received: true })
  }

  try {
    const signature = req.headers.get("toss-signature")
    const body = await req.json()

    const handler = new PaymentWebhookHandler()
    const result = await handler.handle(body, signature)

    if (!result.isSuccess) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    )
  }
}