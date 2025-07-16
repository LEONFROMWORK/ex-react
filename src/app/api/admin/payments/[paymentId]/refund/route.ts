import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from '@/lib/auth/session'
import { prisma } from "@/lib/prisma"

export async function POST(
  request: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 403 })
    }

    const body = await request.json()
    const { amount, reason } = body

    const payment = await prisma.paymentIntent.findUnique({
      where: { id: params.paymentId }
    })

    if (!payment) {
      return NextResponse.json({ error: "결제를 찾을 수 없습니다" }, { status: 404 })
    }

    if (payment.status !== 'COMPLETED') {
      return NextResponse.json({ error: "완료된 결제만 환불할 수 있습니다" }, { status: 400 })
    }

    // Update payment status
    const updatedPayment = await prisma.paymentIntent.update({
      where: { id: params.paymentId },
      data: {
        status: amount === payment.amount ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
        metadata: JSON.stringify({
          ...JSON.parse(payment.metadata || '{}'),
          refund: { amount, reason, processedBy: session.user.id, processedAt: new Date() }
        })
      }
    })

    // Log admin action
    await prisma.adminLog.create({
      data: {
        adminId: session.user.id,
        action: 'PROCESS_REFUND',
        targetType: 'payment',
        targetId: params.paymentId,
        metadata: JSON.stringify({ amount, reason })
      }
    })

    return NextResponse.json({
      success: true,
      payment: updatedPayment
    })
  } catch (error) {
    console.error("Refund API error:", error)
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 })
  }
}
