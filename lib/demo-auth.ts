// 데모 모드를 위한 임시 인증 처리
export function getDemoSession() {
  return {
    user: {
      id: 'demo-user-123',
      email: 'demo@excelapp.com',
      name: 'Demo User',
      tier: 'TIER2' // 데모를 위해 TIER2 권한 부여
    }
  };
}

export function isDemoMode() {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || process.env.NODE_ENV === 'development';
}