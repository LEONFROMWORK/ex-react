"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, FileSpreadsheet } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

function ErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  let errorMessage = "로그인 중 오류가 발생했습니다."
  
  if (error === "AccessDenied") {
    errorMessage = "접근이 거부되었습니다. 관리자만 로그인할 수 있습니다."
  } else if (error === "Configuration") {
    errorMessage = "설정 오류가 발생했습니다."
  } else if (error === "Verification") {
    errorMessage = "인증 오류가 발생했습니다."
  }

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
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
            </div>
            <CardTitle className="text-2xl font-bold">로그인 오류</CardTitle>
            <CardDescription className="text-red-600">
              {errorMessage}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              이 시스템은 관리자 전용입니다. 
              <br />
              허가된 관리자 계정으로만 접속할 수 있습니다.
            </p>
            <Button
              variant="outline"
              className="w-full"
              asChild
            >
              <Link href="/auth/login">
                다시 로그인
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      
      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-black text-white py-8 mt-auto">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-gray-300">&copy; 2024 엑셀앱 (Exhell). 모든 권리 보유.</p>
            <div className="flex space-x-6">
              <Link href="/privacy" className="text-gray-300 hover:text-white transition-colors">
                개인정보처리방침
              </Link>
              <Link href="/terms" className="text-gray-300 hover:text-white transition-colors">
                이용약관
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default function ErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    }>
      <ErrorContent />
    </Suspense>
  )
}