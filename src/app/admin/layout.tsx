import { redirect } from "next/navigation"
import { getServerSession } from "@/lib/auth-helper"
import { AdminNav } from "@/components/admin/AdminNav"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession()

  if (!session) {
    redirect("/auth/login")
  }

  // Check if user has admin role
  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard")
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md">
        <AdminNav user={session.user} />
      </div>
      
      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <header className="bg-white shadow-sm border-b">
          <div className="px-8 py-4">
            <h1 className="text-2xl font-bold text-gray-900">관리자 대시보드</h1>
          </div>
        </header>
        <main className="p-8">{children}</main>
      </div>
    </div>
  )
}