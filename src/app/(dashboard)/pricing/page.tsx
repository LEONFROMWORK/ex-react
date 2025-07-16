"use client"

import { useState, useEffect } from "react"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PaymentWidget } from "@/components/payment/PaymentWidget"
import { useRouter } from "next/navigation"

const PLANS = {
  BASIC: {
    name: "Basic",
    monthlyPrice: 29900,
    yearlyPrice: 299000,
    tokens: 1000,
    features: [
      "월 1,000 토큰",
      "기본 엑셀 오류 검증",
      "AI 오류 수정 제안",
      "PDF 리포트 다운로드",
      "이메일 지원",
    ],
  },
  PREMIUM: {
    name: "Premium",
    monthlyPrice: 59900,
    yearlyPrice: 599000,
    tokens: 3000,
    features: [
      "월 3,000 토큰",
      "고급 수식 분석",
      "실시간 AI 채팅 지원",
      "우선 처리",
      "팀 협업 기능",
      "24시간 전화 지원",
    ],
    popular: true,
  },
  ENTERPRISE: {
    name: "Enterprise",
    monthlyPrice: 99900,
    yearlyPrice: 999000,
    tokens: 10000,
    features: [
      "월 10,000 토큰",
      "무제한 파일 크기",
      "전용 AI 모델",
      "API 액세스",
      "전담 매니저",
      "맞춤형 기능 개발",
    ],
  },
}

export default function PricingPage() {
  const router = useRouter()
  const [billingPeriod, setBillingPeriod] = useState<"MONTHLY" | "YEARLY">("MONTHLY")
  const [selectedPlan, setSelectedPlan] = useState<"BASIC" | "PREMIUM" | "ENTERPRISE" | null>(null)
  const [showPayment, setShowPayment] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const testUser = localStorage.getItem('testUser')
    if (!testUser) {
      router.push("/auth/simple-login")
      return
    }
    setUser(JSON.parse(testUser))
  }, [router])

  const handleSelectPlan = (plan: "BASIC" | "PREMIUM" | "ENTERPRISE") => {
    if (!user) {
      router.push("/auth/simple-login")
      return
    }
    setSelectedPlan(plan)
    setShowPayment(true)
  }

  const handlePaymentSuccess = () => {
    setShowPayment(false)
    router.push("/dashboard")
  }

  return (
    <div className="container mx-auto py-10">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-4">합리적인 가격으로 시작하세요</h1>
        <p className="text-xl text-muted-foreground">
          모든 플랜에 7일 무료 체험이 포함되어 있습니다
        </p>
      </div>

      <div className="flex justify-center mb-8">
        <Tabs value={billingPeriod} onValueChange={(v) => setBillingPeriod(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="MONTHLY">월간 결제</TabsTrigger>
            <TabsTrigger value="YEARLY">
              연간 결제
              <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                17% 할인
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {(Object.entries(PLANS) as [keyof typeof PLANS, typeof PLANS[keyof typeof PLANS]][]).map(
          ([key, plan]) => {
            const price = billingPeriod === "MONTHLY" ? plan.monthlyPrice : plan.yearlyPrice
            const pricePerMonth = billingPeriod === "YEARLY" ? Math.floor(plan.yearlyPrice / 12) : plan.monthlyPrice

            return (
              <Card
                key={key}
                className={'popular' in plan && plan.popular ? "border-primary shadow-lg" : ""}
              >
                {'popular' in plan && plan.popular && (
                  <div className="bg-primary text-primary-foreground text-center py-2 text-sm font-medium">
                    가장 인기 있는 플랜
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>
                    {plan.tokens.toLocaleString()} 토큰/월
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">
                      ₩{pricePerMonth.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground">/월</span>
                    {billingPeriod === "YEARLY" && (
                      <p className="text-sm text-muted-foreground mt-1">
                        연 ₩{price.toLocaleString()} 청구
                      </p>
                    )}
                  </div>
                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start">
                        <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    variant={'popular' in plan && plan.popular ? "default" : "outline"}
                    onClick={() => handleSelectPlan(key)}
                  >
                    시작하기
                  </Button>
                </CardFooter>
              </Card>
            )
          }
        )}
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedPlan && PLANS[selectedPlan].name} 플랜 결제
            </DialogTitle>
          </DialogHeader>
          {selectedPlan && (
            <PaymentWidget
              plan={selectedPlan}
              billingPeriod={billingPeriod}
              onSuccess={handlePaymentSuccess}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}