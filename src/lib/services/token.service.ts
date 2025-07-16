import { useUserStore } from '@/lib/stores/userStore'

// 토큰 사용량 정의
export const TOKEN_COSTS = {
  // 파일 분석
  FILE_ANALYSIS_BASIC: 10,     // 기본 오류 분석
  FILE_ANALYSIS_ADVANCED: 20,   // 고급 분석 (VBA, 성능 포함)
  
  // AI 채팅
  CHAT_MESSAGE: 1,              // 채팅 메시지당
  CHAT_WITH_FILE_CONTEXT: 2,    // 파일 컨텍스트 포함 채팅
  
  // 파일 수정
  AUTO_FIX_PER_ERROR: 2,        // 오류 자동 수정 (개당)
  GENERATE_REPORT: 5,           // 상세 리포트 생성
  
  // Excel 생성
  CREATE_NEW_FILE: 15,          // 새 Excel 파일 생성
  
  // VBA
  VBA_ANALYSIS: 5,              // VBA 코드 분석
  VBA_FIX: 10,                  // VBA 코드 수정
} as const

export class TokenService {
  private static instance: TokenService
  
  static getInstance(): TokenService {
    if (!TokenService.instance) {
      TokenService.instance = new TokenService()
    }
    return TokenService.instance
  }
  
  // 토큰 잔액 확인
  getBalance(): number {
    return useUserStore.getState().tokens
  }
  
  // 토큰 사용 가능 여부 확인
  canAfford(cost: number): boolean {
    return this.getBalance() >= cost
  }
  
  // 토큰 사용
  async useTokens(amount: number, reason: string): Promise<boolean> {
    return useUserStore.getState().useTokens(amount, reason)
  }
  
  // 토큰 추가 (구매, 보너스 등)
  addTokens(amount: number, reason: string): void {
    useUserStore.getState().addTokens(amount, reason)
  }
  
  // 회원가입 보너스
  grantSignupBonus(): void {
    this.addTokens(100, '회원가입 보너스')
  }
  
  // 추천 보너스
  grantReferralBonus(referrerId: string): void {
    this.addTokens(50, `추천 보너스 (추천인: ${referrerId})`)
  }
  
  // 토큰 히스토리
  getTokenHistory() {
    return useUserStore.getState().tokenHistory
  }
  
  // 예상 비용 계산
  calculateCost(operations: Partial<Record<keyof typeof TOKEN_COSTS, number>>): number {
    let totalCost = 0
    
    for (const [operation, count] of Object.entries(operations)) {
      const cost = TOKEN_COSTS[operation as keyof typeof TOKEN_COSTS]
      if (cost && count) {
        totalCost += cost * count
      }
    }
    
    return totalCost
  }
  
  // 토큰 부족 시 필요한 토큰 수 계산
  getTokensNeeded(requiredAmount: number): number {
    const balance = this.getBalance()
    return Math.max(0, requiredAmount - balance)
  }
}