import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from '@/lib/auth/session'
import { GetReferralStatsValidator, GetReferralStatsHandler } from "@/Features/Referral/GetReferralStats/GetReferralStats"

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const request = {
      userId: session.user.id,
    }

    // Validate request
    const validation = GetReferralStatsValidator.validate(request)
    if (!validation.isSuccess) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    // Handle request
    const handler = new GetReferralStatsHandler()
    const result = await handler.handle(validation.value)

    if (!result.isSuccess) {
      // Return 404 if no referral code exists
      if (result.error.code === "NO_REFERRAL_CODE") {
        return NextResponse.json(
          { error: result.error },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json(result.value)
  } catch (error) {
    console.error("Referral stats error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}