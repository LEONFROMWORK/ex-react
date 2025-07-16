import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from '@/lib/auth/session'
import { prisma } from "@/lib/prisma"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 403 })
    }

    const body = await request.json()
    const { role, tokens } = body

    const user = await prisma.user.findUnique({
      where: { id: params.id }
    })

    if (!user) {
      return NextResponse.json({ error: "사용자를 찾을 수 없습니다" }, { status: 404 })
    }

    // Prevent modifying super admin
    if (user.role === 'SUPER_ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: "슈퍼 관리자는 수정할 수 없습니다" }, { status: 403 })
    }

    const updateData: any = {}
    if (role) updateData.role = role
    if (tokens !== undefined) updateData.tokens = tokens

    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: updateData
    })

    await prisma.adminLog.create({
      data: {
        adminId: session.user.id,
        action: 'UPDATE_USER_STATUS',
        targetType: 'user',
        targetId: params.id,
        metadata: JSON.stringify({ role, tokens })
      }
    })

    return NextResponse.json({
      success: true,
      user: updatedUser
    })
  } catch (error) {
    console.error("User status update error:", error)
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 })
  }
}