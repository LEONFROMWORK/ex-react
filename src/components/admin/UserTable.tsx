"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, User, Ban, Shield, Coins, Eye } from "lucide-react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { UserListItem } from "@/Features/Admin/UserManagement/GetUsers"
import { useRouter } from "next/navigation"
import { USER_TIERS, TIER_LIMITS } from '@/lib/constants/user-tiers'
import { USER_ROLES } from '@/lib/constants/user-roles'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Zap, Crown, Building2 } from "lucide-react"

interface UserTableProps {
  users: UserListItem[]
  onUserUpdate: () => void
}

export function UserTable({ users, onUserUpdate }: UserTableProps) {
  const router = useRouter()
  const [processingUserId, setProcessingUserId] = useState<string | null>(null)
  const [tierDialog, setTierDialog] = useState<{ open: boolean; user: UserListItem | null }>({ open: false, user: null })
  const [roleDialog, setRoleDialog] = useState<{ open: boolean; user: UserListItem | null }>({ open: false, user: null })
  const [tokenDialog, setTokenDialog] = useState<{ open: boolean; user: UserListItem | null }>({ open: false, user: null })
  const [tierData, setTierData] = useState({ tier: '', reason: '' })
  const [roleData, setRoleData] = useState({ role: '', reason: '' })
  const [tokenData, setTokenData] = useState({ amount: '', reason: '' })

  const handleStatusUpdate = async (userId: string, action: string) => {
    try {
      setProcessingUserId(userId)
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      })

      if (!response.ok) {
        throw new Error("Failed to update user status")
      }

      onUserUpdate()
    } catch (error) {
      console.error("Error updating user status:", error)
    } finally {
      setProcessingUserId(null)
    }
  }

  const handleTierUpdate = async () => {
    if (!tierDialog.user || !tierData.tier || !tierData.reason) return
    
    try {
      setProcessingUserId(tierDialog.user.id)
      const response = await fetch(`/api/admin/users/${tierDialog.user.id}/tier`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(tierData),
      })

      if (!response.ok) {
        throw new Error("Failed to update user tier")
      }

      setTierDialog({ open: false, user: null })
      setTierData({ tier: '', reason: '' })
      onUserUpdate()
    } catch (error) {
      console.error("Error updating user tier:", error)
    } finally {
      setProcessingUserId(null)
    }
  }

  const handleRoleUpdate = async () => {
    if (!roleDialog.user || !roleData.role || !roleData.reason) return
    
    try {
      setProcessingUserId(roleDialog.user.id)
      const response = await fetch(`/api/admin/users/${roleDialog.user.id}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(roleData),
      })

      if (!response.ok) {
        throw new Error("Failed to update user role")
      }

      setRoleDialog({ open: false, user: null })
      setRoleData({ role: '', reason: '' })
      onUserUpdate()
    } catch (error) {
      console.error("Error updating user role:", error)
    } finally {
      setProcessingUserId(null)
    }
  }

  const handleTokenAdjustment = async () => {
    if (!tokenDialog.user || !tokenData.amount || !tokenData.reason) return
    
    try {
      setProcessingUserId(tokenDialog.user.id)
      const response = await fetch(`/api/admin/users/${tokenDialog.user.id}/credits`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: parseInt(tokenData.amount),
          reason: tokenData.reason
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to adjust user credits")
      }

      setTokenDialog({ open: false, user: null })
      setTokenData({ amount: '', reason: '' })
      onUserUpdate()
    } catch (error) {
      console.error("Error adjusting user credits:", error)
    } finally {
      setProcessingUserId(null)
    }
  }

  const getRoleBadge = (role: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      USER: "default",
      SUPPORT: "outline",
      ADMIN: "secondary",
      SUPER_ADMIN: "destructive",
    }

    const labels: Record<string, string> = {
      USER: "사용자",
      SUPPORT: "고객 지원",
      ADMIN: "관리자",
      SUPER_ADMIN: "최고 관리자",
    }

    return (
      <Badge variant={variants[role] || "default"}>
        {labels[role] || role}
      </Badge>
    )
  }

  const getTierBadge = (tier: string) => {
    const tierInfo = TIER_LIMITS[tier as keyof typeof TIER_LIMITS]
    const tierIcons = {
      [USER_TIERS.FREE]: null,
      [USER_TIERS.BASIC]: Zap,
      [USER_TIERS.PRO]: Crown,
      [USER_TIERS.ENTERPRISE]: Building2
    }
    const Icon = tierIcons[tier as keyof typeof tierIcons]
    
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      FREE: "outline",
      BASIC: "default",
      PRO: "secondary",
      ENTERPRISE: "destructive",
    }

    return (
      <Badge variant={variants[tier] || "outline"} className="flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3" />}
        {tierInfo?.name || tier}
      </Badge>
    )
  }

  const getStatusBadge = (emailVerified: Date | null) => {
    if (emailVerified) {
      return <Badge variant="outline" className="text-green-600">활성</Badge>
    }
    return <Badge variant="outline" className="text-gray-500">비활성</Badge>
  }

  const getSubscriptionBadge = (plan?: string) => {
    if (!plan) return null

    const variants: Record<string, "default" | "secondary" | "outline"> = {
      FREE: "outline",
      BASIC: "default",
      PREMIUM: "secondary",
      ENTERPRISE: "default",
    }

    return (
      <Badge variant={variants[plan] || "outline"}>
        {plan}
      </Badge>
    )
  }

  return (
    <>
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>사용자</TableHead>
            <TableHead>역할</TableHead>
            <TableHead>등급</TableHead>
            <TableHead>상태</TableHead>
            <TableHead>크레딧</TableHead>
            <TableHead>활동</TableHead>
            <TableHead>가입일</TableHead>
            <TableHead className="text-right">작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
              </TableCell>
              <TableCell>{getRoleBadge(user.role)}</TableCell>
              <TableCell>{getTierBadge(user.tier || USER_TIERS.FREE)}</TableCell>
              <TableCell>{getStatusBadge(user.emailVerified)}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Coins className="h-4 w-4 text-gray-400" />
                  <span>{user.credits}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <p>파일: {user._count.files}</p>
                  <p>분석: {user._count.analyses}</p>
                  <p>리뷰: {user._count.reviews}</p>
                </div>
              </TableCell>
              <TableCell>
                {format(new Date(user.createdAt), "yyyy.MM.dd", { locale: ko })}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      disabled={processingUserId === user.id}
                    >
                      <span className="sr-only">메뉴 열기</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>작업</DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() => router.push(`/admin/users/${user.id}`)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      상세 보기
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {user.emailVerified ? (
                      <DropdownMenuItem
                        onClick={() => handleStatusUpdate(user.id, "deactivate")}
                      >
                        <Ban className="mr-2 h-4 w-4" />
                        비활성화
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={() => handleStatusUpdate(user.id, "activate")}
                      >
                        <User className="mr-2 h-4 w-4" />
                        활성화
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => {
                        setTierData({ tier: user.tier || USER_TIERS.FREE, reason: '' })
                        setTierDialog({ open: true, user })
                      }}
                    >
                      <Crown className="mr-2 h-4 w-4" />
                      등급 변경
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setRoleData({ role: user.role, reason: '' })
                        setRoleDialog({ open: true, user })
                      }}
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      역할 변경
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setTokenData({ amount: '', reason: '' })
                        setTokenDialog({ open: true, user })
                      }}
                    >
                      <Coins className="mr-2 h-4 w-4" />
                      크레딧 조정
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>

    {/* 등급 변경 다이얼로그 */}
    <Dialog open={tierDialog.open} onOpenChange={(open) => setTierDialog({ open, user: tierDialog.user })}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>사용자 등급 변경</DialogTitle>
          <DialogDescription>
            {tierDialog.user?.name} ({tierDialog.user?.email})의 등급을 변경합니다.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="tier">새로운 등급</Label>
            <Select value={tierData.tier} onValueChange={(value) => setTierData({ ...tierData, tier: value })}>
              <SelectTrigger>
                <SelectValue placeholder="등급 선택" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TIER_LIMITS).map(([tier, info]) => (
                  <SelectItem key={tier} value={tier}>
                    {info.name} - 월 {info.monthlyTokens} 토큰
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="reason">변경 사유</Label>
            <Textarea
              id="reason"
              value={tierData.reason}
              onChange={(e) => setTierData({ ...tierData, reason: e.target.value })}
              placeholder="등급 변경 사유를 입력하세요"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setTierDialog({ open: false, user: null })}>
              취소
            </Button>
            <Button onClick={handleTierUpdate} disabled={!tierData.tier || !tierData.reason}>
              변경
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* 역할 변경 다이얼로그 */}
    <Dialog open={roleDialog.open} onOpenChange={(open) => setRoleDialog({ open, user: roleDialog.user })}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>사용자 역할 변경</DialogTitle>
          <DialogDescription>
            {roleDialog.user?.name} ({roleDialog.user?.email})의 역할을 변경합니다.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="role">새로운 역할</Label>
            <Select value={roleData.role} onValueChange={(value) => setRoleData({ ...roleData, role: value })}>
              <SelectTrigger>
                <SelectValue placeholder="역할 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={USER_ROLES.USER}>사용자</SelectItem>
                <SelectItem value={USER_ROLES.SUPPORT}>고객 지원</SelectItem>
                <SelectItem value={USER_ROLES.ADMIN}>관리자</SelectItem>
                <SelectItem value={USER_ROLES.SUPER_ADMIN}>최고 관리자</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="reason">변경 사유</Label>
            <Textarea
              id="reason"
              value={roleData.reason}
              onChange={(e) => setRoleData({ ...roleData, reason: e.target.value })}
              placeholder="역할 변경 사유를 입력하세요"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRoleDialog({ open: false, user: null })}>
              취소
            </Button>
            <Button onClick={handleRoleUpdate} disabled={!roleData.role || !roleData.reason}>
              변경
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* 토큰 조정 다이얼로그 */}
    <Dialog open={tokenDialog.open} onOpenChange={(open) => setTokenDialog({ open, user: tokenDialog.user })}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>크레딧 조정</DialogTitle>
          <DialogDescription>
            {tokenDialog.user?.name} ({tokenDialog.user?.email})의 크레딧을 조정합니다.
            <br />현재 크레딧: {tokenDialog.user?.credits}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="amount">조정 금액 (양수: 추가, 음수: 차감)</Label>
            <Input
              id="amount"
              type="number"
              value={tokenData.amount}
              onChange={(e) => setTokenData({ ...tokenData, amount: e.target.value })}
              placeholder="예: 100 또는 -50"
            />
          </div>
          <div>
            <Label htmlFor="reason">조정 사유</Label>
            <Textarea
              id="reason"
              value={tokenData.reason}
              onChange={(e) => setTokenData({ ...tokenData, reason: e.target.value })}
              placeholder="크레딧 조정 사유를 입력하세요"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setTokenDialog({ open: false, user: null })}>
              취소
            </Button>
            <Button onClick={handleTokenAdjustment} disabled={!tokenData.amount || !tokenData.reason}>
              조정
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}