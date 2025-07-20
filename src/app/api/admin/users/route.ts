import { NextRequest, NextResponse } from "next/server"
import { auth } from '@/lib/auth/auth'
import { AuthPermissionService } from '@/lib/services/auth-permission.service'
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })
    }

    const permissionService = AuthPermissionService.getInstance()
    const userRole = await permissionService.getUserRole(session.user.id)
    
    if (!permissionService.hasPermission(userRole, 'canAccessAdmin')) {
      return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search") || undefined
    const role = searchParams.get("role") || undefined
    const tier = searchParams.get("tier") || undefined
    const status = searchParams.get("status") || undefined
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")

    const where: any = {}
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } }
      ]
    }
    if (role && role !== "all") {
      where.role = role
    }
    if (tier && tier !== "all") {
      where.tier = tier
    }
    if (status && status !== "all") {
      switch (status) {
        case "active":
          where.emailVerified = { not: null }
          break
        case "inactive":
          where.emailVerified = null
          break
      }
    }
    
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          tier: true,
          credits: true,
          emailVerified: true,
          createdAt: true,
          lastActiveAt: true,
          subscription: {
            select: {
              plan: true,
              status: true,
              creditsRemaining: true
            }
          },
          _count: {
            select: {
              files: true,
              analyses: true,
              reviews: true,
              creditTransactions: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.user.count({ where })
    ])

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("Admin users API error:", error)
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 })
  }
}