import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get or create referral data
    let referral = await prisma.referral.findUnique({
      where: { userId: session.user.id },
      include: {
        referralRewards: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            referral: {
              include: {
                user: true
              }
            }
          }
        }
      }
    })

    if (!referral) {
      // Generate unique referral code and link
      const user = await prisma.user.findUnique({
        where: { id: session.user.id }
      })
      
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      const referralCode = `${user.name?.toUpperCase().replace(/\s+/g, '').slice(0, 4)}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${req.headers.get('host')}`
      const referralLink = `${baseUrl}/auth/signup?ref=${referralCode}`

      referral = await prisma.referral.create({
        data: {
          userId: session.user.id,
          referralCode,
          referralLink,
          rewardType: "PAYMENT_BASED",
          tokenRewardAmount: 100
        },
        include: {
          referralRewards: {
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      })
    }

    // Get referee information
    const recentRewards = await Promise.all(
      referral.referralRewards.map(async (reward) => {
        const referee = await prisma.user.findUnique({
          where: { id: reward.refereeId },
          select: { email: true }
        })
        
        return {
          id: reward.id,
          type: reward.rewardType,
          amount: reward.tokensAwarded,
          date: reward.createdAt,
          refereeEmail: referee?.email || "Unknown"
        }
      })
    )

    // Calculate pending rewards (users who signed up but haven't paid yet)
    const pendingRewards = await prisma.user.count({
      where: {
        referredBy: referral.referralCode,
        transactions: {
          none: {
            type: "PURCHASE",
            status: "COMPLETED"
          }
        }
      }
    })

    const dashboardData = {
      referralCode: referral.referralCode,
      referralLink: referral.referralLink,
      totalReferrals: referral.referralCount,
      totalTokensEarned: referral.totalTokensEarned,
      totalCashEarned: referral.totalEarned,
      pendingRewards,
      recentRewards
    }

    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error("Referral dashboard error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}