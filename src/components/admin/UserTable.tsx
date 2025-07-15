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

interface UserTableProps {
  users: UserListItem[]
  onUserUpdate: () => void
}

export function UserTable({ users, onUserUpdate }: UserTableProps) {
  const router = useRouter()
  const [processingUserId, setProcessingUserId] = useState<string | null>(null)

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

  const getRoleBadge = (role: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      USER: "default",
      ADMIN: "secondary",
      SUPER_ADMIN: "destructive",
    }

    const labels: Record<string, string> = {
      USER: "사용자",
      ADMIN: "관리자",
      SUPER_ADMIN: "최고 관리자",
    }

    return (
      <Badge variant={variants[role] || "default"}>
        {labels[role] || role}
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
      ENTERPRISE: "destructive",
    }

    return (
      <Badge variant={variants[plan] || "outline"}>
        {plan}
      </Badge>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>사용자</TableHead>
            <TableHead>역할</TableHead>
            <TableHead>상태</TableHead>
            <TableHead>토큰</TableHead>
            <TableHead>구독</TableHead>
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
              <TableCell>{getStatusBadge(user.emailVerified)}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Coins className="h-4 w-4 text-gray-400" />
                  <span>{user.tokens}</span>
                </div>
              </TableCell>
              <TableCell>
                {user.subscription && (
                  <div className="space-y-1">
                    {getSubscriptionBadge(user.subscription.plan)}
                    <p className="text-xs text-gray-500">
                      {user.subscription.tokensRemaining} 토큰 남음
                    </p>
                  </div>
                )}
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
                    {user.role === "USER" && (
                      <DropdownMenuItem
                        onClick={() => handleStatusUpdate(user.id, "changeRole")}
                      >
                        <Shield className="mr-2 h-4 w-4" />
                        관리자 권한 부여
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}