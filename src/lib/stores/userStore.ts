import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface UserState {
  credits: number
  creditHistory: CreditTransaction[]
  
  // Actions
  setCredits: (credits: number) => void
  addCredits: (amount: number, reason: string) => void
  useCredits: (amount: number, reason: string) => Promise<boolean>
  addCreditTransaction: (transaction: CreditTransaction) => void
  clearCreditHistory: () => void
}

export interface CreditTransaction {
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
        credits: 0,
        creditHistory: [],
        
        setCredits: (credits) => {
          set({ credits })
        },
        
        addCredits: (amount, reason) => {
          const currentCredits = get().credits
          const newBalance = currentCredits + amount
          
          const transaction: CreditTransaction = {
            id: `txn-${Date.now()}`,
            amount,
            type: 'credit',
            reason,
            timestamp: new Date(),
            balance: newBalance
          }
          
          set((state) => ({
            credits: newBalance,
            creditHistory: [transaction, ...state.creditHistory]
          }))
        },
        
        useCredits: async (amount, reason) => {
          const currentCredits = get().credits
          
          if (currentCredits < amount) {
            return false
          }
          
          const newBalance = currentCredits - amount
          
          const transaction: CreditTransaction = {
            id: `txn-${Date.now()}`,
            amount,
            type: 'debit',
            reason,
            timestamp: new Date(),
            balance: newBalance
          }
          
          set((state) => ({
            credits: newBalance,
            creditHistory: [transaction, ...state.creditHistory]
          }))
          
          return true
        },
        
        addCreditTransaction: (transaction) => {
          set((state) => ({
            creditHistory: [transaction, ...state.creditHistory]
          }))
        },
        
        clearCreditHistory: () => {
          set({ creditHistory: [] })
        }
      }),
      {
        name: 'user-storage',
        partialize: (state) => ({ 
          credits: state.credits,
          creditHistory: state.creditHistory 
        })
      }
    ),
    {
      name: 'UserStore'
    }
  )
)