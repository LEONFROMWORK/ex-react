import { getServerSession } from "@/lib/auth-helper"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileSpreadsheet, Upload, History, CreditCard } from "lucide-react"
import Link from "next/link"

export default async function DashboardPage() {
  const session = await getServerSession()

  if (!session) {
    redirect("/auth/login")
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">대시보드</h1>
        <p className="text-gray-600 mt-2">
          안녕하세요, {session.user.name}님! 
        </p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            <CardTitle>최근 처리 내역</CardTitle>
            <CardDescription>
              최근에 처리한 파일 목록입니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 text-center py-8">
              아직 처리한 파일이 없습니다
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}