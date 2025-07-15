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
        totalTokensEarned: 'desc'
      }
    })

    const formattedReferrals = referrals.map(referral => ({
      id: referral.id,
      userId: referral.userId,
      userName: referral.user.name || "Unknown",
      userEmail: referral.user.email,
      referralCode: referral.referralCode,
      referralCount: referral.referralCount,
      totalTokensEarned: referral.totalTokensEarned,
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