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

    const rewards = await prisma.referralReward.findMany({
      include: {
        referral: {
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100
    })

    const formattedRewards = await Promise.all(
      rewards.map(async (reward) => {
        const referee = await prisma.user.findUnique({
          where: { id: reward.refereeId },
          select: { name: true, email: true }
        })

        return {
          id: reward.id,
          referrerId: reward.referrerId,
          referrerName: reward.referral.user.name || "Unknown",
          refereeId: reward.refereeId,
          refereeName: referee?.name || "Unknown",
          refereeEmail: referee?.email || "Unknown",
          rewardType: reward.rewardType,
          creditsAwarded: reward.creditsAwarded,
          cashAwarded: reward.cashAwarded,
          status: reward.status,
          triggerEvent: reward.triggerEvent,
          createdAt: reward.createdAt,
          completedAt: reward.completedAt
        }
      })
    )

    return NextResponse.json(formattedRewards)
  } catch (error) {
    console.error("Admin referral rewards error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}