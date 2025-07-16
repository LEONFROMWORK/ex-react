import { redirect } from "next/navigation"
import { auth } from "@/lib/auth/auth"
import { AdminNav } from "@/components/admin/AdminNav"
import { AuthPermissionService } from "@/lib/services/auth-permission.service"
import { USER_ROLES } from "@/lib/constants/user-roles"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  
  if (!session) {
    redirect("/auth/login")
  }
  
  // 권한 확인
  const permissionService = AuthPermissionService.getInstance()
  const userRole = await permissionService.getUserRole(session.user.id)
  
  // 관리자 권한이 없으면 대시보드로 리다이렉트
  if (!permissionService.hasPermission(userRole, 'canAccessAdmin')) {
    redirect("/dashboard")
  }
  
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-gray-800 shadow-md">
        <AdminNav user={{
          ...session.user,
          role: userRole
        }} />
      </div>
      
      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
          <div className="px-8 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">관리자 대시보드</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {session.user.name} ({userRole})
              </span>
            </div>
          </div>
        </header>
        <main className="p-8">{children}</main>
      </div>
    </div>
  )
}