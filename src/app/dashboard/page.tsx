"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileSpreadsheet, Upload, History, CreditCard, LogOut, Zap, Files } from "lucide-react"
import Link from "next/link"
import { FileList } from "@/components/dashboard/FileList"
import { FeedbackWidget } from "@/components/feedback/FeedbackWidget"

interface TestUser {
  id: string
  email: string
  name: string
  role: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<TestUser | null>(null)
  const [files, setFiles] = useState<any[]>([])

  useEffect(() => {
    // 로컬 스토리지에서 사용자 정보 확인
    const testUser = localStorage.getItem('testUser')
    if (!testUser) {
      router.push("/auth/simple-login")
      return
    }
    
    setUser(JSON.parse(testUser))
    
    // Mock 파일 데이터
    setFiles([
      {
        id: '1',
        originalName: 'sales_report_2024.xlsx',
        size: 2457600,
        status: 'COMPLETED',
        createdAt: new Date('2024-01-15T10:30:00'),
        completedAt: new Date('2024-01-15T10:32:45'),
        errorCount: 45,
        fixedCount: 42,
        creditsUsed: 150
      },
      {
        id: '2',
        originalName: 'inventory_data.xlsx',
        size: 1843200,
        status: 'PROCESSING',
        createdAt: new Date('2024-01-15T14:20:00'),
        errorCount: undefined,
        fixedCount: undefined,
        creditsUsed: undefined
      },
      {
        id: '3',
        originalName: 'budget_2024_Q1.xlsx',
        size: 892416,
        status: 'FAILED',
        createdAt: new Date('2024-01-14T09:15:00'),
        completedAt: new Date('2024-01-14T09:16:30'),
        errorCount: 12,
        fixedCount: 0,
        creditsUsed: 45
      }
    ])
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('testUser')
    router.push("/")
  }

  if (!user) {
    return <div>Loading...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold dark:text-white">대시보드</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            안녕하세요, {user.name}님! 
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            {user.email} ({user.role})
          </p>
        </div>
        <Button onClick={handleLogout} variant="outline">
          <LogOut className="mr-2 h-4 w-4" />
          로그아웃
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-purple-950/30">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-indigo-500/5 to-purple-500/5" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
              남은 크레딧
            </CardTitle>
            <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/50">
              <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">100</div>
            <p className="text-xs text-blue-600/70 dark:text-blue-300/70">
              무료 크레딧
            </p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-950/30 dark:via-emerald-950/30 dark:to-teal-950/30">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-emerald-500/5 to-teal-500/5" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">
              처리한 파일
            </CardTitle>
            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/50">
              <FileSpreadsheet className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-green-900 dark:text-green-100">0</div>
            <p className="text-xs text-green-600/70 dark:text-green-300/70">
              이번 달
            </p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-orange-950/30 dark:via-amber-950/30 dark:to-yellow-950/30">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-amber-500/5 to-yellow-500/5" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">
              수정된 오류
            </CardTitle>
            <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900/50">
              <History className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">0</div>
            <p className="text-xs text-orange-600/70 dark:text-orange-300/70">
              총 누적
            </p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-purple-50 via-violet-50 to-fuchsia-50 dark:from-purple-950/30 dark:via-violet-950/30 dark:to-fuchsia-950/30">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-violet-500/5 to-fuchsia-500/5" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">
              절약한 시간
            </CardTitle>
            <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/50">
              <History className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">0분</div>
            <p className="text-xs text-purple-600/70 dark:text-purple-300/70">
              예상 시간
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 dark:from-cyan-950/30 dark:via-blue-950/30 dark:to-indigo-950/30">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-blue-500/5 to-indigo-500/5" />
          <CardHeader className="relative">
            <CardTitle className="text-cyan-700 dark:text-cyan-300">새 파일 업로드</CardTitle>
            <CardDescription className="text-cyan-600/70 dark:text-cyan-300/70">
              엑셀 파일을 업로드하여 오류를 검사하고 수정하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <Link href="/dashboard/upload">
              <Button className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white border-0" size="lg">
                <Upload className="mr-2 h-4 w-4" />
                파일 업로드
              </Button>
            </Link>
          </CardContent>
        </Card>
        
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-rose-50 via-pink-50 to-fuchsia-50 dark:from-rose-950/30 dark:via-pink-950/30 dark:to-fuchsia-950/30">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-pink-500/5 to-fuchsia-500/5" />
          <CardHeader className="relative">
            <CardTitle className="text-rose-700 dark:text-rose-300">Excel 파일 생성</CardTitle>
            <CardDescription className="text-rose-600/70 dark:text-rose-300/70">
              템플릿이나 AI를 사용하여 새 Excel 파일을 생성하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <Link href="/dashboard/create">
              <Button className="w-full border-2 border-rose-200 dark:border-rose-800 bg-transparent hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-700 dark:text-rose-300" size="lg" variant="outline">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                파일 생성
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-emerald-950/30 dark:via-green-950/30 dark:to-teal-950/30">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-green-500/5 to-teal-500/5" />
          <CardHeader className="relative">
            <CardTitle className="text-emerald-700 dark:text-emerald-300">Excel + 이미지 분석</CardTitle>
            <CardDescription className="text-emerald-600/70 dark:text-emerald-300/70">
              Excel 파일과 스크린샷을 함께 분석하여 오류를 찾고 개선합니다
            </CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <Link href="/dashboard/multimodal">
              <Button className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white border-0" size="lg">
                <Zap className="mr-2 h-4 w-4" />
                멀티 파일 분석
              </Button>
            </Link>
          </CardContent>
        </Card>

        <div className="lg:col-span-1">
          <FileList files={files} onRefresh={() => {
            // 실제로는 API에서 파일 목록을 다시 가져와야 함
            console.log('Refresh files')
          }} />
        </div>
      </div>

      {user.role === "관리자" && (
        <Card className="mt-6 relative overflow-hidden border-0 bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 dark:from-slate-950/30 dark:via-gray-950/30 dark:to-zinc-950/30">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-500/5 via-gray-500/5 to-zinc-500/5" />
          <CardHeader className="relative">
            <CardTitle className="text-slate-700 dark:text-slate-300">관리자 메뉴</CardTitle>
            <CardDescription className="text-slate-600/70 dark:text-slate-300/70">
              관리자 전용 기능에 접근할 수 있습니다
            </CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <Link href="/admin">
              <Button variant="outline" className="w-full border-2 border-slate-200 dark:border-slate-800 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-950/50 text-slate-700 dark:text-slate-300">
                관리자 대시보드로 이동
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
      
      {/* 피드백 위젯 */}
      <FeedbackWidget />
    </div>
  )
}