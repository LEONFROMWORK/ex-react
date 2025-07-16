'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, Loader2, FileSpreadsheet } from 'lucide-react'
import Link from 'next/link'
import { ThemeToggle } from '@/components/theme-toggle'

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('인증 토큰이 없습니다.')
      return
    }

    // 이메일 인증 API 호출
    fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStatus('success')
          setMessage(data.message || '이메일 인증이 완료되었습니다.')
          // 3초 후 로그인 페이지로 이동
          setTimeout(() => {
            router.push('/auth/login')
          }, 3000)
        } else {
          setStatus('error')
          setMessage(data.message || '이메일 인증에 실패했습니다.')
        }
      })
      .catch(() => {
        setStatus('error')
        setMessage('서버 오류가 발생했습니다.')
      })
  }, [token, router])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <nav className="fixed top-0 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b dark:border-gray-800 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2">
            <FileSpreadsheet className="h-6 w-6 dark:text-white" />
            <span className="text-xl font-bold dark:text-white">Exhell</span>
          </Link>
          <ThemeToggle />
        </div>
      </nav>
      
      {/* Content */}
      <div className="flex flex-1 items-center justify-center px-4 pt-16">
        <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>이메일 인증</CardTitle>
          <CardDescription>
            회원가입을 완료하기 위해 이메일 인증을 진행합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
          {status === 'loading' && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
              <p className="text-center text-gray-600">이메일을 인증하는 중입니다...</p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <CheckCircle2 className="h-12 w-12 text-green-600" />
              <p className="text-center text-gray-600">{message}</p>
              <p className="text-center text-sm text-gray-500">
                잠시 후 로그인 페이지로 이동합니다...
              </p>
              <Button asChild className="w-full">
                <Link href="/auth/login">지금 로그인하기</Link>
              </Button>
            </>
          )}
          
          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 text-red-600" />
              <p className="text-center text-gray-600">{message}</p>
              <div className="flex flex-col space-y-2 w-full">
                <Button asChild variant="outline" className="w-full">
                  <Link href="/auth/signup">회원가입 다시하기</Link>
                </Button>
                <Button asChild className="w-full">
                  <Link href="/">홈으로 돌아가기</Link>
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      </div>
      
      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-black text-white py-8 mt-auto">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-gray-300">&copy; 2024 Exhell. All rights reserved.</p>
            <div className="flex space-x-6">
              <Link href="/privacy" className="text-gray-300 hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="/cookies" className="text-gray-300 hover:text-white transition-colors">
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}