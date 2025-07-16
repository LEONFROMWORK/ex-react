"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { useUserStore } from "@/lib/stores/userStore"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FileSpreadsheet, Home, Upload, History, Settings, LogOut, User, Gift, CreditCard, Star, MessageSquare, Coins, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"
import { Badge } from "@/components/ui/badge"
import { UserTierBadge } from "@/components/user/UserTierBadge"

interface DashboardNavProps {
  user: {
    name?: string | null
    email?: string | null
    tokens?: number
  }
}

export function DashboardNav({ user }: DashboardNavProps) {
  const pathname = usePathname()
  const tokens = useUserStore((state) => state.tokens)
  
  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" })
  }

  const navItems = [
    {
      title: "대시보드",
      href: "/dashboard",
      icon: Home,
    },
    {
      title: "통합 분석",
      href: "/dashboard/unified",
      icon: FileSpreadsheet,
    },
    {
      title: "파일 업로드",
      href: "/dashboard/upload",
      icon: Upload,
    },
    {
      title: "AI 어시스턴트",
      href: "/dashboard/chat",
      icon: MessageSquare,
    },
    {
      title: "처리 내역",
      href: "/dashboard/history",
      icon: History,
    },
    {
      title: "요금제",
      href: "/pricing",
      icon: CreditCard,
    },
    {
      title: "추천하기",
      href: "/referral",
      icon: Gift,
    },
  ]

  return (
    <nav className="fixed top-0 z-50 w-full border-b bg-white dark:bg-gray-800 dark:border-gray-700">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <FileSpreadsheet className="h-6 w-6 dark:text-white" />
              <span className="text-xl font-bold dark:text-white">Exhell</span>
            </Link>
            <div className="hidden md:flex space-x-6">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "text-sm font-medium transition-colors hover:text-primary",
                      pathname === item.href
                        ? "text-primary"
                        : "text-muted-foreground"
                    )}
                  >
                    {item.title}
                  </Link>
                )
              })}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* User Tier Badge */}
            <UserTierBadge />
            
            {/* Token Balance */}
            <Link href="/pricing" className="flex items-center space-x-2">
              <Badge variant="secondary" className="px-3 py-1">
                <Coins className="h-4 w-4 mr-1" />
                <span className="font-semibold">{tokens}</span>
                <span className="text-xs ml-1">토큰</span>
              </Badge>
            </Link>
            
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>프로필</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>설정</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/help" className="cursor-pointer">
                    <HelpCircle className="mr-2 h-4 w-4" />
                    <span>도움말</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer"
                  onSelect={(event) => {
                    event.preventDefault()
                    handleLogout()
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>로그아웃</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  )
}