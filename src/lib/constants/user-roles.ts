// 사용자 역할 정의
export const USER_ROLES = {
  USER: 'USER',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
  SUPPORT: 'SUPPORT'
} as const

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES]

// 역할별 권한 정의
export const ROLE_PERMISSIONS = {
  [USER_ROLES.USER]: {
    // 일반 사용자 권한
    canAccessDashboard: true,
    canAccessAdmin: false,
    canManageUsers: false,
    canManagePayments: false,
    canManageContent: false,
    canViewAnalytics: false,
    canManageAIModels: false,
    canHandleSupport: false
  },
  [USER_ROLES.SUPPORT]: {
    // 고객 지원 팀 권한
    canAccessDashboard: true,
    canAccessAdmin: true,
    canManageUsers: false, // 사용자 정보 조회만 가능
    canManagePayments: false, // 결제 정보 조회만 가능
    canManageContent: false,
    canViewAnalytics: true,
    canManageAIModels: false,
    canHandleSupport: true
  },
  [USER_ROLES.ADMIN]: {
    // 관리자 권한
    canAccessDashboard: true,
    canAccessAdmin: true,
    canManageUsers: true,
    canManagePayments: true,
    canManageContent: true,
    canViewAnalytics: true,
    canManageAIModels: false,
    canHandleSupport: true
  },
  [USER_ROLES.SUPER_ADMIN]: {
    // 최고 관리자 권한 (모든 권한)
    canAccessDashboard: true,
    canAccessAdmin: true,
    canManageUsers: true,
    canManagePayments: true,
    canManageContent: true,
    canViewAnalytics: true,
    canManageAIModels: true,
    canHandleSupport: true
  }
} as const

// 역할별 메뉴 접근 권한
export const ADMIN_MENU_ACCESS = {
  '/admin': [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.SUPPORT],
  '/admin/users': [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN],
  '/admin/payments': [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN],
  '/admin/reviews': [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN],
  '/admin/ai-models': [USER_ROLES.SUPER_ADMIN],
  '/admin/ai-routing': [USER_ROLES.SUPER_ADMIN],
  '/admin/announcements': [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN],
  '/admin/error-patterns': [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN],
  '/admin/referrals': [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN],
  '/admin/support': [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.SUPPORT]
} as const