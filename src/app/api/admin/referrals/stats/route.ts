import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.role || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get total referrals
    const totalReferrals = await prisma.user.count({
      where: {
        referredBy: { not: null }
      }
    })

    // Get active referrers (users who have at least one referral)
    const activeReferrers = await prisma.referral.count({
      where: {
        referralCount: { gt: 0 }
      }
    })

    // Get total tokens and cash awarded
    const rewardStats = await prisma.referralReward.aggregate({
      where: {
        status: "COMPLETED"
      },
      _sum: {
        tokensAwarded: true,
        cashAwarded: true
      }
    })

    // Get pending rewards count
    const pendingRewards = await prisma.referralReward.count({
      where: {
        status: "PENDING"
      }
    })

    // Calculate conversion rate (referred users who made a payment)
    const referredUsers = await prisma.user.findMany({
      where: {
        referredBy: { not: null }
      },
      select: { id: true }
    })

    const paidReferredUsers = await prisma.transaction.groupBy({
      by: ['userId'],
      where: {
        userId: { in: referredUsers.map(u => u.id) },
        type: "PURCHASE",
        status: "COMPLETED"
      }
    })

    const conversionRate = totalReferrals > 0 
      ? (paidReferredUsers.length / totalReferrals) * 100 
      : 0

    const stats = {
      totalReferrals,
      activeReferrers,
      totalTokensAwarded: rewardStats._sum.tokensAwarded || 0,
      totalCashAwarded: rewardStats._sum.cashAwarded || 0,
      pendingRewards,
      conversionRate
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Admin referral stats error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}