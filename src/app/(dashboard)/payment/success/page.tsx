"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, Download, Loader2 } from "lucide-react"
import Link from "next/link"

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get("orderId")
  const [loading, setLoading] = useState(true)
  const [orderDetails, setOrderDetails] = useState<any>(null)

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails()
    } else {
      setLoading(false)
    }
  }, [orderId])

  const fetchOrderDetails = async () => {
    try {
      // TODO: Implement order details API
      // For now, just show success message
      setTimeout(() => {
        setOrderDetails({
          orderId,
          plan: "Premium",
          amount: 59900,
        })
        setLoading(false)
      }, 1000)
    } catch (error) {
      console.error("Failed to fetch order details:", error)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container max-w-2xl py-20">
        <div className="flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-2xl py-20">
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl">결제가 완료되었습니다!</CardTitle>
          <CardDescription>
            구독이 성공적으로 활성화되었습니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {orderDetails && (
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">주문번호</span>
                <span className="font-mono text-sm">{orderDetails.orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">구독 플랜</span>
                <span>{orderDetails.plan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">결제 금액</span>
                <span>₩{orderDetails.amount.toLocaleString()}</span>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Button asChild className="w-full" size="lg">
              <Link href="/dashboard">
                대시보드로 이동
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="w-full">
              <Link href="/settings/billing">
                <Download className="mr-2 h-4 w-4" />
                영수증 다운로드
              </Link>
            </Button>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>결제 내역은 설정 {'>'} 결제 관리에서 확인할 수 있습니다</p>
            <p className="mt-2">
              문의사항이 있으시면{" "}
              <Link href="/support" className="text-primary hover:underline">
                고객 지원
              </Link>
              으로 연락주세요
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}