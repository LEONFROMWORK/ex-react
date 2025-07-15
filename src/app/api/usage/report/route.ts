import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { GetUsageReportValidator, GetUsageReportHandler } from "@/Features/UsageTracking/GetUsageReport/GetUsageReport"

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams
    const period = searchParams.get("period") || "monthly"
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const request = {
      userId: session.user.id,
      period: period as any,
      ...(startDate && { startDate: new Date(startDate) }),
      ...(endDate && { endDate: new Date(endDate) }),
    }

    // Validate request
    const validation = GetUsageReportValidator.validate(request)
    if (!validation.isSuccess) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    // Handle request
    const handler = new GetUsageReportHandler()
    const result = await handler.handle(validation.value)

    if (!result.isSuccess) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json(result.value)
  } catch (error) {
    console.error("Usage report error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}