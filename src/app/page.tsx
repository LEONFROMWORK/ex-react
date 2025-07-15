import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, FileSpreadsheet, Sparkles, TrendingUp } from "lucide-react"

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center bg-gradient-to-b from-white to-gray-50 px-4 py-20">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center space-y-8">
            <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              AI로 엑셀 오류를 
              <span className="text-blue-600"> 자동으로 수정</span>하세요
            </h1>
            <p className="mx-auto max-w-2xl text-xl text-gray-600">
              복잡한 엑셀 파일의 오류를 90% 자동 감지하고 수정합니다.
              AI가 데이터를 분석하여 최적화된 엑셀 문서를 생성해드립니다.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/signup">
                <Button size="lg" className="text-lg px-8">
                  무료로 시작하기
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button size="lg" variant="outline" className="text-lg px-8">
                  로그인
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto max-w-7xl px-4">
          <h2 className="text-3xl font-bold text-center mb-12">주요 기능</h2>
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
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto max-w-4xl text-center px-4">
          <h2 className="text-3xl font-bold mb-4">
            지금 바로 시작하세요
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            무료로 100개의 토큰을 제공합니다. 신용카드 없이 바로 시작할 수 있습니다.
          </p>
          <Link href="/auth/signup">
            <Button size="lg" className="text-lg px-8">
              무료 회원가입
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto max-w-7xl px-4 text-center">
          <p>&copy; 2024 Exhell. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}