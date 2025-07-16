import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from '@/lib/auth/session'
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 403 })
    }

    const [totalRevenue, monthlyRevenue, todayRevenue, pendingPayments] = await Promise.all([
      prisma.paymentIntent.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true }
      }),
      prisma.paymentIntent.aggregate({
        where: {
          status: 'COMPLETED',
          completedAt: {
            gte: new Date(new Date().setDate(1))
          }
        },
        _sum: { amount: true }
      }),
      prisma.paymentIntent.aggregate({
        where: {
          status: 'COMPLETED',
          completedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        },
        _sum: { amount: true }
      }),
      prisma.paymentIntent.count({
        where: { status: 'PENDING' }
      })
    ])

    return NextResponse.json({
      totalRevenue: totalRevenue._sum.amount || 0,
      monthlyRevenue: monthlyRevenue._sum.amount || 0,
      todayRevenue: todayRevenue._sum.amount || 0,
      pendingPayments
    })
  } catch (error) {
    console.error("Payment stats API error:", error)
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 })
  }
}
