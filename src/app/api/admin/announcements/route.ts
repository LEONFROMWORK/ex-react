import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from '@/lib/auth/session'
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 403 })
    }

    const announcements = await prisma.announcement.findMany({
      where: { isActive: true },
      orderBy: { priority: 'desc' }
    })

    return NextResponse.json(announcements)
  } catch (error) {
    console.error("Error fetching announcements:", error)
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 403 })
    }

    const body = await request.json()
    const announcement = await prisma.announcement.create({
      data: {
        ...body,
        createdBy: session.user.id
      }
    })

    await prisma.adminLog.create({
      data: {
        adminId: session.user.id,
        action: 'CREATE_ANNOUNCEMENT',
        targetType: 'announcement',
        targetId: announcement.id,
        metadata: JSON.stringify(body)
      }
    })

    return NextResponse.json(announcement)
  } catch (error) {
    console.error("Error creating announcement:", error)
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 })
  }
}