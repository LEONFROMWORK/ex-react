import { UserTier, USER_TIERS, TIER_LIMITS, TIER_TOKEN_COSTS } from '@/lib/constants/user-tiers'
import { prisma } from '@/lib/prisma'

export class UserTierService {
  private static instance: UserTierService
  
  private constructor() {}
  
  static getInstance(): UserTierService {
    if (!UserTierService.instance) {
      UserTierService.instance = new UserTierService()
    }
    return UserTierService.instance
  }
  
  // 사용자 등급 조회
  async getUserTier(userId: string): Promise<UserTier> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { tier: true }
      })
      
      return (user?.tier as UserTier) || USER_TIERS.FREE
    } catch (error) {
      console.error('Error fetching user tier:', error)
      return USER_TIERS.FREE
    }
  }
  
  // 기능 사용 가능 여부 확인
  async canUseFeature(userId: string, feature: keyof typeof TIER_LIMITS.FREE.features): Promise<boolean> {
    const tier = await this.getUserTier(userId)
    return TIER_LIMITS[tier].features[feature]
  }
  
  // 파일 크기 제한 확인
  async checkFileSizeLimit(userId: string, fileSize: number): Promise<{ allowed: boolean; maxSize: number }> {
    const tier = await this.getUserTier(userId)
    const maxSize = TIER_LIMITS[tier].maxFileSize
    
    return {
      allowed: fileSize <= maxSize,
      maxSize
    }
  }
  
  // 월간 파일 처리 제한 확인
  async checkMonthlyFileLimit(userId: string): Promise<{ allowed: boolean; remaining: number }> {
    const tier = await this.getUserTier(userId)
    const limit = TIER_LIMITS[tier].maxFilesPerMonth
    
    // 무제한인 경우
    if (limit === -1) {
      return { allowed: true, remaining: -1 }
    }
    
    // 이번 달 처리한 파일 수 조회
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    
    const fileCount = await prisma.file.count({
      where: {
        userId,
        createdAt: {
          gte: startOfMonth
        }
      }
    })
    
    return {
      allowed: fileCount < limit,
      remaining: Math.max(0, limit - fileCount)
    }
  }
  
  // 등급별 토큰 비용 조회
  getTokenCost(tier: UserTier, action: keyof typeof TIER_TOKEN_COSTS.FREE): number | null {
    return TIER_TOKEN_COSTS[tier][action]
  }
  
  // 분석 옵션 제한 확인
  getAnalysisOptions(tier: UserTier) {
    return TIER_LIMITS[tier].analysisOptions
  }
  
  // 사용자 등급 업그레이드
  async upgradeTier(userId: string, newTier: UserTier): Promise<boolean> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { 
          tier: newTier,
          tierUpdatedAt: new Date()
        }
      })
      
      // 등급 변경 기록
      await prisma.tierHistory.create({
        data: {
          userId,
          fromTier: await this.getUserTier(userId),
          toTier: newTier,
          reason: 'MANUAL_UPGRADE'
        }
      })
      
      return true
    } catch (error) {
      console.error('Error upgrading tier:', error)
      return false
    }
  }
  
  // 무료 체험 기간 확인
  async checkFreeTrial(userId: string): Promise<{ active: boolean; daysRemaining: number }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        createdAt: true,
        freeTrialEndsAt: true,
        tier: true
      }
    })
    
    if (!user || user.tier !== USER_TIERS.FREE) {
      return { active: false, daysRemaining: 0 }
    }
    
    const trialEndDate = user.freeTrialEndsAt || new Date(user.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000) // 7일
    const now = new Date()
    
    if (now > trialEndDate) {
      return { active: false, daysRemaining: 0 }
    }
    
    const daysRemaining = Math.ceil((trialEndDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    
    return { active: true, daysRemaining }
  }
  
  // 기능별 제한 메시지 생성
  getFeatureRestrictionMessage(feature: keyof typeof TIER_LIMITS.FREE.features, currentTier: UserTier): string {
    const requiredTiers = Object.entries(TIER_LIMITS)
      .filter(([_, limits]) => limits.features[feature])
      .map(([tier]) => tier)
    
    if (requiredTiers.length === 0) {
      return '이 기능은 현재 사용할 수 없습니다.'
    }
    
    const lowestRequiredTier = requiredTiers[0]
    const tierName = TIER_LIMITS[lowestRequiredTier as UserTier].name
    
    return `이 기능은 ${tierName} 이상 등급에서 사용 가능합니다.`
  }
}