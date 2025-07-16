'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Crown, Zap, Rocket, Building2, ArrowUpRight } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { UserTierService } from '@/lib/services/user-tier.service'
import { USER_TIERS, TIER_LIMITS, UserTier } from '@/lib/constants/user-tiers'
import Link from 'next/link'

interface UserTierBadgeProps {
  showDetails?: boolean
  className?: string
}

const tierIcons = {
  [USER_TIERS.FREE]: null,
  [USER_TIERS.BASIC]: Zap,
  [USER_TIERS.PRO]: Crown,
  [USER_TIERS.ENTERPRISE]: Building2
}

const tierColors = {
  [USER_TIERS.FREE]: 'secondary',
  [USER_TIERS.BASIC]: 'default',
  [USER_TIERS.PRO]: 'primary',
  [USER_TIERS.ENTERPRISE]: 'destructive'
} as const

export function UserTierBadge({ showDetails = false, className }: UserTierBadgeProps) {
  const { data: session } = useSession()
  const [userTier, setUserTier] = useState<UserTier>(USER_TIERS.FREE)
  const [fileUsage, setFileUsage] = useState({ used: 0, limit: 0 })
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const loadUserTier = async () => {
      if (!session?.user?.id) return
      
      const tierService = UserTierService.getInstance()
      const tier = await tierService.getUserTier(session.user.id)
      setUserTier(tier)
      
      // 파일 사용량 조회
      const fileLimit = await tierService.checkMonthlyFileLimit(session.user.id)
      const limit = TIER_LIMITS[tier].maxFilesPerMonth
      const used = limit === -1 ? 0 : limit - fileLimit.remaining
      
      setFileUsage({ used, limit })
      setLoading(false)
    }
    
    loadUserTier()
  }, [session])
  
  const Icon = tierIcons[userTier]
  const tierName = TIER_LIMITS[userTier].name
  const color = tierColors[userTier]
  
  if (loading) {
    return <Badge variant="outline" className={className}>로딩중...</Badge>
  }
  
  if (!showDetails) {
    return (
      <Badge variant={color} className={className}>
        {Icon && <Icon className="mr-1 h-3 w-3" />}
        {tierName}
      </Badge>
    )
  }
  
  const usagePercentage = fileUsage.limit === -1 ? 0 : (fileUsage.used / fileUsage.limit) * 100
  
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {Icon && <Icon className="h-5 w-5" />}
            {tierName} 플랜
          </CardTitle>
          {userTier !== USER_TIERS.ENTERPRISE && (
            <Button size="sm" variant="ghost" asChild>
              <Link href="/pricing">
                업그레이드
                <ArrowUpRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          )}
        </div>
        <CardDescription>
          {TIER_LIMITS[userTier].monthlyTokens === -1 
            ? '무제한 토큰' 
            : `월 ${TIER_LIMITS[userTier].monthlyTokens?.toLocaleString() || 0} 토큰`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 파일 사용량 */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">월간 파일 처리</span>
            <span className="font-medium">
              {fileUsage.limit === -1 
                ? '무제한' 
                : `${fileUsage.used} / ${fileUsage.limit}`}
            </span>
          </div>
          {fileUsage.limit !== -1 && (
            <Progress value={usagePercentage} className="h-2" />
          )}
        </div>
        
        {/* 주요 기능 */}
        <div className="space-y-1">
          <p className="text-sm font-medium mb-2">포함된 기능</p>
          {Object.entries(TIER_LIMITS[userTier].features)
            .filter(([_, enabled]) => enabled)
            .slice(0, 4)
            .map(([feature]) => (
              <div key={feature} className="flex items-center gap-2 text-xs text-muted-foreground">
                <Rocket className="h-3 w-3" />
                {getFeatureName(feature as keyof typeof TIER_LIMITS.FREE.features)}
              </div>
            ))}
        </div>
        
        {/* 무료 체험 정보 (무료 사용자만) */}
        {userTier === USER_TIERS.FREE && session?.user?.id && (
          <FreeTrial userId={session.user.id} />
        )}
      </CardContent>
    </Card>
  )
}

function FreeTrial({ userId }: { userId: string }) {
  const [trial, setTrial] = useState({ active: false, daysRemaining: 0 })
  
  useEffect(() => {
    const checkTrial = async () => {
      const tierService = UserTierService.getInstance()
      const trialInfo = await tierService.checkFreeTrial(userId)
      setTrial(trialInfo)
    }
    
    checkTrial()
  }, [userId])
  
  if (!trial.active) return null
  
  return (
    <div className="rounded-lg bg-muted p-3">
      <p className="text-xs font-medium">무료 체험 기간</p>
      <p className="text-xs text-muted-foreground mt-1">
        {trial.daysRemaining}일 남음 - 모든 기능을 체험해보세요!
      </p>
    </div>
  )
}

function getFeatureName(feature: keyof typeof TIER_LIMITS.FREE.features): string {
  const featureNames = {
    basicAnalysis: '기본 분석',
    advancedAnalysis: '고급 분석',
    vbaAnalysis: 'VBA 분석',
    performanceOptimization: '성능 최적화',
    batchProcessing: '일괄 처리',
    prioritySupport: '우선 지원',
    apiAccess: 'API 접근',
    customReports: '맞춤 리포트',
    teamCollaboration: '팀 협업',
    fileVersioning: '파일 버전 관리'
  }
  
  return featureNames[feature] || feature
}