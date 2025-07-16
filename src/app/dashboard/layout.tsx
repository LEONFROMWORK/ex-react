"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  
  useEffect(() => {
    // 테스트 환경에서는 localStorage 확인
    const testUser = localStorage.getItem('testUser')
    if (!testUser) {
      router.push('/auth/simple-login')
    }
  }, [router])

  return <>{children}</>
}