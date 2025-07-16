// 사용자 등급 정의
export const USER_TIERS = {
  FREE: 'FREE',
  BASIC: 'BASIC',
  PRO: 'PRO',
  ENTERPRISE: 'ENTERPRISE'
} as const

export type UserTier = typeof USER_TIERS[keyof typeof USER_TIERS]

// 등급별 기능 제한
export const TIER_LIMITS = {
  [USER_TIERS.FREE]: {
    name: '무료',
    monthlyTokens: 0, // 토큰 충전 불가, 보너스만 사용
    maxFileSize: 5 * 1024 * 1024, // 5MB
    maxFilesPerMonth: 10,
    features: {
      basicAnalysis: true,
      advancedAnalysis: false,
      vbaAnalysis: false,
      performanceOptimization: false,
      batchProcessing: false,
      prioritySupport: false,
      apiAccess: false,
      customReports: false,
      teamCollaboration: false,
      fileVersioning: false
    },
    analysisOptions: {
      maxErrorsPerFile: 50,
      maxSuggestionsPerFile: 20,
      autoFixEnabled: false
    }
  },
  [USER_TIERS.BASIC]: {
    name: '베이직',
    monthlyTokens: 1000,
    maxFileSize: 20 * 1024 * 1024, // 20MB
    maxFilesPerMonth: 50,
    features: {
      basicAnalysis: true,
      advancedAnalysis: true,
      vbaAnalysis: false,
      performanceOptimization: true,
      batchProcessing: false,
      prioritySupport: false,
      apiAccess: false,
      customReports: true,
      teamCollaboration: false,
      fileVersioning: true
    },
    analysisOptions: {
      maxErrorsPerFile: 200,
      maxSuggestionsPerFile: 100,
      autoFixEnabled: true
    }
  },
  [USER_TIERS.PRO]: {
    name: '프로',
    monthlyTokens: 5000,
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxFilesPerMonth: 200,
    features: {
      basicAnalysis: true,
      advancedAnalysis: true,
      vbaAnalysis: true,
      performanceOptimization: true,
      batchProcessing: true,
      prioritySupport: true,
      apiAccess: true,
      customReports: true,
      teamCollaboration: false,
      fileVersioning: true
    },
    analysisOptions: {
      maxErrorsPerFile: -1, // 무제한
      maxSuggestionsPerFile: -1, // 무제한
      autoFixEnabled: true
    }
  },
  [USER_TIERS.ENTERPRISE]: {
    name: '엔터프라이즈',
    monthlyTokens: -1, // 무제한
    maxFileSize: 100 * 1024 * 1024, // 100MB
    maxFilesPerMonth: -1, // 무제한
    features: {
      basicAnalysis: true,
      advancedAnalysis: true,
      vbaAnalysis: true,
      performanceOptimization: true,
      batchProcessing: true,
      prioritySupport: true,
      apiAccess: true,
      customReports: true,
      teamCollaboration: true,
      fileVersioning: true
    },
    analysisOptions: {
      maxErrorsPerFile: -1,
      maxSuggestionsPerFile: -1,
      autoFixEnabled: true
    }
  }
} as const

// 기능별 토큰 비용 (등급별 할인)
export const TIER_TOKEN_COSTS = {
  [USER_TIERS.FREE]: {
    FILE_ANALYSIS_BASIC: 10,
    FILE_ANALYSIS_ADVANCED: null, // 사용 불가
    AUTO_FIX_PER_ERROR: null, // 사용 불가
    GENERATE_REPORT: 5,
    CHAT_MESSAGE: 2,
    VBA_ANALYSIS: null // 사용 불가
  },
  [USER_TIERS.BASIC]: {
    FILE_ANALYSIS_BASIC: 8,
    FILE_ANALYSIS_ADVANCED: 15,
    AUTO_FIX_PER_ERROR: 2,
    GENERATE_REPORT: 4,
    CHAT_MESSAGE: 1,
    VBA_ANALYSIS: null // 사용 불가
  },
  [USER_TIERS.PRO]: {
    FILE_ANALYSIS_BASIC: 5,
    FILE_ANALYSIS_ADVANCED: 10,
    AUTO_FIX_PER_ERROR: 1,
    GENERATE_REPORT: 3,
    CHAT_MESSAGE: 1,
    VBA_ANALYSIS: 20
  },
  [USER_TIERS.ENTERPRISE]: {
    FILE_ANALYSIS_BASIC: 0, // 무료
    FILE_ANALYSIS_ADVANCED: 0, // 무료
    AUTO_FIX_PER_ERROR: 0, // 무료
    GENERATE_REPORT: 0, // 무료
    CHAT_MESSAGE: 0, // 무료
    VBA_ANALYSIS: 0 // 무료
  }
} as const

// 등급별 가격 정보
export const TIER_PRICING = {
  [USER_TIERS.FREE]: {
    monthly: 0,
    yearly: 0,
    description: '개인 사용자를 위한 무료 플랜'
  },
  [USER_TIERS.BASIC]: {
    monthly: 9900,
    yearly: 99000, // 2개월 무료
    description: '소규모 팀을 위한 기본 플랜'
  },
  [USER_TIERS.PRO]: {
    monthly: 29900,
    yearly: 299000, // 2개월 무료
    description: '전문가를 위한 고급 플랜'
  },
  [USER_TIERS.ENTERPRISE]: {
    monthly: null, // 문의
    yearly: null, // 문의
    description: '대기업을 위한 맞춤형 플랜'
  }
} as const