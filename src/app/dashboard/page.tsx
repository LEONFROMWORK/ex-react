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
        tokensUsed: 150
      },
      {
        id: '2',
        originalName: 'inventory_data.xlsx',
        size: 1843200,
        status: 'PROCESSING',
        createdAt: new Date('2024-01-15T14:20:00'),
        errorCount: undefined,
        fixedCount: undefined,
        tokensUsed: undefined
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
        tokensUsed: 45
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              남은 토큰
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">100</div>
            <p className="text-xs text-muted-foreground">
              무료 토큰
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              처리한 파일
            </CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              이번 달
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              수정된 오류
            </CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              총 누적
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              절약한 시간
            </CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0분</div>
            <p className="text-xs text-muted-foreground">
              예상 시간
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>새 파일 업로드</CardTitle>
            <CardDescription>
              엑셀 파일을 업로드하여 오류를 검사하고 수정하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/upload">
              <Button className="w-full" size="lg">
                <Upload className="mr-2 h-4 w-4" />
                파일 업로드
              </Button>
            </Link>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Excel 파일 생성</CardTitle>
            <CardDescription>
              템플릿이나 AI를 사용하여 새 Excel 파일을 생성하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/create">
              <Button className="w-full" size="lg" variant="outline">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                파일 생성
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
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>관리자 메뉴</CardTitle>
            <CardDescription>
              관리자 전용 기능에 접근할 수 있습니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin">
              <Button variant="outline" className="w-full">
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