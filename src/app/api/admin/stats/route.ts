import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from '@/lib/auth/session'
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 403 })
    }

    const [
      totalUsers,
      activeUsers,
      totalFiles,
      totalPayments,
      completedPayments,
      totalRevenue
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setDate(new Date().getDate() - 30))
          }
        }
      }),
      prisma.file.count(),
      prisma.paymentIntent.count(),
      prisma.paymentIntent.count({ where: { status: 'COMPLETED' } }),
      prisma.paymentIntent.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true }
      })
    ])

    const monthlyRevenue = await prisma.paymentIntent.aggregate({
      where: {
        status: 'COMPLETED',
        completedAt: {
          gte: new Date(new Date().setDate(1))
        }
      },
      _sum: { amount: true }
    })

    const todayFiles = await prisma.file.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }
    })

    return NextResponse.json({
      users: {
        total: totalUsers,
        active: activeUsers
      },
      files: {
        total: totalFiles,
        processedToday: todayFiles
      },
      revenue: {
        total: totalRevenue._sum.amount || 0,
        monthly: monthlyRevenue._sum.amount || 0
      },
      payments: {
        total: totalPayments,
        completed: completedPayments
      }
    })
  } catch (error) {
    console.error("Admin stats API error:", error)
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 })
  }
}