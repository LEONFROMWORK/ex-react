"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"
import { FileSpreadsheet } from "lucide-react"

export default function SimpleLoginPage() {
  const router = useRouter()
  const [selectedUser, setSelectedUser] = useState<string | null>(null)

  const testAccounts = [
    { 
      id: "user-1",
      email: "test@example.com", 
      name: "Test User", 
      role: "일반 사용자",
      description: "일반 사용자 권한으로 파일 업로드, 오류 수정 등 기본 기능 사용 가능"
    },
    { 
      id: "admin-1",
      email: "admin@example.com", 
      name: "Admin User", 
      role: "관리자",
      description: "관리자 대시보드 접근 및 모든 기능 사용 가능"
    },
  ]

  const handleLogin = (accountId: string) => {
    // 간단한 로컬 스토리지 기반 인증 (테스트용)
    const account = testAccounts.find(a => a.id === accountId)
    if (account) {
      // 사용자 정보와 토큰 정보 저장
      const userData = {
        id: account.id,
        email: account.email,
        name: account.name,
        role: account.role,
        tokens: 100, // 기본 토큰
        joinedAt: new Date().toISOString()
      }
      
      localStorage.setItem('testUser', JSON.stringify(userData))
      
      // 토큰 사용 내역 초기화
      localStorage.setItem('tokenHistory', JSON.stringify([
        {
          id: 1,
          type: 'bonus',
          amount: 100,
          description: '회원가입 보너스',
          date: new Date().toISOString()
        }
      ]))
      
      console.log('Login successful, redirecting to:', account.role === "관리자" ? "/admin" : "/dashboard")
      
      // 대시보드로 이동
      if (account.role === "관리자") {
        window.location.href = "/admin"
      } else {
        window.location.href = "/dashboard"
      }
    }
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
        <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>테스트 로그인</CardTitle>
          <CardDescription>
            NextAuth 없이 작동하는 간단한 테스트 로그인입니다.
            아래 계정을 선택하여 로그인하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {testAccounts.map((account) => (
            <div
              key={account.id}
              className={`border rounded-lg p-6 cursor-pointer transition-all ${
                selectedUser === account.id 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              onClick={() => setSelectedUser(account.id)}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{account.name}</h3>
                  <p className="text-sm text-gray-600">{account.email}</p>
                  <p className="text-sm font-medium text-blue-600 mt-1">
                    {account.role}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    {account.description}
                  </p>
                </div>
                {selectedUser === account.id && (
                  <div className="text-blue-500">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          <div className="pt-4">
            <Button 
              className="w-full" 
              size="lg"
              disabled={!selectedUser}
              onClick={() => selectedUser && handleLogin(selectedUser)}
            >
              {selectedUser ? '선택한 계정으로 로그인' : '계정을 선택하세요'}
            </Button>
          </div>
          
          <div className="pt-4 border-t">
            <p className="text-sm text-gray-500 text-center">
              실제 서비스에서는 구글/카카오 소셜 로그인을 사용할 예정입니다
            </p>
          </div>
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