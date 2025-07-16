import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from '@/lib/auth/session'
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 403 })
    }

    const stats = await prisma.errorPattern.groupBy({
      by: ['errorType', 'category', 'severity'],
      _count: true,
    })

    const totalPatterns = await prisma.errorPattern.count()
    const resolvedPatterns = await prisma.errorPattern.count({
      where: { resolved: true }
    })

    return NextResponse.json({
      total: totalPatterns,
      resolved: resolvedPatterns,
      unresolved: totalPatterns - resolvedPatterns,
      byType: stats,
      resolutionRate: totalPatterns > 0 ? (resolvedPatterns / totalPatterns) * 100 : 0
    })
  } catch (error) {
    console.error("Error patterns stats API error:", error)
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 })
  }
}
