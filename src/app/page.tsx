'use client'

import { useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, FileSpreadsheet, Sparkles, TrendingUp, Menu, X, Coins } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
// Heavy components removed from initial load
// import { ExcelAnalyzer } from "@/components/excel-analyzer/ExcelAnalyzer"
// import { FAQSection } from "@/components/home/FAQSection"
import { useUserStore } from "@/lib/stores/userStore"
import Script from 'next/script'

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { data: session, status } = useSession()
  const credits = useUserStore((state) => state.credits)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Exhell',
    description: '3단계 AI 시스템으로 Excel 파일의 오류를 자동 감지하고 수정하는 SaaS 플랫폼',
    url: process.env.NEXT_PUBLIC_BASE_URL || 'https://exhell.vercel.app',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web Browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW',
      description: '무료 체험 100토큰 제공'
    },
    creator: {
      '@type': 'Organization',
      name: 'Exhell Team'
    },
    featureList: [
      '자동 오류 감지',
      '3단계 AI 분석 (Mistral → Llama → GPT-4)',
      'VBA 코드 자동 수정',
      '이미지 기반 분석',
      '성능 최적화'
    ]
  }
  
  return (
    <div className="flex flex-col min-h-screen">
      <Script
        id="json-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
              <Link href="/tools" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors">
                분석 도구
              </Link>
              <Link href="/dashboard/upload" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors">
                파일 업로드
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
                    <span className="font-medium">{credits} 크레딧</span>
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
              <Link href="/tools" className="block py-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                분석 도구
              </Link>
              <Link href="/dashboard/upload" className="block py-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                파일 업로드
              </Link>
              <Link href="/pricing" className="block py-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                요금제
              </Link>
              <hr className="my-2 border-gray-200 dark:border-gray-700" />
              {status === 'authenticated' && session ? (
                <>
                  <div className="flex items-center space-x-2 py-2 text-sm">
                    <Coins className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium">{credits} 크레딧</span>
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
      
      {/* Hero Section - Lightweight */}
      <section className="px-4 py-20 mt-16">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h1 className="text-4xl md:text-6xl font-bold dark:text-white">
            AI 기반 Excel 오류 수정
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            3단계 AI 시스템으로 Excel 파일의 오류를 자동 감지하고 수정합니다.
            Mistral → Llama → GPT-4 순으로 비용 효율적인 분석을 제공합니다.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {status === 'authenticated' ? (
              <>
                <Link href="/dashboard/upload">
                  <Button size="lg" className="text-lg px-8">
                    파일 업로드하기
                  </Button>
                </Link>
                <Link href="/tools">
                  <Button size="lg" variant="outline" className="text-lg px-8">
                    Excel 분석 도구
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/auth/register">
                  <Button size="lg" className="text-lg px-8">
                    무료 시작하기
                  </Button>
                </Link>
                <Link href="/tools">
                  <Button size="lg" variant="outline" className="text-lg px-8">
                    Excel 분석 도구
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Quick Demo CTA */}
      <section className="py-12 bg-blue-50 dark:bg-blue-950/20">
        <div className="container mx-auto max-w-4xl text-center px-4">
          <h2 className="text-2xl font-bold mb-4 dark:text-white">
            바로 체험해보세요
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            파일 업로드 없이도 Excel 분석 도구를 미리 체험할 수 있습니다.
          </p>
          <Link href="/tools">
            <Button size="lg" variant="outline">
              Excel 분석 도구 체험하기
            </Button>
          </Link>
        </div>
      </section>

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
                  3단계 AI 시스템으로 비용 효율적이면서도 정확한 분석을 제공합니다.
                  복잡도에 따라 Mistral, Llama, GPT-4가 단계적으로 처리합니다.
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
            무료로 100개의 크레딧을 제공합니다. 신용카드 없이 바로 시작할 수 있습니다.
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