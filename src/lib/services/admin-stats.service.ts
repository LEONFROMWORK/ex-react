import { prisma } from '@/lib/prisma'
import { USER_TIERS, TIER_LIMITS } from '@/lib/constants/user-tiers'
import { startOfMonth, startOfWeek, startOfDay, subDays } from 'date-fns'
import type { User, File, Payment, CreditTransaction } from '@prisma/client'

export interface AdminDashboardStats {
  users: {
    total: number
    active: number
    new: number
    byTier: Record<string, number>
  }
  revenue: {
    total: number
    monthly: number
    weekly: number
    byTier: Record<string, number>
  }
  usage: {
    filesProcessed: number
    tokensUsed: number
    errorsFixed: number
    averageFileSize: number
  }
  performance: {
    averageProcessingTime: number
    successRate: number
    errorRate: number
  }
}

export interface UserDetails extends User {
  creditTransactions: CreditTransaction[]
  files: File[]
  payments: Payment[]
  stats: {
    totalFiles: number
    totalCreditsUsed: number
    totalSpent: number
  }
}

export class AdminStatsService {
  private static instance: AdminStatsService
  
  private constructor() {}
  
  static getInstance(): AdminStatsService {
    if (!AdminStatsService.instance) {
      AdminStatsService.instance = new AdminStatsService()
    }
    return AdminStatsService.instance
  }
  
