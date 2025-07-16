'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, CheckCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function RegisterSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold">회원가입이 완료되었습니다!</CardTitle>
          <CardDescription>
            마지막 단계만 남았습니다
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription className="ml-2">
              <strong>이메일을 확인해주세요!</strong>
              <br />
              등록하신 이메일 주소로 인증 링크를 보내드렸습니다.
              <br />
              이메일 인증을 완료하면 <strong>무료 토큰 50개</strong>가 즉시 지급됩니다.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">다음 단계:</h3>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start">
                <span className="mr-2 font-semibold">1.</span>
                이메일 받은함을 확인하세요
              </li>
              <li className="flex items-start">
                <span className="mr-2 font-semibold">2.</span>
                &quot;이메일 인증하기&quot; 버튼을 클릭하세요
              </li>
              <li className="flex items-start">
                <span className="mr-2 font-semibold">3.</span>
                로그인하여 Excel 분석을 시작하세요!
              </li>
            </ol>
          </div>
          
          <div className="pt-4 space-y-3">
            <p className="text-sm text-center text-muted-foreground">
              이메일이 도착하지 않았나요?
            </p>
            <div className="space-y-2">
              <Button variant="outline" className="w-full" disabled>
                인증 이메일 다시 보내기
              </Button>
              <Button asChild className="w-full">
                <Link href="/auth/login">
                  로그인 페이지로 이동
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
          
          <div className="text-xs text-center text-muted-foreground pt-4 border-t">
            <p>이메일이 스팸함에 있을 수 있습니다.</p>
            <p>인증 링크는 24시간 동안 유효합니다.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}