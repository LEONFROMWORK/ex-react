import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const orderId = searchParams.get("orderId")
    const code = searchParams.get("code")
    const message = searchParams.get("message")

    if (orderId) {
      // Update payment intent status to failed
      await prisma.paymentIntent.update({
        where: { orderId },
        data: {
          status: "FAILED",
          failedAt: new Date(),
          metadata: {
            failureCode: code,
            failureMessage: message,
          },
        },
      })
    }

    // Redirect to fail page
    return NextResponse.redirect(
      new URL(`/payment/fail?code=${code}&message=${encodeURIComponent(message || "")}`, req.url)
    )
  } catch (error) {
    console.error("Payment fail handler error:", error)
    return NextResponse.redirect(
      new URL("/payment/fail?error=INTERNAL_ERROR", req.url)
    )
  }
}