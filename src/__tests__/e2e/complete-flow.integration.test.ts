import { SignupHandler } from '@/Features/Auth/Signup/Signup'
import { LoginHandler } from '@/Features/Auth/Login/Login'
import { UploadFileHandler } from '@/Features/FileUpload/UploadFile'
import { AnalyzeErrorsHandler } from '@/Features/ExcelAnalysis/AnalyzeErrors/AnalyzeErrors'
import { CorrectWithAIHandler } from '@/Features/ExcelCorrection/CorrectWithAI'
import { CreatePaymentHandler } from '@/Features/Payment/CreatePayment/CreatePayment'
import { ConfirmPaymentHandler } from '@/Features/Payment/ConfirmPayment/ConfirmPayment'
import { ProcessReferralRewardHandler } from '@/Features/Referral/ProcessReferralReward'
import { SaveErrorPatternHandler } from '@/Features/ErrorPatterns/SaveErrorPattern'
import { prisma } from '@/lib/prisma'
import * as bcrypt from 'bcryptjs'

jest.mock('bcryptjs')
jest.mock('@/lib/excel/analyzer-enhanced')
jest.mock('@/lib/ai/analyzer')
jest.mock('fs/promises')
jest.mock('xlsx')

describe('Complete End-to-End Flow Test', () => {
  const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>
  
  beforeEach(() => {
    jest.clearAllMocks()
    mockBcrypt.hash.mockResolvedValue('hashed_password')
    mockBcrypt.compare.mockResolvedValue(true)
  })

  it('should complete full user journey with referral and partial success', async () => {
    // Step 1: Create referrer account
    const signupHandler = new SignupHandler()
    const referrerUser = {
      id: 'referrer_123',
      email: 'referrer@example.com',
      name: 'John Referrer',
      referralCode: 'JOHN_ABC',
      tokens: 100,
    }

    ;(prisma.user.findUnique as jest.Mock)
      .mockResolvedValueOnce(null) // Email check
    ;(prisma.user.create as jest.Mock).mockResolvedValue(referrerUser)
    ;(prisma.$transaction as jest.Mock).mockImplementation(async (fn) => fn(prisma))
    ;(prisma.referral.create as jest.Mock).mockResolvedValue({
      id: 'referral_123',
      userId: 'referrer_123',
      referralCode: 'JOHN_ABC',
    })

    const referrerResult = await signupHandler.handle({
      email: 'referrer@example.com',
      password: 'Password123!',
      name: 'John Referrer',
    })

    expect(referrerResult.isSuccess).toBe(true)

    // Step 2: Create new user with referral code
    const newUser = {
      id: 'user_123',
      email: 'user@example.com',
      name: 'Test User',
      referredBy: 'JOHN_ABC',
      tokens: 200, // Bonus tokens
    }

    ;(prisma.user.findUnique as jest.Mock)
      .mockResolvedValueOnce(null) // Email check
      .mockResolvedValueOnce(referrerUser) // Referral code check
    ;(prisma.user.create as jest.Mock).mockResolvedValue(newUser)

    const userResult = await signupHandler.handle({
      email: 'user@example.com',
      password: 'Password123!',
      name: 'Test User',
      referralCode: 'JOHN_ABC',
    })

    expect(userResult.isSuccess).toBe(true)
    expect(userResult.value?.user.referredBy).toBe('JOHN_ABC')

    // Step 3: User uploads Excel file
    const uploadHandler = new UploadFileHandler()
    const mockFile = {
      id: 'file_123',
      userId: 'user_123',
      fileName: 'test.xlsx',
      uploadUrl: '/uploads/test.xlsx',
      status: 'PENDING',
    }

    ;(prisma.file.create as jest.Mock).mockResolvedValue(mockFile)

    const uploadResult = await uploadHandler.handle({
      userId: 'user_123',
      file: {
        buffer: Buffer.from('excel content'),
        originalname: 'test.xlsx',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: 1024,
      },
    })

    expect(uploadResult.isSuccess).toBe(true)

    // Step 4: Analyze Excel file and save error patterns
    const analyzeHandler = new AnalyzeErrorsHandler()
    const mockAnalysis = {
      id: 'analysis_123',
      fileId: 'file_123',
      errors: [
        { type: 'formula', location: { sheet: 'Sheet1', cell: 'A1' }, message: '#DIV/0!' },
        { type: 'formula', location: { sheet: 'Sheet1', cell: 'B2' }, message: '#VALUE!' },
        { type: 'formula', location: { sheet: 'Sheet1', cell: 'C3' }, message: '#REF!' },
        { type: 'formula', location: { sheet: 'Sheet1', cell: 'D4' }, message: '#N/A' },
      ],
    }

    ;(prisma.file.findFirst as jest.Mock).mockResolvedValue(mockFile)
    ;(prisma.analysis.create as jest.Mock).mockResolvedValue(mockAnalysis)

    const analyzeResult = await analyzeHandler.handle({
      fileId: 'file_123',
      userId: 'user_123',
      analysisType: 'ai',
    })

    expect(analyzeResult.isSuccess).toBe(true)

    // Step 5: AI correction with partial success (25% success rate)
    const correctHandler = new CorrectWithAIHandler()
    
    ;(prisma.analysis.findUnique as jest.Mock).mockResolvedValue({
      ...mockAnalysis,
      file: mockFile,
    })
    ;(prisma.correction.create as jest.Mock).mockResolvedValue({
      id: 'correction_123',
    })
    ;(prisma.aIUsageStats.upsert as jest.Mock).mockResolvedValue({})

    // Mock AI only correcting 1 out of 4 errors (25% success)
    const mockAIResult = {
      tier: 'TIER2',
      corrections: [
        { location: 'A1', corrected: true, formula: '=IF(B1=0,0,A1/B1)' },
        { location: 'B2', corrected: false },
        { location: 'C3', corrected: false },
        { location: 'D4', corrected: false },
      ],
      tokensUsed: 400,
      cost: 0.008,
    }

    const correctResult = await correctHandler.handle({
      fileId: 'file_123',
      userId: 'user_123',
      analysisId: 'analysis_123',
      aiTier: 'premium',
      autoApply: true,
    })

    expect(correctResult.isSuccess).toBe(true)
    expect(correctResult.value?.successRate).toBe(25)
    expect(correctResult.value?.tokensUsed).toBe(400)
    expect(correctResult.value?.tokensCharged).toBe(200) // 50% discount
    expect(correctResult.value?.partialSuccess).toBe(true)

    // Step 6: User makes payment
    const createPaymentHandler = new CreatePaymentHandler()
    
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(newUser)
    ;(prisma.paymentIntent.create as jest.Mock).mockResolvedValue({
      id: 'intent_123',
      orderId: 'order_123',
      amount: 9900,
    })

    const paymentResult = await createPaymentHandler.handle({
      userId: 'user_123',
      subscriptionPlan: 'BASIC',
      billingPeriod: 'MONTHLY',
    })

    expect(paymentResult.isSuccess).toBe(true)

    // Step 7: Confirm payment and trigger referral reward
    const confirmHandler = new ConfirmPaymentHandler()
    const referralHandler = new ProcessReferralRewardHandler()

    ;(prisma.paymentIntent.findUnique as jest.Mock).mockResolvedValue({
      id: 'intent_123',
      userId: 'user_123',
      orderId: 'order_123',
      amount: 9900,
      subscriptionPlan: 'BASIC',
    })
    ;(prisma.paymentIntent.update as jest.Mock).mockResolvedValue({})
    ;(prisma.subscription.upsert as jest.Mock).mockResolvedValue({})
    ;(prisma.transaction.create as jest.Mock).mockResolvedValue({})

    // Mock referral reward processing
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user_123',
      referredBy: 'JOHN_ABC',
    })
    ;(prisma.referral.findUnique as jest.Mock).mockResolvedValue({
      id: 'referral_123',
      userId: 'referrer_123',
      referralCode: 'JOHN_ABC',
      tokenRewardAmount: 100,
    })
    ;(prisma.transaction.count as jest.Mock).mockResolvedValue(0) // First payment
    ;(prisma.referralReward.findFirst as jest.Mock).mockResolvedValue(null)
    ;(prisma.referralReward.create as jest.Mock).mockResolvedValue({})

    const confirmResult = await confirmHandler.handle({
      paymentKey: 'pay_123',
      orderId: 'order_123',
      amount: 9900,
    })

    expect(confirmResult.isSuccess).toBe(true)

    // Process referral reward
    const referralResult = await referralHandler.handle({
      userId: 'user_123',
      paymentAmount: 9900,
      paymentId: 'payment_123',
    })

    expect(referralResult.success).toBe(true)
    expect(referralResult.data.rewardProcessed).toBe(true)
    expect(referralResult.data.tokensAwarded).toBe(100)
    expect(referralResult.data.referrerId).toBe('referrer_123')

    // Verify all integrations worked correctly
    expect(prisma.user.create).toHaveBeenCalledTimes(2) // Referrer and user
    expect(prisma.file.create).toHaveBeenCalled()
    expect(prisma.analysis.create).toHaveBeenCalled()
    expect(prisma.correction.create).toHaveBeenCalled()
    expect(prisma.subscription.upsert).toHaveBeenCalled()
    expect(prisma.referralReward.create).toHaveBeenCalled()
  })
})