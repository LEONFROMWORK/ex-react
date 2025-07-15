import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-helper"
import { ApproveReviewHandler, ApproveReviewRequestSchema } from "@/Features/Admin/ReviewManagement/ApproveReview"
import { ValidateAdminAccessHandler, hasAdminPermission } from "@/Features/Admin/AdminAuth/ValidateAdminAccess"

export async function POST(
  request: NextRequest,
  { params }: { params: { reviewId: string } }
) {
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
      requestPath: "/api/admin/reviews/approve",
    })

    if (!accessResult.isSuccess || !accessResult.value.isAllowed) {
      return NextResponse.json(
        { error: "권한이 없습니다" },
        { status: 403 }
      )
    }

    // Check specific permission
    if (!hasAdminPermission(accessResult.value.permissions, "reviews", "update")) {
      return NextResponse.json(
        { error: "리뷰 승인 권한이 없습니다" },
        { status: 403 }
      )
    }

    // Get request body
    const body = await request.json()
    const requestData = {
      reviewId: params.reviewId,
      adminId: session.user.id,
      ...body,
    }

    // Validate request
    const validationResult = ApproveReviewRequestSchema.safeParse(requestData)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "잘못된 요청입니다", details: validationResult.error },
        { status: 400 }
      )
    }

    // Approve review
    const handler = new ApproveReviewHandler()
    const result = await handler.handle(validationResult.data)

    if (!result.isSuccess) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(result.value)
  } catch (error) {
    console.error("Approve review API error:", error)
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}