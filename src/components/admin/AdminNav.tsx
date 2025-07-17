"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  LayoutDashboard,
  Users,
  Star,
  Megaphone,
  CreditCard,
  BarChart3,
  Shield,
  LogOut,
  ChevronDown,
  FileWarning,
  Gift,
  Brain,
  Settings,
  HeadphonesIcon,
  Database,
} from "lucide-react"
import { useState, useMemo } from "react"
import { USER_ROLES } from "@/lib/constants/user-roles"
import { signOut } from "next-auth/react"

interface AdminNavProps {
  user: {
    name?: string | null
    email?: string | null
    role: string
  }
}

export function AdminNav({ user }: AdminNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [expandedSections, setExpandedSections] = useState<string[]>(["main"])
  
  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" })
  }

  // 권한에 따른 메뉴 필터링
  const navSections = useMemo(() => {
    const allSections = [
      {
        id: "main",
        title: "메인",
        items: [
          {
            title: "대시보드",
            href: "/admin",
            icon: LayoutDashboard,
            roles: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.SUPPORT]
          },
        ],
      },
      {
        id: "management",
        title: "관리",
        items: [
          {
            title: "사용자 관리",
            href: "/admin/users",
            icon: Users,
            roles: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]
          },
          {
            title: "리뷰 관리",
            href: "/admin/reviews",
            icon: Star,
            roles: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]
          },
          {
            title: "공지사항",
            href: "/admin/announcements",
            icon: Megaphone,
            roles: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]
          },
        ],
      },
      {
        id: "financial",
        title: "재무",
        items: [
          {
            title: "결제 관리",
            href: "/admin/payments",
            icon: CreditCard,
            roles: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]
          },
          {
            title: "추천 관리",
            href: "/admin/referrals",
            icon: Gift,
            roles: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]
          },
        ],
      },
      {
        id: "analytics",
        title: "분석",
        items: [
          {
            title: "AI 통계",
            href: "/admin/ai-stats",
            icon: BarChart3,
            roles: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.SUPPORT]
          },
          {
            title: "오류 패턴 분석",
            href: "/admin/error-patterns",
            icon: FileWarning,
            roles: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]
          },
        ],
      },
      {
        id: "support",
        title: "고객 지원",
        items: [
          {
            title: "지원 티켓",
            href: "/admin/support",
            icon: HeadphonesIcon,
            roles: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.SUPPORT]
          },
        ],
      },
      {
        id: "ai",
        title: "AI 설정",
        items: [
          {
            title: "AI 모델 관리",
            href: "/admin/ai-models",
            icon: Brain,
            roles: [USER_ROLES.SUPER_ADMIN]
          },
          {
            title: "지식 베이스 관리",
            href: "/admin/knowledge-base",
            icon: Database,
            roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]
          },
          {
            title: "AI 정책 설정",
            href: "/admin/ai-policies",
            icon: Settings,
            roles: [USER_ROLES.SUPER_ADMIN]
          },
          {
            title: "AI 라우팅 설정",
            href: "/admin/ai-routing",
            icon: Settings,
            roles: [USER_ROLES.SUPER_ADMIN]
          },
        ],
      },
    ]
    
    // 사용자 권한에 따라 메뉴 필터링
    return allSections.map(section => ({
      ...section,
      items: section.items.filter(item => 
        item.roles.includes(user.role as any)
      )
    })).filter(section => section.items.length > 0)
  }, [user.role])

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  return (
    <nav className="h-full flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b dark:border-gray-700">
        <Link href="/admin" className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold dark:text-white">Exhell Admin</span>
        </Link>
      </div>

      {/* User info */}
      <div className="px-6 py-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
        <div className="text-sm">
          <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
          <p className="text-gray-500 dark:text-gray-400">{user.email}</p>
          <p className="text-xs text-primary dark:text-primary mt-1">
            {user.role === USER_ROLES.SUPER_ADMIN ? "최고 관리자" : 
             user.role === USER_ROLES.ADMIN ? "관리자" :
             user.role === USER_ROLES.SUPPORT ? "고객 지원" : "사용자"}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4">
        {navSections.map(section => (
          <div key={section.id} className="mb-4">
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full px-6 py-2 flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-200"
            >
              {section.title}
              <ChevronDown
                className={cn(
                  "w-4 h-4 transition-transform",
                  expandedSections.includes(section.id) && "rotate-180"
                )}
              />
            </button>
            {expandedSections.includes(section.id) && (
              <div className="mt-1">
                {section.items.map(item => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center space-x-3 px-6 py-3 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary border-r-3 border-primary dark:bg-primary/20"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Theme Toggle & Logout */}
      <div className="p-6 border-t space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">테마</span>
          <ThemeToggle />
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center space-x-3 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 w-full"
        >
          <LogOut className="w-5 h-5" />
          <span>로그아웃</span>
        </button>
      </div>
    </nav>
  )
}