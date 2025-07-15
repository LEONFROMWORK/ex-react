import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-helper"
import { GetAIUsageStatsHandler, GetAIUsageStatsRequestSchema } from "@/Features/Admin/Statistics/GetAIUsageStats"
import { ValidateAdminAccessHandler, hasAdminPermission } from "@/Features/Admin/AdminAuth/ValidateAdminAccess"

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json(
        { error: "인증이 필요합니다" },
        { status: 401 }
      )
    }

    // Validate admin access
    const accessValidator = new ValidateAdminAccessHandler()
    const accessResult = await accessValidator.handle({
      userId: session.user.id,
      role: session.user.role,
      requestPath: "/api/admin/ai-stats",
    })

    if (!accessResult.isSuccess || !accessResult.value.isAllowed) {
      return NextResponse.json(
        { error: "권한이 없습니다" },
        { status: 403 }
      )
    }

    // Check specific permission
    if (!hasAdminPermission(accessResult.value.permissions, "statistics", "read")) {
      return NextResponse.json(
        { error: "통계 조회 권한이 없습니다" },
        { status: 403 }
      )
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get("period") || "week"

    // Validate request
    const validationResult = GetAIUsageStatsRequestSchema.safeParse({ period })
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "잘못된 요청입니다", details: validationResult.error },
        { status: 400 }
      )
    }

    // Get AI usage stats
    const handler = new GetAIUsageStatsHandler()
    const result = await handler.handle(validationResult.data)

    if (!result.isSuccess) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(result.value)
  } catch (error) {
    console.error("Admin AI stats API error:", error)
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}