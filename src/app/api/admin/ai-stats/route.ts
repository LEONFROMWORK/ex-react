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

    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get("period") || "week"

    // Calculate date range
    const now = new Date()
    let startDate = new Date()
    
    switch (period) {
      case 'day':
        startDate.setDate(now.getDate() - 1)
        break
      case 'week':
        startDate.setDate(now.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(now.getMonth() - 1)
        break
      default:
        startDate.setDate(now.getDate() - 7)
    }

    // Get usage logs
    const usageLogs = await prisma.aIModelUsageLog.findMany({
      where: {
        createdAt: { gte: startDate }
      },
      include: {
        modelConfig: true
      }
    })

    // Calculate statistics
    const stats = {
      totalRequests: usageLogs.length,
      successfulRequests: usageLogs.filter(log => log.success).length,
      failedRequests: usageLogs.filter(log => !log.success).length,
      totalTokens: usageLogs.reduce((sum, log) => sum + log.totalTokens, 0),
      totalCost: usageLogs.reduce((sum, log) => sum + log.cost, 0),
      averageLatency: usageLogs.length > 0 
        ? usageLogs.reduce((sum, log) => sum + log.latency, 0) / usageLogs.length 
        : 0,
      byProvider: {} as Record<string, any>,
      byModel: {} as Record<string, any>,
      errorRate: 0,
      period
    }

    // Group by provider
    usageLogs.forEach(log => {
      const provider = log.modelConfig.provider
      if (!stats.byProvider[provider]) {
        stats.byProvider[provider] = {
          requests: 0,
          tokens: 0,
          cost: 0,
          errors: 0
        }
      }
      stats.byProvider[provider].requests++
      stats.byProvider[provider].tokens += log.totalTokens
      stats.byProvider[provider].cost += log.cost
      if (!log.success) stats.byProvider[provider].errors++
    })

    // Group by model
    usageLogs.forEach(log => {
      const model = log.modelConfig.modelName
      if (!stats.byModel[model]) {
        stats.byModel[model] = {
          requests: 0,
          tokens: 0,
          cost: 0,
          errors: 0
        }
      }
      stats.byModel[model].requests++
      stats.byModel[model].tokens += log.totalTokens
      stats.byModel[model].cost += log.cost
      if (!log.success) stats.byModel[model].errors++
    })

    stats.errorRate = stats.totalRequests > 0 
      ? (stats.failedRequests / stats.totalRequests) * 100 
      : 0

    return NextResponse.json(stats)
  } catch (error) {
    console.error("AI stats API error:", error)
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 })
  }
}