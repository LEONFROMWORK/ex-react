import { NextRequest, NextResponse } from "next/server"
import { ConfirmPaymentValidator, ConfirmPaymentHandler } from "@/Features/Payment/ConfirmPayment/ConfirmPayment"

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const paymentKey = searchParams.get("paymentKey")
    const orderId = searchParams.get("orderId")
    const amount = searchParams.get("amount")

    if (!paymentKey || !orderId || !amount) {
      return NextResponse.redirect(
        new URL("/payment/fail?error=MISSING_PARAMETERS", req.url)
      )
    }

    // Validate and confirm payment
    const validation = ConfirmPaymentValidator.validate({
      paymentKey,
      orderId,
      amount: parseInt(amount),
    })

    if (!validation.isSuccess) {
      return NextResponse.redirect(
        new URL(`/payment/fail?error=${validation.error.code}`, req.url)
      )
    }

    const handler = new ConfirmPaymentHandler()
    const result = await handler.handle(validation.value)

    if (!result.isSuccess) {
      return NextResponse.redirect(
        new URL(`/payment/fail?error=${result.error.code}`, req.url)
      )
    }

    // Redirect to success page
    return NextResponse.redirect(
      new URL(`/payment/success?orderId=${orderId}`, req.url)
    )
  } catch (error) {
    console.error("Payment success handler error:", error)
    return NextResponse.redirect(
      new URL("/payment/fail?error=INTERNAL_ERROR", req.url)
    )
  }
}