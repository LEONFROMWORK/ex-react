import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface UserState {
  tokens: number
  tokenHistory: TokenTransaction[]
  
  // Actions
  setTokens: (tokens: number) => void
  addTokens: (amount: number, reason: string) => void
  useTokens: (amount: number, reason: string) => Promise<boolean>
  addTokenTransaction: (transaction: TokenTransaction) => void
  clearTokenHistory: () => void
}

export interface TokenTransaction {
  id: string
  amount: number
  type: 'credit' | 'debit'
  reason: string
  timestamp: Date
  balance: number
}

export const useUserStore = create<UserState>()(
  devtools(
    persist(
      (set, get) => ({
        tokens: 0,
        tokenHistory: [],
        
        setTokens: (tokens) => {
          set({ tokens })
        },
        
        addTokens: (amount, reason) => {
          const currentTokens = get().tokens
          const newBalance = currentTokens + amount
          
          const transaction: TokenTransaction = {
            id: `txn-${Date.now()}`,
            amount,
            type: 'credit',
            reason,
            timestamp: new Date(),
            balance: newBalance
          }
          
          set((state) => ({
            tokens: newBalance,
            tokenHistory: [transaction, ...state.tokenHistory]
          }))
        },
        
        useTokens: async (amount, reason) => {
          const currentTokens = get().tokens
          
          if (currentTokens < amount) {
            return false
          }
          
          const newBalance = currentTokens - amount
          
          const transaction: TokenTransaction = {
            id: `txn-${Date.now()}`,
            amount,
            type: 'debit',
            reason,
            timestamp: new Date(),
            balance: newBalance
          }
          
          set((state) => ({
            tokens: newBalance,
            tokenHistory: [transaction, ...state.tokenHistory]
          }))
          
          return true
        },
        
        addTokenTransaction: (transaction) => {
          set((state) => ({
            tokenHistory: [transaction, ...state.tokenHistory]
          }))
        },
        
        clearTokenHistory: () => {
          set({ tokenHistory: [] })
        }
      }),
      {
        name: 'user-storage',
        partialize: (state) => ({ 
          tokens: state.tokens,
          tokenHistory: state.tokenHistory 
        })
      }
    ),
    {
      name: 'UserStore'
    }
  )
)