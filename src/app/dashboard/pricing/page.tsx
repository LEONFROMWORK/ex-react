"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, X, Zap, Crown, Building2 } from "lucide-react"
import Link from "next/link"
import { USER_TIERS, TIER_LIMITS, TIER_PRICING, type UserTier } from '@/lib/constants/user-tiers'
import { useSession } from 'next-auth/react'
import { UserTierService } from '@/lib/services/user-tier.service'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'

const tierIcons = {
  [USER_TIERS.FREE]: null,
  [USER_TIERS.BASIC]: Zap,
  [USER_TIERS.PRO]: Crown,
  [USER_TIERS.ENTERPRISE]: Building2
}

const plans = [
  {
    tier: USER_TIERS.FREE,
    name: TIER_LIMITS[USER_TIERS.FREE].name,
    price: "₩0",
    yearlyPrice: "₩0",
    description: TIER_PRICING[USER_TIERS.FREE].description,
    features: [
      "회원가입 보너스 50 크레딧",
      "기본 Excel 오류 검사",
      `파일당 최대 ${TIER_LIMITS[USER_TIERS.FREE].maxFileSize / 1024 / 1024}MB`,
      `월 ${TIER_LIMITS[USER_TIERS.FREE].maxFilesPerMonth}개 파일 처리`,
      "커뮤니티 지원",
    ],
    notIncluded: [
      "자동 오류 수정",
      "VBA 코드 분석",
      "성능 최적화",
      "API 액세스",
      "우선 지원",
    ],
  },
  {
    tier: USER_TIERS.BASIC,
    name: TIER_LIMITS[USER_TIERS.BASIC].name,
    price: `₩${TIER_PRICING[USER_TIERS.BASIC].monthly?.toLocaleString()}`,
    yearlyPrice: `₩${(TIER_PRICING[USER_TIERS.BASIC].yearly! / 12).toLocaleString()}`,
    description: TIER_PRICING[USER_TIERS.BASIC].description,
    features: [
      `월 ${TIER_LIMITS[USER_TIERS.BASIC].monthlyTokens} 크레딧`,
      "고급 오류 검사 및 자동 수정",
      "성능 최적화 제안",
      `파일당 최대 ${TIER_LIMITS[USER_TIERS.BASIC].maxFileSize / 1024 / 1024}MB`,
      `월 ${TIER_LIMITS[USER_TIERS.BASIC].maxFilesPerMonth}개 파일 처리`,
      "파일 버전 관리",
      "이메일 지원",
    ],
    notIncluded: [
      "VBA 코드 분석",
      "일괄 처리",
      "API 액세스",
      "우선 지원",
    ],
  },
  {
    tier: USER_TIERS.PRO,
    name: TIER_LIMITS[USER_TIERS.PRO].name,
    price: `₩${TIER_PRICING[USER_TIERS.PRO].monthly?.toLocaleString()}`,
    yearlyPrice: `₩${(TIER_PRICING[USER_TIERS.PRO].yearly! / 12).toLocaleString()}`,
    description: TIER_PRICING[USER_TIERS.PRO].description,
    features: [
      `월 ${TIER_LIMITS[USER_TIERS.PRO].monthlyTokens} 크레딧`,
      "모든 분석 기능",
      "VBA 코드 분석 및 최적화",
      `파일당 최대 ${TIER_LIMITS[USER_TIERS.PRO].maxFileSize / 1024 / 1024}MB`,
      `월 ${TIER_LIMITS[USER_TIERS.PRO].maxFilesPerMonth}개 파일 처리`,
      "일괄 처리 기능",
      "API 액세스 (5,000 호출/월)",
      "우선 지원",
    ],
    notIncluded: [
      "팀 협업 기능",
      "무제한 크레딧",
      "전담 지원",
    ],
    popular: true,
  },
  {
    tier: USER_TIERS.ENTERPRISE,
    name: TIER_LIMITS[USER_TIERS.ENTERPRISE].name,
    price: "문의",
    yearlyPrice: "문의",
    description: TIER_PRICING[USER_TIERS.ENTERPRISE].description,
    features: [
      "무제한 크레딧",
      "모든 기능 무제한",
      `파일당 최대 ${TIER_LIMITS[USER_TIERS.ENTERPRISE].maxFileSize / 1024 / 1024}MB`,
      "무제한 파일 처리",
      "팀 협업 기능",
      "전담 지원 매니저",
      "API 무제한 액세스",
      "사내 교육 제공",
      "SLA 보장",
    ],
    notIncluded: [],
  },
]

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly")
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [currentUserTier, setCurrentUserTier] = useState<UserTier>(USER_TIERS.FREE)
  const [isProcessing, setIsProcessing] = useState(false)
  
  // 현재 사용자 등급 가져오기
  useEffect(() => {
    const loadUserTier = async () => {
      if (!session?.user?.id) return
      const tierService = UserTierService.getInstance()
      const tier = await tierService.getUserTier(session.user.id)
      setCurrentUserTier(tier)
    }
    loadUserTier()
  }, [session?.user?.id])
  
  const handleUpgrade = async (tier: UserTier) => {
    if (!session?.user?.id) {
      toast({
        title: '로그인 필요',
        description: '업그레이드하려면 로그인이 필요합니다.',
        variant: 'destructive'
      })
      router.push('/auth/login')
      return
    }
    
    if (tier === USER_TIERS.ENTERPRISE) {
      // 엔터프라이즈는 문의 페이지로
      router.push('/contact?type=enterprise')
      return
    }
    
    setIsProcessing(true)
    
    try {
      // TODO: 결제 프로세스 구현
      toast({
        title: '결제 페이지로 이동',
        description: '결제 시스템이 준비 중입니다.',
      })
      
      // 임시로 결제 페이지로 이동
      router.push(`/dashboard/payment?plan=${tier}&cycle=${billingCycle}`)
    } catch (error) {
      toast({
        title: '오류 발생',
        description: '업그레이드 중 오류가 발생했습니다.',
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 dark:text-white">
            합리적인 가격으로 시작하세요
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            필요에 따라 선택할 수 있는 유연한 요금제
          </p>
          
          {/* Billing Cycle Toggle */}
          <div className="inline-flex items-center bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingCycle === "monthly"
                  ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              월간 결제
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingCycle === "yearly"
                  ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              연간 결제 (20% 할인)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {plans.map((plan) => {
            const Icon = tierIcons[plan.tier]
            const isCurrentPlan = plan.tier === currentUserTier
            const price = billingCycle === "yearly" ? plan.yearlyPrice : plan.price
            
            return (
              <Card
                key={plan.name}
                className={`relative ${
                  plan.popular
                    ? "ring-2 ring-primary shadow-lg"
                    : ""
                } ${isCurrentPlan ? "bg-muted/50" : ""}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                      인기
                    </span>
                  </div>
                )}
                {isCurrentPlan && (
                  <div className="absolute -top-4 right-4">
                    <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      현재 플랜
                    </span>
                  </div>
                )}
                <CardHeader className="text-center pb-8">
                  <div className="flex justify-center mb-3">
                    {Icon && <Icon className="h-8 w-8 text-primary" />}
                  </div>
                  <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{price}</span>
                    {plan.price !== "₩0" && plan.price !== "문의" && (
                      <span className="text-gray-600 dark:text-gray-400">/월</span>
                    )}
                  </div>
                  {billingCycle === "yearly" && plan.tier !== USER_TIERS.FREE && plan.tier !== USER_TIERS.ENTERPRISE && (
                    <div className="mt-1 text-sm text-green-600">
                      연간 결제 시 2개월 무료
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start">
                        <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                    {plan.notIncluded.map((feature) => (
                      <div key={feature} className="flex items-start opacity-50">
                        <X className="w-5 h-5 text-gray-400 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-sm line-through">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <Button
                    className="w-full"
                    variant={isCurrentPlan ? "secondary" : plan.popular ? "default" : "outline"}
                    size="lg"
                    disabled={isCurrentPlan || isProcessing}
                    onClick={() => handleUpgrade(plan.tier)}
                  >
                    {isCurrentPlan 
                      ? "현재 플랜" 
                      : plan.tier === USER_TIERS.ENTERPRISE
                      ? "문의하기"
                      : plan.tier === USER_TIERS.FREE
                      ? "다운그레이드"
                      : "업그레이드"}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold mb-4 dark:text-white">
            자주 묻는 질문
          </h2>
          <div className="max-w-2xl mx-auto space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">크레딧은 어떻게 사용되나요?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400">
                  1개의 크레딧으로 약 1,000개의 셀을 처리할 수 있습니다. 
                  파일의 크기와 복잡도에 따라 소비되는 크레딧이 달라질 수 있습니다.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">언제든지 플랜을 변경할 수 있나요?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400">
                  네, 언제든지 플랜을 업그레이드하거나 다운그레이드할 수 있습니다. 
                  변경사항은 다음 결제일부터 적용됩니다.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">환불 정책은 어떻게 되나요?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400">
                  첫 구독 후 7일 이내에 환불을 요청하실 수 있습니다. 
                  사용한 크레딧에 대한 금액은 제외됩니다.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}