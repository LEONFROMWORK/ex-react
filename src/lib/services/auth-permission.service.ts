import { UserRole, USER_ROLES, ROLE_PERMISSIONS, ADMIN_MENU_ACCESS } from '@/lib/constants/user-roles'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export class AuthPermissionService {
  private static instance: AuthPermissionService
  
  private constructor() {}
  
  static getInstance(): AuthPermissionService {
    if (!AuthPermissionService.instance) {
      AuthPermissionService.instance = new AuthPermissionService()
    }
    return AuthPermissionService.instance
  }
  
  // 사용자 역할 가져오기
  async getUserRole(userId: string): Promise<UserRole> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      })
      
      return (user?.role as UserRole) || USER_ROLES.USER
    } catch (error) {
      console.error('Error fetching user role:', error)
      return USER_ROLES.USER
    }
  }
  
  // 권한 확인
  hasPermission(role: UserRole, permission: keyof typeof ROLE_PERMISSIONS.USER): boolean {
    return ROLE_PERMISSIONS[role]?.[permission] || false
  }
  
  // 관리자 페이지 접근 권한 확인
  canAccessAdminPage(role: UserRole, path: string): boolean {
    // 정확한 경로 매칭
    if (ADMIN_MENU_ACCESS[path as keyof typeof ADMIN_MENU_ACCESS]) {
      return ADMIN_MENU_ACCESS[path as keyof typeof ADMIN_MENU_ACCESS].includes(role)
    }
    
    // 상위 경로로 권한 확인
    const pathParts = path.split('/')
    while (pathParts.length > 0) {
      const checkPath = pathParts.join('/')
      if (ADMIN_MENU_ACCESS[checkPath as keyof typeof ADMIN_MENU_ACCESS]) {
        return ADMIN_MENU_ACCESS[checkPath as keyof typeof ADMIN_MENU_ACCESS].includes(role)
      }
      pathParts.pop()
    }
    
    return false
  }
  
  // 서버 사이드 권한 확인
  async checkServerPermission(permission: keyof typeof ROLE_PERMISSIONS.USER): Promise<boolean> {
    const session = await auth()
    if (!session?.user?.id) return false
    
    const role = await this.getUserRole(session.user.id)
    return this.hasPermission(role, permission)
  }
  
  // 서버 사이드 관리자 권한 확인
  async isAdmin(): Promise<boolean> {
    const session = await auth()
    if (!session?.user?.id) return false
    
    const role = await this.getUserRole(session.user.id)
    return [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(role)
  }
  
  // 서버 사이드 최고 관리자 권한 확인
  async isSuperAdmin(): Promise<boolean> {
    const session = await auth()
    if (!session?.user?.id) return false
    
    const role = await this.getUserRole(session.user.id)
    return role === USER_ROLES.SUPER_ADMIN
  }
  
  // 역할 업데이트 (최고 관리자만 가능)
  async updateUserRole(targetUserId: string, newRole: UserRole, adminUserId: string): Promise<boolean> {
    try {
      // 권한 확인
      const adminRole = await this.getUserRole(adminUserId)
      if (adminRole !== USER_ROLES.SUPER_ADMIN) {
        throw new Error('최고 관리자만 역할을 변경할 수 있습니다.')
      }
      
      // 자기 자신의 역할은 변경 불가
      if (targetUserId === adminUserId) {
        throw new Error('자신의 역할은 변경할 수 없습니다.')
      }
      
      // 역할 업데이트
      await prisma.user.update({
        where: { id: targetUserId },
        data: { role: newRole }
      })
      
      // 역할 변경 기록
      await prisma.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'UPDATE_USER_ROLE',
          targetId: targetUserId,
          details: {
            newRole,
            timestamp: new Date()
          }
        }
      })
      
      return true
    } catch (error) {
      console.error('Error updating user role:', error)
      return false
    }
  }
}