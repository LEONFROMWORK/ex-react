import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from '@/lib/auth/session'
import { prisma } from "@/lib/prisma"

export async function POST(
  request: NextRequest,
  { params }: { params: { reviewId: string } }
) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 403 })
    }

    const review = await prisma.review.findUnique({
      where: { id: params.reviewId }
    })

    if (!review) {
      return NextResponse.json({ error: "리뷰를 찾을 수 없습니다" }, { status: 404 })
    }

    if (review.status !== 'PENDING') {
      return NextResponse.json({ error: "대기 중인 리뷰만 승인할 수 있습니다" }, { status: 400 })
    }

    const updatedReview = await prisma.review.update({
      where: { id: params.reviewId },
      data: { status: 'APPROVED' }
    })

    await prisma.adminLog.create({
      data: {
        adminId: session.user.id,
        action: 'APPROVE_REVIEW',
        targetType: 'review',
        targetId: params.reviewId
      }
    })

    return NextResponse.json({
      success: true,
      review: updatedReview
    })
  } catch (error) {
    console.error("Review approval error:", error)
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 })
  }
}