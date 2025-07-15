import { NextRequest, NextResponse } from "next/server"
import { PaymentWebhookHandler } from "@/Features/Payment/WebhookHandler/PaymentWebhookHandler"

export async function POST(req: NextRequest) {
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