"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { TestDashboardNav } from "@/components/dashboard/TestDashboardNav"

interface AuthenticatedLayoutProps {
  children: React.ReactNode
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  
  useEffect(() => {
    const testUser = localStorage.getItem('testUser')
    if (testUser) {
      setUser(JSON.parse(testUser))
    }
  }, [])
  
  // 인증이 필요한 경로들
  const protectedPaths = [
    '/dashboard',
    '/pricing',
    '/referral',
    '/reviews',
    '/usage',
    '/payment',
    '/admin',
    '/profile',
    '/settings'
  ]
  
  // 현재 경로가 보호된 경로인지 확인
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))
  
  // 보호된 경로이고 사용자가 있으면 헤더 표시
  if (isProtectedPath && user) {
    return (
      <>
        <TestDashboardNav />
        <main className="pt-16">
          {children}
        </main>
      </>
    )
  }
  
  // 그 외의 경우는 헤더 없이 콘텐츠만 표시
  return <>{children}</>
}