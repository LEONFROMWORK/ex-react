import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from '@/lib/auth/session'
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's current token balance and subscription
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
        tokensUsed: true,
        tokensCharged: true,
        metadata: true,
        createdAt: true
      }
    })

    // Calculate total usage and savings
    const usedThisMonth = monthlyCorrections.reduce((sum, correction) => 
      sum + correction.tokensCharged, 0
    )
    const savedThisMonth = monthlyCorrections.reduce((sum, correction) => 
      sum + (correction.tokensUsed - correction.tokensCharged), 0
    )

    // Get recent usage from transactions
    const recentTransactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        type: "BONUS",
        tokens: { lt: 0 } // Only token consumption
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
        tokensUsed: true,
        tokensCharged: true,
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
        amount: correction.tokensCharged,
        savedAmount: correction.tokensUsed - correction.tokensCharged,
        timestamp: correction.createdAt,
        metadata: {
          successRate: metadata?.successRate,
          partialSuccess: metadata?.partialSuccess,
          discount: metadata?.tokenDiscount ? "50%" : "none"
        }
      }
    })

    const tokenUsageData = {
      currentTokens: user.subscription?.tokensRemaining || user.tokens || 0,
      monthlyLimit: user.subscription?.monthlyTokens || 0,
      usedThisMonth,
      savedThisMonth,
      recentUsage
    }

    return NextResponse.json(tokenUsageData)
  } catch (error) {
    console.error("Token usage error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}