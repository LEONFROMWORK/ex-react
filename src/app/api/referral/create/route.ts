import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from '@/lib/auth/session'
import { CreateReferralCodeValidator, CreateReferralCodeHandler } from "@/Features/Referral/CreateReferralCode/CreateReferralCode"

export async function POST(req: NextRequest) {
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
    const validation = CreateReferralCodeValidator.validate(request)
    if (!validation.isSuccess) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    // Handle request
    const handler = new CreateReferralCodeHandler()
    const result = await handler.handle(validation.value)

    if (!result.isSuccess) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json(result.value)
  } catch (error) {
    console.error("Referral code creation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}