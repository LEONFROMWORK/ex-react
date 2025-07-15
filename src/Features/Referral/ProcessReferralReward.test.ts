import { ProcessReferralRewardHandler } from './ProcessReferralReward'
import { prisma } from '@/lib/prisma'

describe('Bybit-style Referral System Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('ProcessReferralRewardHandler', () => {
    it('should process referral reward on first payment', async () => {
      const handler = new ProcessReferralRewardHandler()
      
      const mockUser = {
        id: 'user_123',
        referredBy: 'JOHN_ABC',
      }

      const mockReferral = {
        id: 'referral_123',
        userId: 'referrer_123',
        referralCode: 'JOHN_ABC',
        tokenRewardAmount: 100,
        user: { id: 'referrer_123' },
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(prisma.referral.findUnique as jest.Mock).mockResolvedValue(mockReferral)
      ;(prisma.transaction.count as jest.Mock).mockResolvedValue(0) // First payment
      ;(prisma.referralReward.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prisma.referralReward.create as jest.Mock).mockResolvedValue({})
      ;(prisma.$transaction as jest.Mock).mockImplementation(async (ops) => ops)
      ;(prisma.transaction.create as jest.Mock).mockResolvedValue({})

      const result = await handler.handle({
        userId: 'user_123',
        paymentAmount: 9900,
        paymentId: 'payment_123',
      })

      expect(result.success).toBe(true)
      expect(result.data.rewardProcessed).toBe(true)
      expect(result.data.tokensAwarded).toBe(100)
      expect(result.data.referrerId).toBe('referrer_123')

      // Verify reward creation
      expect(prisma.referralReward.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          referrerId: 'referrer_123',
          refereeId: 'user_123',
          rewardType: 'FIRST_PAYMENT',
          tokensAwarded: 100,
          cashAwarded: 990, // 10% of payment
          triggerEvent: 'first_payment_completed',
        }),
      })

      // Verify referrer token update
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'referrer_123' },
        data: { tokens: { increment: 100 } },
      })

      // Verify referral stats update
      expect(prisma.referral.update).toHaveBeenCalledWith({
        where: { id: 'referral_123' },
        data: {
          referralCount: { increment: 1 },
          totalTokensEarned: { increment: 100 },
          totalEarned: { increment: 990 },
        },
      })

      // Verify bonus transaction created
      expect(prisma.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'referrer_123',
          type: 'BONUS',
          tokens: 100,
          description: expect.stringContaining('추천 보상'),
        }),
      })
    })

    it('should not process reward if not first payment', async () => {
      const handler = new ProcessReferralRewardHandler()
      
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user_123',
        referredBy: 'JOHN_ABC',
      })
      ;(prisma.referral.findUnique as jest.Mock).mockResolvedValue({
        id: 'referral_123',
        referralCode: 'JOHN_ABC',
      })
      ;(prisma.transaction.count as jest.Mock).mockResolvedValue(1) // Not first payment

      const result = await handler.handle({
        userId: 'user_123',
        paymentAmount: 9900,
        paymentId: 'payment_456',
      })

      expect(result.success).toBe(true)
      expect(result.data.rewardProcessed).toBe(false)
      expect(prisma.referralReward.create).not.toHaveBeenCalled()
    })

    it('should not process reward if already processed for payment', async () => {
      const handler = new ProcessReferralRewardHandler()
      
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user_123',
        referredBy: 'JOHN_ABC',
      })
      ;(prisma.referral.findUnique as jest.Mock).mockResolvedValue({
        id: 'referral_123',
        referralCode: 'JOHN_ABC',
      })
      ;(prisma.transaction.count as jest.Mock).mockResolvedValue(0)
      ;(prisma.referralReward.findFirst as jest.Mock).mockResolvedValue({
        id: 'existing_reward',
      })

      const result = await handler.handle({
        userId: 'user_123',
        paymentAmount: 9900,
        paymentId: 'payment_123',
      })

      expect(result.success).toBe(true)
      expect(result.data.rewardProcessed).toBe(false)
      expect(prisma.referralReward.create).not.toHaveBeenCalled()
    })

    it('should handle user without referral code', async () => {
      const handler = new ProcessReferralRewardHandler()
      
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user_123',
        referredBy: null, // No referral
      })

      const result = await handler.handle({
        userId: 'user_123',
        paymentAmount: 9900,
        paymentId: 'payment_123',
      })

      expect(result.success).toBe(true)
      expect(result.data.rewardProcessed).toBe(false)
      expect(prisma.referral.findUnique).not.toHaveBeenCalled()
    })

    it('should calculate cash reward as 10% of payment', async () => {
      const handler = new ProcessReferralRewardHandler()
      
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user_123',
        referredBy: 'REF_CODE',
      })
      ;(prisma.referral.findUnique as jest.Mock).mockResolvedValue({
        id: 'referral_123',
        userId: 'referrer_123',
        referralCode: 'REF_CODE',
        tokenRewardAmount: 100,
      })
      ;(prisma.transaction.count as jest.Mock).mockResolvedValue(0)
      ;(prisma.referralReward.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prisma.$transaction as jest.Mock).mockImplementation(async (ops) => ops)

      const paymentAmount = 50000 // 50,000 KRW
      const expectedCashReward = 5000 // 10% of 50,000

      await handler.handle({
        userId: 'user_123',
        paymentAmount,
        paymentId: 'payment_123',
      })

      expect(prisma.referralReward.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          cashAwarded: expectedCashReward,
        }),
      })

      expect(prisma.referral.update).toHaveBeenCalledWith({
        where: { id: 'referral_123' },
        data: expect.objectContaining({
          totalEarned: { increment: expectedCashReward },
        }),
      })
    })
  })
})