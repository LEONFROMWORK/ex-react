import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-helper"
import { GetUsersHandler, GetUsersRequestSchema } from "@/Features/Admin/UserManagement/GetUsers"
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
      requestPath: "/api/admin/users",
    })

    if (!accessResult.isSuccess || !accessResult.value.isAllowed) {
      return NextResponse.json(
        { error: "권한이 없습니다" },
        { status: 403 }
      )
    }

    // Check specific permission
    if (!hasAdminPermission(accessResult.value.permissions, "users", "read")) {
      return NextResponse.json(
        { error: "사용자 조회 권한이 없습니다" },
        { status: 403 }
      )
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const requestData = {
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "20"),
      search: searchParams.get("search") || undefined,
      role: searchParams.get("role") as any || undefined,
      status: searchParams.get("status") as any || undefined,
      sortBy: searchParams.get("sortBy") as any || "createdAt",
      sortOrder: searchParams.get("sortOrder") as any || "desc",
    }

    // Validate request
    const validationResult = GetUsersRequestSchema.safeParse(requestData)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "잘못된 요청입니다", details: validationResult.error },
        { status: 400 }
      )
    }

    // Get users
    const handler = new GetUsersHandler()
    const result = await handler.handle(validationResult.data)

    if (!result.isSuccess) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(result.value)
  } catch (error) {
    console.error("Admin users API error:", error)
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}