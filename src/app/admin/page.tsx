import { AdminStatsService } from '@/lib/services/admin-stats.service'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, LineChart, Line } from "recharts"
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

import { isBuildTime } from '@/lib/utils/server-only'

export default async function AdminDashboardPage() {
  // Mock data for build time
  if (isBuildTime) {
    return <AdminDashboardClient stats={mockStats} />
  }
  
  const statsService = AdminStatsService.getInstance()
  const stats = await statsService.getDashboardStats()
  
  return <AdminDashboardClient stats={stats} />
}

interface AdminStats {
  users: {
    total: number
    active: number
    new: number
    byTier: Record<string, number>
  }
  revenue: {
    total: number
    monthly: number
    weekly: number
    byTier: Record<string, number>
  }
  usage: {
    filesProcessed: number
    averageFileSize: number
    tokensUsed: number
    errorsFixed: number
  }
  performance: {
    successRate: number
    averageProcessingTime: number
    errorRate: number
  }
}

const mockStats: AdminStats = {
  users: { 
    total: 0, 
    active: 0, 
    new: 0, 
    byTier: {} 
  },
  revenue: { 
    total: 0, 
    monthly: 0, 
    weekly: 0, 
    byTier: {} 
  },
  usage: {
    filesProcessed: 0,
    averageFileSize: 0,
    tokensUsed: 0,
    errorsFixed: 0
  },
  performance: {
    successRate: 0,
    averageProcessingTime: 0,
    errorRate: 0
  }
}

function AdminDashboardClient({ stats }: { stats: AdminStats }) {
  
  return (
    <div className="space-y-8">
      {/* 주요 지표 */}
      <div>
        <h2 className="text-xl font-semibold mb-4">주요 지표</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-950/30 dark:via-teal-950/30 dark:to-cyan-950/30">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-cyan-500/5" />
            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-300">전체 사용자</CardTitle>
              <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{stats.users.total.toLocaleString()}</div>
              <p className="text-xs text-emerald-600/70 dark:text-emerald-300/70">
                활성: {stats.users.active.toLocaleString()} | 신규: {stats.users.new}
              </p>
            </CardContent>
          </Card>
          
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-950/30 dark:via-yellow-950/30 dark:to-orange-950/30">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-yellow-500/5 to-orange-500/5" />
            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-300">월 매출</CardTitle>
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/50">
                <DollarSign className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">₩{stats.revenue.monthly.toLocaleString()}</div>
              <p className="text-xs text-amber-600/70 dark:text-amber-300/70">
                주간: ₩{stats.revenue.weekly.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 dark:from-sky-950/30 dark:via-blue-950/30 dark:to-indigo-950/30">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 via-blue-500/5 to-indigo-500/5" />
            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-sky-700 dark:text-sky-300">파일 처리</CardTitle>
              <div className="p-2 rounded-full bg-sky-100 dark:bg-sky-900/50">
                <FileText className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-2xl font-bold text-sky-900 dark:text-sky-100">{stats.usage.filesProcessed.toLocaleString()}</div>
              <p className="text-xs text-sky-600/70 dark:text-sky-300/70">
                평균 크기: {(stats.usage.averageFileSize / 1024 / 1024).toFixed(1)} MB
              </p>
            </CardContent>
          </Card>
          
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 dark:from-violet-950/30 dark:via-purple-950/30 dark:to-fuchsia-950/30">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-purple-500/5 to-fuchsia-500/5" />
            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-violet-700 dark:text-violet-300">성공률</CardTitle>
              <div className="p-2 rounded-full bg-violet-100 dark:bg-violet-900/50">
                <Activity className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-2xl font-bold text-violet-900 dark:text-violet-100">{stats.performance.successRate.toFixed(1)}%</div>
              <p className="text-xs text-violet-600/70 dark:text-violet-300/70">
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
                const percentage = stats.users.total > 0 ? ((count as number) / stats.users.total) * 100 : 0
                
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
                .filter(([_, revenue]) => (revenue as number) > 0)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([tier, revenue]) => {
                  const Icon = tierIcons[tier as keyof typeof tierIcons]
                  const tierInfo = TIER_LIMITS[tier as keyof typeof TIER_LIMITS]
                  const percentage = stats.revenue.total > 0 ? ((revenue as number) / stats.revenue.total) * 100 : 0
                  
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
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-purple-950/30 hover:shadow-lg transition-all duration-300 cursor-pointer group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-indigo-500/5 to-purple-500/5 group-hover:from-blue-500/10 group-hover:via-indigo-500/10 group-hover:to-purple-500/10 transition-all" />
              <CardHeader className="relative">
                <CardTitle className="flex items-center justify-between">
                  <span className="text-base text-blue-700 dark:text-blue-300">사용자 관리</span>
                  <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/50">
                    <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <p className="text-sm text-blue-600/70 dark:text-blue-300/70">사용자 정보 조회 및 관리</p>
              </CardContent>
            </Card>
          </Link>
          
          <Link href="/admin/payments">
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-950/30 dark:via-emerald-950/30 dark:to-teal-950/30 hover:shadow-lg transition-all duration-300 cursor-pointer group">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-emerald-500/5 to-teal-500/5 group-hover:from-green-500/10 group-hover:via-emerald-500/10 group-hover:to-teal-500/10 transition-all" />
              <CardHeader className="relative">
                <CardTitle className="flex items-center justify-between">
                  <span className="text-base text-green-700 dark:text-green-300">결제 관리</span>
                  <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/50">
                    <CreditCard className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <p className="text-sm text-green-600/70 dark:text-green-300/70">결제 내역 및 환불 처리</p>
              </CardContent>
            </Card>
          </Link>
          
          <Link href="/admin/announcements">
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 dark:from-orange-950/30 dark:via-red-950/30 dark:to-pink-950/30 hover:shadow-lg transition-all duration-300 cursor-pointer group">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-red-500/5 to-pink-500/5 group-hover:from-orange-500/10 group-hover:via-red-500/10 group-hover:to-pink-500/10 transition-all" />
              <CardHeader className="relative">
                <CardTitle className="flex items-center justify-between">
                  <span className="text-base text-orange-700 dark:text-orange-300">공지사항</span>
                  <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900/50">
                    <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <p className="text-sm text-orange-600/70 dark:text-orange-300/70">공지사항 작성 및 관리</p>
              </CardContent>
            </Card>
          </Link>
          
          <Link href="/admin/settings">
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 dark:from-slate-950/30 dark:via-gray-950/30 dark:to-zinc-950/30 hover:shadow-lg transition-all duration-300 cursor-pointer group">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-500/5 via-gray-500/5 to-zinc-500/5 group-hover:from-slate-500/10 group-hover:via-gray-500/10 group-hover:to-zinc-500/10 transition-all" />
              <CardHeader className="relative">
                <CardTitle className="flex items-center justify-between">
                  <span className="text-base text-slate-700 dark:text-slate-300">시스템 설정</span>
                  <div className="p-2 rounded-full bg-slate-100 dark:bg-slate-900/50">
                    <Settings className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <p className="text-sm text-slate-600/70 dark:text-slate-300/70">시스템 설정 및 구성</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}