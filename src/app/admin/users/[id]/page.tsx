import { notFound } from 'next/navigation'
import { AdminStatsService } from '@/lib/services/admin-stats.service'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  ArrowLeft,
  User, 
  Mail, 
  Calendar,
  Clock,
  Coins,
  FileText,
  CreditCard,
  Activity,
  Shield,
  Crown,
  Zap,
  Building2
} from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { USER_TIERS, TIER_LIMITS } from '@/lib/constants/user-tiers'
import { USER_ROLES } from '@/lib/constants/user-roles'

const tierIcons = {
  [USER_TIERS.FREE]: null,
  [USER_TIERS.BASIC]: Zap,
  [USER_TIERS.PRO]: Crown,
  [USER_TIERS.ENTERPRISE]: Building2
}

export default async function UserDetailPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const adminService = AdminStatsService.getInstance()
  
  try {
    const user = await adminService.getUserDetails(params.id)
    
    const TierIcon = tierIcons[user.tier as keyof typeof tierIcons]
    const tierInfo = TIER_LIMITS[user.tier as keyof typeof TIER_LIMITS]
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/admin/users">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">사용자 상세 정보</h1>
          </div>
        </div>

        {/* 기본 정보 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <User className="h-4 w-4" /> 이름
                  </p>
                  <p className="font-medium">{user.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="h-4 w-4" /> 이메일
                  </p>
                  <p className="font-medium">{user.email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Shield className="h-4 w-4" /> 역할
                  </p>
                  <Badge variant={
                    user.role === USER_ROLES.SUPER_ADMIN ? "destructive" :
                    user.role === USER_ROLES.ADMIN ? "secondary" :
                    user.role === USER_ROLES.SUPPORT ? "outline" : "default"
                  }>
                    {user.role === USER_ROLES.SUPER_ADMIN ? "최고 관리자" :
                     user.role === USER_ROLES.ADMIN ? "관리자" :
                     user.role === USER_ROLES.SUPPORT ? "고객 지원" : "사용자"}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Crown className="h-4 w-4" /> 등급
                  </p>
                  <Badge variant={
                    user.tier === USER_TIERS.ENTERPRISE ? "destructive" :
                    user.tier === USER_TIERS.PRO ? "secondary" :
                    user.tier === USER_TIERS.BASIC ? "default" : "outline"
                  } className="flex items-center gap-1 w-fit">
                    {TierIcon && <TierIcon className="w-3 h-3" />}
                    {tierInfo?.name || user.tier}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-4 w-4" /> 가입일
                  </p>
                  <p className="font-medium">
                    {format(new Date(user.createdAt), "yyyy년 MM월 dd일", { locale: ko })}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-4 w-4" /> 마지막 활동
                  </p>
                  <p className="font-medium">
                    {user.lastActiveAt ? 
                      format(new Date(user.lastActiveAt), "yyyy년 MM월 dd일", { locale: ko }) : 
                      "활동 없음"}
                  </p>
                </div>
              </div>
              <div className="pt-4 border-t">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">이메일 인증</p>
                  <Badge variant={user.emailVerified ? "outline" : "secondary"}>
                    {user.emailVerified ? "인증됨" : "미인증"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 통계 */}
          <Card>
            <CardHeader>
              <CardTitle>활동 통계</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Coins className="h-4 w-4" /> 토큰 잔액
                </p>
                <p className="text-2xl font-bold">{user.tokens.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Activity className="h-4 w-4" /> 총 사용 토큰
                </p>
                <p className="text-xl font-semibold">{user.stats.totalTokensUsed.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <FileText className="h-4 w-4" /> 처리한 파일
                </p>
                <p className="text-xl font-semibold">{user.stats.totalFiles}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <CreditCard className="h-4 w-4" /> 총 결제액
                </p>
                <p className="text-xl font-semibold">₩{user.stats.totalSpent.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 최근 토큰 거래 */}
        <Card>
          <CardHeader>
            <CardTitle>최근 토큰 거래</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {user.tokenTransactions.length > 0 ? (
                user.tokenTransactions.map((tx) => (
                  <div key={tx.id} className="flex justify-between items-center py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{tx.reason}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(tx.createdAt), "yyyy년 MM월 dd일 HH:mm", { locale: ko })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${tx.type === 'EARNED' ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.type === 'EARNED' ? '+' : '-'}{tx.amount}
                      </p>
                      <p className="text-sm text-muted-foreground">잔액: {tx.balance}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">토큰 거래 내역이 없습니다</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 최근 파일 */}
        <Card>
          <CardHeader>
            <CardTitle>최근 업로드 파일</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {user.files.length > 0 ? (
                user.files.map((file) => (
                  <div key={file.id} className="flex justify-between items-center py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{file.originalName}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.fileSize / 1024 / 1024).toFixed(1)} MB • {format(new Date(file.createdAt), "yyyy년 MM월 dd일", { locale: ko })}
                      </p>
                    </div>
                    <Badge variant={file.status === 'COMPLETED' ? "outline" : "secondary"}>
                      {file.status}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">업로드한 파일이 없습니다</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 최근 결제 */}
        <Card>
          <CardHeader>
            <CardTitle>최근 결제 내역</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {user.payments.length > 0 ? (
                user.payments.map((payment) => (
                  <div key={payment.id} className="flex justify-between items-center py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{payment.tier} 플랜</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(payment.createdAt), "yyyy년 MM월 dd일", { locale: ko })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">₩{payment.amount.toLocaleString()}</p>
                      <Badge variant={payment.status === 'COMPLETED' ? "outline" : "secondary"}>
                        {payment.status}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">결제 내역이 없습니다</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  } catch (error) {
    notFound()
  }
}