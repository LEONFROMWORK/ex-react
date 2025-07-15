import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-helper"
import { ValidateAdminAccessHandler, hasAdminPermission } from "@/Features/Admin/AdminAuth/ValidateAdminAccess"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json(
        { error: "인증이 필요합니다" },
        { status: 401 }
      )
    }

    // Validate admin access
    const accessValidator = new ValidateAdminAccessHandler()
    const accessResult = await accessValidator.handle({
      userId: session.user.id,
      role: session.user.role,
      requestPath: "/api/admin/payments/stats",
    })

    if (!accessResult.isSuccess || !accessResult.value.isAllowed) {
      return NextResponse.json(
        { error: "권한이 없습니다" },
        { status: 403 }
      )
    }

    // Get payment statistics
    const [total, completed, pending, failed, refunded] = await Promise.all([
      prisma.paymentIntent.count(),
      prisma.paymentIntent.count({ where: { status: "COMPLETED" } }),
      prisma.paymentIntent.count({ where: { status: "PENDING" } }),
      prisma.paymentIntent.count({ where: { status: "FAILED" } }),
      prisma.paymentIntent.count({ 
        where: { 
          OR: [
            { status: "CANCELED" },
            { status: "PARTIALLY_REFUNDED" }
          ]
        } 
      }),
    ])

    const totalAmountResult = await prisma.paymentIntent.aggregate({
      where: { status: "COMPLETED" },
      _sum: { amount: true },
    })

    const refundedAmountResult = await prisma.transaction.aggregate({
      where: { 
        type: "REFUND",
        status: "COMPLETED"
      },
      _sum: { amount: true },
    })

    return NextResponse.json({
      total,
      completed,
      pending,
      failed,
      refunded,
      totalAmount: totalAmountResult._sum.amount || 0,
      refundedAmount: Math.abs(refundedAmountResult._sum.amount || 0),
    })
  } catch (error) {
    console.error("Payment stats API error:", error)
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}