  // 대시보드 통계 가져오기
  async getDashboardStats(): Promise<AdminDashboardStats> {
    const now = new Date()
    const startOfCurrentMonth = startOfMonth(now)
    const startOfCurrentWeek = startOfWeek(now)
    const thirtyDaysAgo = subDays(now, 30)
    
    // 사용자 통계
    const [totalUsers, activeUsers, newUsers] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          lastActiveAt: {
            gte: thirtyDaysAgo
          }
        }
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: startOfCurrentMonth
          }
        }
      })
    ])
    
    // 등급별 사용자 수
    const usersByTier = await prisma.user.groupBy({
      by: ['tier'],
      _count: true
    })
    
    const userTierMap = usersByTier.reduce((acc, item) => {
      acc[item.tier || USER_TIERS.FREE] = item._count
      return acc
    }, {} as Record<string, number>)
    
    // 수익 통계 (결제 데이터)
    const [totalRevenue, monthlyRevenue, weeklyRevenue] = await Promise.all([
      prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true }
      }),
      prisma.payment.aggregate({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: startOfCurrentMonth }
        },
        _sum: { amount: true }
      }),
      prisma.payment.aggregate({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: startOfCurrentWeek }
        },
        _sum: { amount: true }
      })
    ])
    
    // 등급별 수익
    const revenueByTier = await prisma.payment.groupBy({
      by: ['tier'],
      where: { status: 'COMPLETED' },
      _sum: { amount: true }
    })
    
    const revenueTierMap = revenueByTier.reduce((acc, item) => {
      acc[item.tier || USER_TIERS.FREE] = item._sum.amount || 0
      return acc
    }, {} as Record<string, number>)
    
    // 사용량 통계
    const [fileStats, tokenStats, errorStats] = await Promise.all([
      prisma.file.aggregate({
        where: {
          createdAt: { gte: thirtyDaysAgo }
        },
        _count: true,
        _avg: { fileSize: true }
      }),
      prisma.creditTransaction.aggregate({
        where: {
          type: 'SPENT',
          createdAt: { gte: thirtyDaysAgo }
        },
        _sum: { amount: true }
      }),
      prisma.errorFix.count({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: thirtyDaysAgo }
        }
      })
    ])
    
    // 성능 통계
    const [processingStats, successCount, errorCount] = await Promise.all([
      prisma.analysisJob.aggregate({
        where: {
          createdAt: { gte: thirtyDaysAgo }
        },
        _avg: { processingTime: true }
      }),
      prisma.analysisJob.count({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: thirtyDaysAgo }
        }
      }),
      prisma.analysisJob.count({
        where: {
          status: 'FAILED',
          createdAt: { gte: thirtyDaysAgo }
        }
      })
    ])
    
    const totalJobs = successCount + errorCount
    
    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        new: newUsers,
        byTier: userTierMap
      },
      revenue: {
        total: totalRevenue._sum.amount || 0,
        monthly: monthlyRevenue._sum.amount || 0,
        weekly: weeklyRevenue._sum.amount || 0,
        byTier: revenueTierMap
      },
      usage: {
        filesProcessed: fileStats._count || 0,
        tokensUsed: tokenStats._sum.amount || 0,
        errorsFixed: errorStats,
        averageFileSize: fileStats._avg.fileSize || 0
      },
      performance: {
        averageProcessingTime: processingStats._avg.processingTime || 0,
        successRate: totalJobs > 0 ? (successCount / totalJobs) * 100 : 0,
        errorRate: totalJobs > 0 ? (errorCount / totalJobs) * 100 : 0
      }
    }
  }
  
  // 사용자 목록 가져오기 (페이지네이션)
  async getUsers(page: number = 1, limit: number = 20, filters?: {
    tier?: string
    role?: string
    search?: string
  }) {
    const skip = (page - 1) * limit
    
    const where: any = {}
    
    if (filters?.tier) {
      where.tier = filters.tier
    }
    
    if (filters?.role) {
      where.role = filters.role
    }
    
    if (filters?.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { name: { contains: filters.search, mode: 'insensitive' } }
      ]
    }
    
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          tier: true,
          role: true,
          credits: true,
          createdAt: true,
          lastActiveAt: true,
          emailVerified: true,
          _count: {
            select: {
              files: true,
              creditTransactions: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ])
    
    return {
      users,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page
    }
  }
  
  // 사용자 상세 정보
  async getUserDetails(userId: string): Promise<UserDetails> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        creditTransactions: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        },
        files: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        },
        payments: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    })
    
    if (!user) throw new Error('사용자를 찾을 수 없습니다.')
    
    // 통계 계산
    const stats = await Promise.all([
      prisma.file.count({ where: { userId } }),
      prisma.creditTransaction.aggregate({
        where: { userId, type: 'SPENT' },
        _sum: { amount: true }
      }),
      prisma.payment.aggregate({
        where: { userId, status: 'COMPLETED' },
        _sum: { amount: true }
      })
    ])
    
    return {
      ...user,
      stats: {
        totalFiles: stats[0],
        totalCreditsUsed: stats[1]._sum.amount || 0,
        totalSpent: stats[2]._sum.amount || 0
      }
    }
  }
  
  // 사용자 등급 변경 (관리자용)
  async updateUserTier(userId: string, newTier: string, adminId: string, reason: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { tier: true }
    })
    
    if (!user) throw new Error('사용자를 찾을 수 없습니다.')
    
    // 등급 변경
    await prisma.user.update({
      where: { id: userId },
      data: { 
        tier: newTier,
        tierUpdatedAt: new Date()
      }
    })
    
    // 변경 기록
    await prisma.tierHistory.create({
      data: {
        userId,
        fromTier: user.tier || USER_TIERS.FREE,
        toTier: newTier,
        reason,
        changedBy: adminId
      }
    })
    
    // 감사 로그
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'UPDATE_USER_TIER',
        targetId: userId,
        details: {
          fromTier: user.tier,
          toTier: newTier,
          reason
        }
      }
    })
    
    return true
  }
  
  // 크레딧 지급/차감 (관리자용)
  async adjustUserCredits(userId: string, amount: number, reason: string, adminId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true }
    })
    
    if (!user) throw new Error('사용자를 찾을 수 없습니다.')
    
    const newBalance = user.credits + amount
    if (newBalance < 0) throw new Error('크레딧 잔액이 음수가 될 수 없습니다.')
    
    // 크레딧 업데이트
    await prisma.user.update({
      where: { id: userId },
      data: { credits: newBalance }
    })
    
    // 거래 기록
    await prisma.creditTransaction.create({
      data: {
        userId,
        amount: Math.abs(amount),
        type: amount > 0 ? 'EARNED' : 'SPENT',
        reason: `[관리자 조정] ${reason}`,
        balance: newBalance
      }
    })
    
    // 감사 로그
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'ADJUST_USER_CREDITS',
        targetId: userId,
        details: {
          amount,
          reason,
          newBalance
        }
      }
    })
    
    return newBalance
  }
}