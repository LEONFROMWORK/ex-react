import { AdminStatsService } from '@/lib/services/admin-stats.service'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Users, 
  FileText, 
  DollarSign, 
  Activity, 
  TrendingUp, 
  AlertCircle,
  Zap,
  Crown,
  Building2,
  CreditCard,
  Settings
} from "lucide-react"
import Link from "next/link"
import { USER_TIERS, TIER_LIMITS } from '@/lib/constants/user-tiers'

const tierIcons = {
  [USER_TIERS.FREE]: null,
  [USER_TIERS.BASIC]: Zap,
  [USER_TIERS.PRO]: Crown,
  [USER_TIERS.ENTERPRISE]: Building2
}

export default async function AdminDashboardPage() {
  const statsService = AdminStatsService.getInstance()
  const stats = await statsService.getDashboardStats()
  
  return (
    <div className="space-y-8">
      {/* 주요 지표 */}
      <div>
        <h2 className="text-xl font-semibold mb-4">주요 지표</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">전체 사용자</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.users.total.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                활성: {stats.users.active.toLocaleString()} | 신규: {stats.users.new}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">월 매출</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₩{stats.revenue.monthly.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                주간: ₩{stats.revenue.weekly.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">파일 처리</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.usage.filesProcessed.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                평균 크기: {(stats.usage.averageFileSize / 1024 / 1024).toFixed(1)} MB
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">성공률</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.performance.successRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                평균 처리: {stats.performance.averageProcessingTime.toFixed(1)}초
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* 등급별 사용자 분포 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>등급별 사용자 분포</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(stats.users.byTier).map(([tier, count]) => {
                const Icon = tierIcons[tier as keyof typeof tierIcons]
                const tierInfo = TIER_LIMITS[tier as keyof typeof TIER_LIMITS]
                const percentage = stats.users.total > 0 ? (count / stats.users.total) * 100 : 0
                
                return (
                  <div key={tier} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {Icon && <Icon className="h-5 w-5 text-primary" />}
                      <div>
                        <p className="font-medium">{tierInfo?.name || tier}</p>
                        <p className="text-sm text-muted-foreground">{count.toLocaleString()} 사용자</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">{percentage.toFixed(1)}%</Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
        
        {/* 등급별 매출 */}
        <Card>
          <CardHeader>
            <CardTitle>등급별 매출</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(stats.revenue.byTier)
                .filter(([_, revenue]) => revenue > 0)
                .sort(([, a], [, b]) => b - a)
                .map(([tier, revenue]) => {
                  const Icon = tierIcons[tier as keyof typeof tierIcons]
                  const tierInfo = TIER_LIMITS[tier as keyof typeof TIER_LIMITS]
                  const percentage = stats.revenue.total > 0 ? (revenue / stats.revenue.total) * 100 : 0
                  
                  return (
                    <div key={tier} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {Icon && <Icon className="h-5 w-5 text-primary" />}
                        <div>
                          <p className="font-medium">{tierInfo?.name || tier}</p>
                          <p className="text-sm text-muted-foreground">₩{revenue.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">{percentage.toFixed(1)}%</Badge>
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* 사용량 통계 */}
      <Card>
        <CardHeader>
          <CardTitle>최근 30일 사용량</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">토큰 사용량</p>
              <p className="text-2xl font-bold">{stats.usage.tokensUsed.toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">오류 수정</p>
              <p className="text-2xl font-bold">{stats.usage.errorsFixed.toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">오류율</p>
              <p className="text-2xl font-bold">{stats.performance.errorRate.toFixed(1)}%</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">총 매출</p>
              <p className="text-2xl font-bold">₩{stats.revenue.total.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* 빠른 작업 */}
      <div>
        <h2 className="text-xl font-semibold mb-4">빠른 작업</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/admin/users">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="text-base">사용자 관리</span>
                  <Users className="h-5 w-5 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">사용자 정보 조회 및 관리</p>
              </CardContent>
            </Card>
          </Link>
          
          <Link href="/admin/payments">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="text-base">결제 관리</span>
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">결제 내역 및 환불 처리</p>
              </CardContent>
            </Card>
          </Link>
          
          <Link href="/admin/announcements">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="text-base">공지사항</span>
                  <AlertCircle className="h-5 w-5 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">공지사항 작성 및 관리</p>
              </CardContent>
            </Card>
          </Link>
          
          <Link href="/admin/settings">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="text-base">시스템 설정</span>
                  <Settings className="h-5 w-5 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">시스템 설정 및 구성</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}