import Link from "next/link"
import { FileSpreadsheet } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

export default function PrivacyPolicyPage() {
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
        <h1 className="text-4xl font-bold mb-8 dark:text-white">개인정보처리방침</h1>
        
        <div className="prose prose-gray dark:prose-invert max-w-none">
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            시행일: 2024년 1월 1일
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 dark:text-white">1. 개인정보의 수집 및 이용목적</h2>
            <p className="mb-4 dark:text-gray-300">
              Exhell(이하 &quot;회사&quot;)은 다음의 목적을 위해 개인정보를 수집하고 이용합니다:
            </p>
            <ul className="list-disc pl-6 space-y-2 dark:text-gray-300">
              <li>서비스 제공 및 운영</li>
              <li>회원 관리 및 본인 확인</li>
              <li>서비스 개선 및 신규 서비스 개발</li>
              <li>마케팅 및 프로모션 (동의한 경우에 한함)</li>
              <li>법적 의무 준수</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 dark:text-white">2. 수집하는 개인정보 항목</h2>
            <h3 className="text-xl font-medium mb-2 dark:text-white">필수 항목</h3>
            <ul className="list-disc pl-6 space-y-2 mb-4 dark:text-gray-300">
              <li>이메일 주소</li>
              <li>이름</li>
              <li>비밀번호 (암호화하여 저장)</li>
            </ul>
            <h3 className="text-xl font-medium mb-2 dark:text-white">선택 항목</h3>
            <ul className="list-disc pl-6 space-y-2 mb-4 dark:text-gray-300">
              <li>회사명</li>
              <li>전화번호</li>
              <li>직책</li>
            </ul>
            <h3 className="text-xl font-medium mb-2 dark:text-white">자동 수집 항목</h3>
            <ul className="list-disc pl-6 space-y-2 dark:text-gray-300">
              <li>IP 주소</li>
              <li>쿠키</li>
              <li>방문 일시</li>
              <li>서비스 이용 기록</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 dark:text-white">3. 개인정보의 보유 및 이용기간</h2>
            <p className="mb-4 dark:text-gray-300">
              회사는 원칙적으로 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 
              단, 다음의 정보에 대해서는 아래의 이유로 명시한 기간 동안 보존합니다:
            </p>
            <ul className="list-disc pl-6 space-y-2 dark:text-gray-300">
              <li>회원 정보: 회원 탈퇴 시까지</li>
              <li>전자상거래 기록: 5년 (전자상거래법)</li>
              <li>로그인 기록: 3개월 (통신비밀보호법)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 dark:text-white">4. 개인정보의 제3자 제공</h2>
            <p className="dark:text-gray-300">
              회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 
              다만, 다음의 경우에는 예외로 합니다:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4 dark:text-gray-300">
              <li>이용자가 사전에 동의한 경우</li>
              <li>법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 dark:text-white">5. 개인정보의 안전성 확보 조치</h2>
            <p className="mb-4 dark:text-gray-300">회사는 개인정보 보호를 위해 다음과 같은 조치를 취하고 있습니다:</p>
            <ul className="list-disc pl-6 space-y-2 dark:text-gray-300">
              <li>비밀번호의 암호화</li>
              <li>해킹이나 컴퓨터 바이러스 등에 의한 개인정보 유출 및 훼손을 막기 위한 보안프로그램 설치</li>
              <li>개인정보의 암호화</li>
              <li>개인정보에 대한 접근 제한</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 dark:text-white">6. 이용자의 권리와 행사 방법</h2>
            <p className="mb-4 dark:text-gray-300">이용자는 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다:</p>
            <ul className="list-disc pl-6 space-y-2 dark:text-gray-300">
              <li>개인정보 열람요구</li>
              <li>오류 등이 있을 경우 정정 요구</li>
              <li>삭제요구</li>
              <li>처리정지 요구</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 dark:text-white">7. 개인정보 보호책임자</h2>
            <p className="dark:text-gray-300">
              회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 이용자의 불만처리 및 
              피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다:
            </p>
            <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <p className="dark:text-gray-300">개인정보 보호책임자</p>
              <p className="dark:text-gray-300">이메일: privacy@exhell.com</p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 dark:text-white">8. 개인정보처리방침의 변경</h2>
            <p className="dark:text-gray-300">
              이 개인정보처리방침은 2024년 1월 1일부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 
              삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
            </p>
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