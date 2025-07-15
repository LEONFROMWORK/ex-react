"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
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
} from "lucide-react"
import { useState } from "react"

interface AdminNavProps {
  user: {
    name?: string | null
    email?: string | null
    role: string
  }
}

export function AdminNav({ user }: AdminNavProps) {
  const pathname = usePathname()
  const [expandedSections, setExpandedSections] = useState<string[]>(["main"])

  const navSections = [
    {
      id: "main",
      title: "메인",
      items: [
        {
          title: "대시보드",
          href: "/admin",
          icon: LayoutDashboard,
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
        },
        {
          title: "리뷰 관리",
          href: "/admin/reviews",
          icon: Star,
        },
        {
          title: "공지사항",
          href: "/admin/announcements",
          icon: Megaphone,
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
        },
        {
          title: "추천 관리",
          href: "/admin/referrals",
          icon: Gift,
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
        },
        {
          title: "오류 패턴 분석",
          href: "/admin/error-patterns",
          icon: FileWarning,
        },
      ],
    },
  ]

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
      <div className="p-6 border-b">
        <Link href="/admin" className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold">Exhell Admin</span>
        </Link>
      </div>

      {/* User info */}
      <div className="px-6 py-4 border-b bg-gray-50">
        <div className="text-sm">
          <p className="font-medium text-gray-900">{user.name}</p>
          <p className="text-gray-500">{user.email}</p>
          <p className="text-xs text-primary mt-1">
            {user.role === "SUPER_ADMIN" ? "최고 관리자" : "관리자"}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4">
        {navSections.map(section => (
          <div key={section.id} className="mb-4">
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full px-6 py-2 flex items-center justify-between text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700"
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
                          ? "bg-primary/10 text-primary border-r-3 border-primary"
                          : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
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

      {/* Logout */}
      <div className="p-6 border-t">
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center space-x-3 text-sm text-gray-600 hover:text-gray-900"
        >
          <LogOut className="w-5 h-5" />
          <span>로그아웃</span>
        </button>
      </div>
    </nav>
  )
}