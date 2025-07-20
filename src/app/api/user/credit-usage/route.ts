import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from '@/lib/auth/session'
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's current credit balance and subscription
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        subscription: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get current month's usage
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    // Get all corrections this month
    const monthlyCorrections = await prisma.correction.findMany({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: startOfMonth
        }
      },
      select: {
        creditsUsed: true,
        creditsCharged: true,
        metadata: true,
        createdAt: true
      }
    })

    // Calculate total usage and savings
    const usedThisMonth = monthlyCorrections.reduce((sum, correction) => 
      sum + correction.creditsCharged, 0
    )
    const savedThisMonth = monthlyCorrections.reduce((sum, correction) => 
      sum + (correction.creditsUsed - correction.creditsCharged), 0
    )

    // Get recent usage from transactions
    const recentTransactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        type: "BONUS",
        credits: { lt: 0 } // Only credit consumption
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    // Get recent corrections for detailed usage
    const recentCorrections = await prisma.correction.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        creditsUsed: true,
        creditsCharged: true,
        metadata: true,
        createdAt: true
      }
    })

    // Transform recent usage data
    const recentUsage = recentCorrections.map(correction => {
      const metadata = correction.metadata as any
      return {
        id: correction.id,
        feature: "excel_correction",
        amount: correction.creditsCharged,
        savedAmount: correction.creditsUsed - correction.creditsCharged,
        timestamp: correction.createdAt,
        metadata: {
          successRate: metadata?.successRate,
          partialSuccess: metadata?.partialSuccess,
          discount: metadata?.creditDiscount ? "50%" : "none"
        }
      }
    })

    const creditUsageData = {
      currentCredits: user.subscription?.creditsRemaining || user.credits || 0,
      monthlyLimit: user.subscription?.monthlyCredits || 0,
      usedThisMonth,
      savedThisMonth,
      recentUsage
    }

    return NextResponse.json(creditUsageData)
  } catch (error) {
    console.error("Credit usage error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}