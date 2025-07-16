'use client'

import { useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, FileSpreadsheet, Sparkles, TrendingUp, Menu, X, Coins } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { ExcelAnalyzer } from "@/components/excel-analyzer/ExcelAnalyzer"
import { FAQSection } from "@/components/home/FAQSection"
import { useUserStore } from "@/lib/stores/userStore"

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { data: session, status } = useSession()
  const tokens = useUserStore((state) => state.tokens)
  
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b dark:border-gray-800 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-8">
            <Link href="/">
              <h1 className="text-xl font-bold dark:text-white cursor-pointer">Exhell</h1>
            </Link>
            <div className="hidden md:flex items-center space-x-6">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors">
                대시보드
              </Link>
              <Link href="/dashboard/upload" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors">
                파일 업로드
              </Link>
              <Link href="/dashboard/chat" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors">
                AI 채팅
              </Link>
              <Link href="/pricing" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors">
                요금제
              </Link>
              <Link href="/help" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors">
                도움말
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-4">
              {status === 'authenticated' && session ? (
                <>
                  <div className="flex items-center space-x-2 text-sm">
                    <Coins className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium">{tokens} 토큰</span>
                  </div>
                  <Link href="/dashboard">
                    <Button variant="ghost" size="sm">{session.user.name || '대시보드'}</Button>
                  </Link>
                  <Link href="/api/auth/signout">
                    <Button variant="outline" size="sm">로그아웃</Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/auth/login">
                    <Button variant="ghost" size="sm">로그인</Button>
                  </Link>
                  <Link href="/auth/register">
                    <Button size="sm">회원가입</Button>
                  </Link>
                </>
              )}
            </div>
            <ThemeToggle />
            <button
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-gray-900 border-t dark:border-gray-800">
            <div className="px-4 py-2 space-y-2">
              <Link href="/dashboard" className="block py-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                대시보드
              </Link>
              <Link href="/dashboard/upload" className="block py-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                파일 업로드
              </Link>
              <Link href="/dashboard/chat" className="block py-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                AI 채팅
              </Link>
              <Link href="/pricing" className="block py-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                요금제
              </Link>
              <hr className="my-2 border-gray-200 dark:border-gray-700" />
              {status === 'authenticated' && session ? (
                <>
                  <div className="flex items-center space-x-2 py-2 text-sm">
                    <Coins className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium">{tokens} 토큰</span>
                  </div>
                  <Link href="/api/auth/signout" className="block py-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                    로그아웃
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/auth/login" className="block py-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                    로그인
                  </Link>
                  <Link href="/auth/register" className="block py-2 text-primary hover:text-primary/80">
                    회원가입
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
      
      {/* Excel Analyzer Tool */}
      <section className="px-4 py-20 mt-16">
        <ExcelAnalyzer />
      </section>
      
      {/* FAQ Section */}
      <FAQSection />

      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="container mx-auto max-w-7xl px-4">
          <h2 className="text-3xl font-bold text-center mb-12 dark:text-white">주요 기능</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <CheckCircle className="w-10 h-10 text-green-500 mb-4" />
                <CardTitle>자동 오류 감지</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  수식 오류, 데이터 형식 오류, 참조 오류 등을 자동으로 감지하여
                  즉시 수정 방안을 제시합니다.
                </CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Sparkles className="w-10 h-10 text-purple-500 mb-4" />
                <CardTitle>AI 최적화</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  2단계 AI 시스템으로 비용 효율적이면서도 정확한 분석을 제공합니다.
                  복잡한 문제는 고급 AI가 해결합니다.
                </CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <TrendingUp className="w-10 h-10 text-blue-500 mb-4" />
                <CardTitle>성능 개선</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  느린 수식을 최적화하고, 데이터 구조를 개선하여
                  엑셀 파일의 성능을 30% 이상 향상시킵니다.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto max-w-4xl text-center px-4">
          <h2 className="text-3xl font-bold mb-4 dark:text-white">
            지금 바로 시작하세요
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            무료로 100개의 토큰을 제공합니다. 신용카드 없이 바로 시작할 수 있습니다.
          </p>
          {status === 'authenticated' ? (
            <Link href="/dashboard">
              <Button size="lg" className="text-lg px-8">
                대시보드로 이동
              </Button>
            </Link>
          ) : (
            <Link href="/auth/register">
              <Button size="lg" className="text-lg px-8">
                무료 회원가입
              </Button>
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-black text-white py-8">
        <div className="container mx-auto max-w-7xl px-4">
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