"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FileSpreadsheet, Home, Upload, History, Settings, LogOut, User, Gift, CreditCard, MessageSquare, Coins, HelpCircle, Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"
import { Badge } from "@/components/ui/badge"
import { useEffect, useState } from "react"

interface TestUser {
  id: string
  email: string
  name: string
  role: string
  tokens?: number
}

export function TestDashboardNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<TestUser | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  useEffect(() => {
    const testUser = localStorage.getItem('testUser')
    if (testUser) {
      setUser(JSON.parse(testUser))
    }
  }, [])
  
  const handleLogout = () => {
    localStorage.removeItem('testUser')
    localStorage.removeItem('tokenHistory')
    router.push('/auth/simple-login')
  }

  const navItems = [
    {
      title: "대시보드",
      href: "/dashboard",
      icon: Home,
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
      href: "/dashboard/pricing",
      icon: CreditCard,
    },
    {
      title: "추천하기",
      href: "/referral",
      icon: Gift,
    },
  ]

  if (!user) return null

  return (
    <nav className="fixed top-0 z-50 w-full border-b bg-white dark:bg-gray-800 dark:border-gray-700">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <FileSpreadsheet className="h-6 w-6 dark:text-white" />
              <span className="text-xl font-bold dark:text-white">Exhell</span>
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex space-x-6">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary",
                      pathname === item.href
                        ? "text-primary"
                        : "text-muted-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                )
              })}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Token Balance */}
            <Link href="/dashboard/pricing" className="hidden sm:flex items-center space-x-2">
              <Badge variant="secondary" className="px-3 py-1">
                <Coins className="h-4 w-4 mr-1" />
                <span className="font-semibold">{user.tokens || 100}</span>
                <span className="text-xs ml-1">토큰</span>
              </Badge>
            </Link>
            
            <ThemeToggle />
            
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            {/* Desktop User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="hidden md:flex">
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
                    <Badge variant="outline" className="mt-2 w-fit">
                      {user.role}
                    </Badge>
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
                  className="cursor-pointer text-red-600"
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
        
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t py-4">
            <div className="flex flex-col space-y-3">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-700",
                      pathname === item.href
                        ? "bg-gray-100 dark:bg-gray-700 text-primary"
                        : "text-muted-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                )
              })}
              
              <div className="border-t pt-3 mt-3">
                <div className="px-3 py-2">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <Link
                  href="/dashboard/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <User className="h-4 w-4" />
                  <span>프로필</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 w-full"
                >
                  <LogOut className="h-4 w-4" />
                  <span>로그아웃</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}