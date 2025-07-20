'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { 
  Check, 
  Coins, 
  Zap, 
  Star, 
  TrendingUp, 
  CreditCard,
  Shield,
  Loader2
} from 'lucide-react'
import { useUserStore } from '@/lib/stores/userStore'

interface PricingPlan {
  id: string
  name: string
  description: string
  credits: number
  price: number
  originalPrice?: number
  popular?: boolean
  features: string[]
  icon: any
}

const pricingPlans: PricingPlan[] = [
  {
    id: 'starter',
    name: '스타터',
    description: '개인 사용자를 위한 기본 패키지',
    credits: 100,
    price: 9900,
    features: [
      '100 토큰',
      '기본 오류 분석',
      '이메일 지원',
      '7일 데이터 보관'
    ],
    icon: Zap
  },
  {
    id: 'professional',
    name: '프로페셔널',
    description: '전문가를 위한 인기 패키지',
    credits: 500,
    price: 39900,
    originalPrice: 49900,
    popular: true,
    features: [
      '500 토큰',
      '고급 오류 분석',
      'VBA 코드 분석',
      '성능 최적화',
      '우선 지원',
      '30일 데이터 보관'
    ],
    icon: Star
  },
  {
    id: 'enterprise',
    name: '엔터프라이즈',
    description: '팀과 기업을 위한 대용량 패키지',
    credits: 2000,
    price: 149900,
    features: [
      '2,000 토큰',
      '모든 기능 포함',
      'API 액세스',
      '전담 지원',
      '무제한 데이터 보관',
      '팀 협업 기능'
    ],
    icon: TrendingUp
  }
]

export default function PricingPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { data: session, status } = useSession()
  const credits = useUserStore((state) => state.credits)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  
  const handlePurchase = async (plan: PricingPlan) => {
    if (status === 'unauthenticated') {
      toast({
        title: '로그인 필요',
        description: '토큰을 구매하려면 로그인이 필요합니다.',
        variant: 'destructive'
      })
      router.push('/auth/login')
      return
    }
    
    setSelectedPlan(plan.id)
    setIsProcessing(true)
    
    try {
      // TODO: 실제 결제 처리 (토스페이먼츠 연동)
      // const payment = await initiatePayment(plan)
      
      // 임시로 성공 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // 토큰 추가
      useUserStore.getState().addCredits(plan.credits, `${plan.name} 플랜 구매`)
      
      toast({
        title: '구매 완료',
        description: `${plan.credits} 크레딧이 추가되었습니다.`,
        duration: 5000
      })
      
      router.push('/dashboard')
    } catch (error) {
      toast({
        title: '구매 실패',
        description: '결제 처리 중 오류가 발생했습니다.',
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
      setSelectedPlan(null)
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl font-bold mb-4">토큰 구매</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-6">
            필요한 만큼만 구매하여 사용하세요
          </p>
          {status === 'authenticated' && (
            <div className="inline-flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-full px-4 py-2">
              <Coins className="h-5 w-5 text-yellow-500" />
              <span className="font-medium">현재 보유: {credits} 크레딧</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Pricing Cards */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {pricingPlans.map((plan) => {
            const Icon = plan.icon
            const isLoading = isProcessing && selectedPlan === plan.id
            
            return (
              <Card 
                key={plan.id}
                className={`relative ${plan.popular ? 'border-primary shadow-lg scale-105' : ''}`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    인기
                  </Badge>
                )}
                
                <CardHeader>
                  <div className="flex items-center justify-between mb-4">
                    <Icon className="h-8 w-8 text-primary" />
                    <Badge variant="secondary" className="text-lg">
                      {plan.credits} 크레딧
                    </Badge>
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="text-center py-4">
                    <div className="flex items-baseline justify-center">
                      <span className="text-4xl font-bold">
                        ₩{plan.price.toLocaleString()}
                      </span>
                    </div>
                    {plan.originalPrice && (
                      <div className="flex items-center justify-center space-x-2 mt-2">
                        <span className="text-sm text-gray-500 line-through">
                          ₩{plan.originalPrice.toLocaleString()}
                        </span>
                        <Badge variant="destructive" className="text-xs">
                          {Math.round((1 - plan.price / plan.originalPrice) * 100)}% 할인
                        </Badge>
                      </div>
                    )}
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      크레딧당 ₩{Math.round(plan.price / plan.credits)}
                    </p>
                  </div>
                  
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                
                <CardFooter>
                  <Button 
                    className="w-full" 
                    size="lg"
                    variant={plan.popular ? 'default' : 'outline'}
                    onClick={() => handlePurchase(plan)}
                    disabled={isProcessing}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        처리 중...
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        구매하기
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
        
        {/* Features */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold mb-8">모든 플랜에 포함</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="flex flex-col items-center">
              <Shield className="h-12 w-12 text-primary mb-3" />
              <h3 className="font-semibold mb-2">안전한 결제</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                토스페이먼츠로 안전하게 결제
              </p>
            </div>
            <div className="flex flex-col items-center">
              <Zap className="h-12 w-12 text-primary mb-3" />
              <h3 className="font-semibold mb-2">즉시 충전</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                결제 즉시 토큰 사용 가능
              </p>
            </div>
            <div className="flex flex-col items-center">
              <TrendingUp className="h-12 w-12 text-primary mb-3" />
              <h3 className="font-semibold mb-2">사용 기한 없음</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                구매한 토큰은 영구 사용 가능
              </p>
            </div>
          </div>
        </div>
        
        {/* FAQ */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-8 text-center">자주 묻는 질문</h2>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">토큰은 어떻게 사용되나요?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400">
                  파일 분석(20토큰), 오류 수정(개당 2토큰), AI 채팅(1토큰) 등 
                  각 기능 사용 시 토큰이 차감됩니다.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">환불이 가능한가요?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400">
                  사용하지 않은 토큰에 한해 구매 후 7일 이내 환불이 가능합니다.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">기업 할인이 있나요?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400">
                  10명 이상의 팀은 별도 문의를 통해 할인 혜택을 받으실 수 있습니다.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}