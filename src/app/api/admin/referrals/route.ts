import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from '@/lib/auth/session'
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.role || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const referrals = await prisma.referral.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        totalCreditsEarned: 'desc'
      }
    })

    const formattedReferrals = referrals.map(referral => ({
      id: referral.id,
      userId: referral.userId,
      userName: referral.user.name || "Unknown",
      userEmail: referral.user.email,
      referralCode: referral.referralCode,
      referralCount: referral.referralCount,
      totalCreditsEarned: referral.totalCreditsEarned,
      totalEarned: referral.totalEarned,
      rewardType: referral.rewardType,
      createdAt: referral.createdAt
    }))

    return NextResponse.json(formattedReferrals)
  } catch (error) {
    console.error("Admin referrals error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}