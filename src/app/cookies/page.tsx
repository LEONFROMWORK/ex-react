import Link from "next/link"
import { FileSpreadsheet } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

export default function CookiePolicyPage() {
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
      <main className="flex-1 container mx-auto px-4 py-20 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8 dark:text-white">쿠키 정책</h1>
        
        <div className="prose prose-gray dark:prose-invert max-w-none">
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            최종 업데이트: 2024년 1월 1일
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 dark:text-white">1. 쿠키란 무엇인가요?</h2>
            <p className="mb-4 dark:text-gray-300">
              쿠키는 웹사이트를 방문할 때 귀하의 브라우저에 저장되는 작은 텍스트 파일입니다. 
              이는 웹사이트가 귀하의 방문을 기억하고 다음 방문 시 더 나은 경험을 제공하는 데 도움이 됩니다.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 dark:text-white">2. 우리가 사용하는 쿠키 종류</h2>
            
            <h3 className="text-xl font-medium mb-2 dark:text-white">필수 쿠키</h3>
            <p className="mb-4 dark:text-gray-300">
              이 쿠키들은 웹사이트가 제대로 작동하기 위해 필수적이며, 우리 시스템에서 비활성화할 수 없습니다.
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-6 dark:text-gray-300">
              <li><strong>세션 쿠키:</strong> 로그인 상태를 유지합니다</li>
              <li><strong>보안 쿠키:</strong> 보안 위협을 방지합니다</li>
              <li><strong>테마 설정:</strong> 다크모드/라이트모드 선택을 저장합니다</li>
            </ul>

            <h3 className="text-xl font-medium mb-2 dark:text-white">분석 쿠키</h3>
            <p className="mb-4 dark:text-gray-300">
              이 쿠키들은 방문자가 웹사이트를 어떻게 사용하는지 이해하는 데 도움이 됩니다.
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-6 dark:text-gray-300">
              <li><strong>Google Analytics:</strong> 사이트 사용 통계를 수집합니다</li>
              <li><strong>성능 모니터링:</strong> 페이지 로드 시간과 오류를 추적합니다</li>
            </ul>

            <h3 className="text-xl font-medium mb-2 dark:text-white">기능 쿠키</h3>
            <p className="mb-4 dark:text-gray-300">
              이 쿠키들은 향상된 기능과 개인화를 제공합니다.
            </p>
            <ul className="list-disc pl-6 space-y-2 dark:text-gray-300">
              <li><strong>언어 설정:</strong> 선호하는 언어를 기억합니다</li>
              <li><strong>사용자 설정:</strong> 알림 설정 등 개인 설정을 저장합니다</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 dark:text-white">3. 쿠키 관리 방법</h2>
            <p className="mb-4 dark:text-gray-300">
              대부분의 웹 브라우저는 자동으로 쿠키를 수락하도록 설정되어 있지만, 
              원하신다면 브라우저 설정을 변경하여 쿠키를 거부할 수 있습니다.
            </p>
            
            <h3 className="text-xl font-medium mb-2 dark:text-white">브라우저별 쿠키 관리</h3>
            <ul className="list-disc pl-6 space-y-2 dark:text-gray-300">
              <li><strong>Chrome:</strong> 설정 → 개인정보 및 보안 → 쿠키 및 기타 사이트 데이터</li>
              <li><strong>Firefox:</strong> 설정 → 개인정보 및 보안 → 쿠키와 사이트 데이터</li>
              <li><strong>Safari:</strong> 환경설정 → 개인정보 보호 → 쿠키 및 웹사이트 데이터 관리</li>
              <li><strong>Edge:</strong> 설정 → 쿠키 및 사이트 권한</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 dark:text-white">4. 쿠키 차단의 영향</h2>
            <p className="dark:text-gray-300">
              쿠키를 비활성화하면 웹사이트의 일부 기능이 제대로 작동하지 않을 수 있습니다:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4 dark:text-gray-300">
              <li>로그인 상태가 유지되지 않을 수 있습니다</li>
              <li>개인 설정이 저장되지 않을 수 있습니다</li>
              <li>일부 기능이 제한될 수 있습니다</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 dark:text-white">5. 제3자 쿠키</h2>
            <p className="mb-4 dark:text-gray-300">
              우리는 다음과 같은 신뢰할 수 있는 제3자 서비스의 쿠키를 사용할 수 있습니다:
            </p>
            <ul className="list-disc pl-6 space-y-2 dark:text-gray-300">
              <li><strong>결제 처리:</strong> 토스페이먼츠</li>
              <li><strong>분석:</strong> Google Analytics</li>
              <li><strong>보안:</strong> Cloudflare</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 dark:text-white">6. 쿠키 정책 업데이트</h2>
            <p className="dark:text-gray-300">
              우리는 때때로 이 쿠키 정책을 업데이트할 수 있습니다. 
              변경사항은 이 페이지에 게시되며, 중요한 변경사항의 경우 이메일로 알려드립니다.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 dark:text-white">7. 문의하기</h2>
            <p className="mb-4 dark:text-gray-300">
              쿠키 사용에 대해 궁금한 점이 있으시면 언제든지 문의해 주세요:
            </p>
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <p className="dark:text-gray-300">이메일: privacy@exhell.com</p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-black text-white py-8">
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