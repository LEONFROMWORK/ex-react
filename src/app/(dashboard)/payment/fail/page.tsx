"use client"

import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { XCircle, RefreshCw, MessageSquare } from "lucide-react"
import Link from "next/link"

const ERROR_MESSAGES: Record<string, string> = {
  MISSING_PARAMETERS: "결제 정보가 올바르지 않습니다.",
  INVALID_REQUEST: "잘못된 결제 요청입니다.",
  AMOUNT_MISMATCH: "결제 금액이 일치하지 않습니다.",
  PAYMENT_CONFIRM_FAILED: "결제 승인에 실패했습니다.",
  INSUFFICIENT_BALANCE: "잔액이 부족합니다.",
  CARD_EXPIRED: "카드 유효기간이 만료되었습니다.",
  LIMIT_EXCEEDED: "결제 한도를 초과했습니다.",
  CANCELED_BY_USER: "사용자가 결제를 취소했습니다.",
  INTERNAL_ERROR: "시스템 오류가 발생했습니다.",
}

export default function PaymentFailPage() {
  const searchParams = useSearchParams()
  const code = searchParams.get("code") || "UNKNOWN_ERROR"
  const message = searchParams.get("message") || ""

  const errorMessage = ERROR_MESSAGES[code] || message || "결제 처리 중 오류가 발생했습니다."

  return (
    <div className="container max-w-2xl py-20">
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <XCircle className="h-16 w-16 text-destructive" />
          </div>
          <CardTitle className="text-2xl">결제에 실패했습니다</CardTitle>
          <CardDescription>
            결제 처리 중 문제가 발생했습니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>

          <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">오류 코드</span>
              <span className="font-mono">{code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">발생 시간</span>
              <span>{new Date().toLocaleString("ko-KR")}</span>
            </div>
          </div>

          <div className="space-y-3">
            <Button asChild className="w-full" size="lg">
              <Link href="/pricing">
                <RefreshCw className="mr-2 h-4 w-4" />
                다시 시도하기
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="w-full">
              <Link href="/support">
                <MessageSquare className="mr-2 h-4 w-4" />
                고객 지원 문의
              </Link>
            </Button>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>결제 관련 문의사항은 고객센터로 연락주세요</p>
            <p className="mt-1">support@exhell.com | 1544-0000</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}