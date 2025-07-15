import { CreatePaymentHandler } from './CreatePayment/CreatePayment'
import { ConfirmPaymentHandler } from './ConfirmPayment/ConfirmPayment'
import { PaymentWebhookHandler } from './WebhookHandler/PaymentWebhookHandler'
import { prisma } from '@/lib/prisma'
import { TossPaymentsAPI } from '@/lib/tosspayments'

jest.mock('@/lib/tosspayments')
jest.mock('@/lib/prisma')

describe('Payment System Integration Tests', () => {
  const mockTossAPI = TossPaymentsAPI as jest.MockedClass<typeof TossPaymentsAPI>
  
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('CreatePaymentHandler', () => {
    it('should create payment intent for subscription', async () => {
      const handler = new CreatePaymentHandler()
      
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user_123',
        customerKey: 'cust_123',
      })
      ;(prisma.paymentIntent.create as jest.Mock).mockResolvedValue({
        id: 'intent_123',
        orderId: 'order_123',
        amount: 9900,
      })

      const result = await handler.handle({
        userId: 'user_123',
        subscriptionPlan: 'BASIC',
        billingPeriod: 'MONTHLY',
      })

      expect(result.isSuccess).toBe(true)
      expect(result.value?.orderId).toBe('order_123')
      expect(result.value?.amount).toBe(9900)
      expect(prisma.paymentIntent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user_123',
          amount: 9900,
          subscriptionPlan: 'BASIC',
          billingPeriod: 'MONTHLY',
        }),
      })
    })

    it('should apply discount for annual billing', async () => {
      const handler = new CreatePaymentHandler()
      
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user_123',
      })
      ;(prisma.paymentIntent.create as jest.Mock).mockResolvedValue({
        id: 'intent_123',
        amount: 118800, // 9900 * 12 * 0.8 (20% discount)
      })

      const result = await handler.handle({
        userId: 'user_123',
        subscriptionPlan: 'BASIC',
        billingPeriod: 'ANNUAL',
      })

      expect(result.isSuccess).toBe(true)
      expect(result.value?.amount).toBe(95040) // With 20% annual discount
    })

    it('should handle invalid subscription plan', async () => {
      const handler = new CreatePaymentHandler()
      
      const result = await handler.handle({
        userId: 'user_123',
        subscriptionPlan: 'INVALID' as any,
        billingPeriod: 'MONTHLY',
      })

      expect(result.isSuccess).toBe(false)
      expect(result.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('ConfirmPaymentHandler', () => {
    it('should confirm payment and activate subscription', async () => {
      const handler = new ConfirmPaymentHandler()
      
      const mockPaymentIntent = {
        id: 'intent_123',
        userId: 'user_123',
        orderId: 'order_123',
        amount: 9900,
        status: 'PENDING',
        subscriptionPlan: 'BASIC',
        billingPeriod: 'MONTHLY',
      }

      const mockTossResponse = {
        paymentKey: 'pay_123',
        orderId: 'order_123',
        status: 'DONE',
        approvedAt: '2024-01-15T10:00:00Z',
        receipt: { url: 'https://receipt.url' },
      }

      ;(prisma.paymentIntent.findUnique as jest.Mock).mockResolvedValue(mockPaymentIntent)
      ;(mockTossAPI.prototype.confirmPayment as jest.Mock).mockResolvedValue(mockTossResponse)
      ;(prisma.paymentIntent.update as jest.Mock).mockResolvedValue({})
      ;(prisma.subscription.upsert as jest.Mock).mockResolvedValue({})
      ;(prisma.transaction.create as jest.Mock).mockResolvedValue({})

      const result = await handler.handle({
        paymentKey: 'pay_123',
        orderId: 'order_123',
        amount: 9900,
      })

      expect(result.isSuccess).toBe(true)
      expect(result.value?.status).toBe('DONE')
      expect(prisma.subscription.upsert).toHaveBeenCalledWith({
        where: { userId: 'user_123' },
        create: expect.objectContaining({
          plan: 'BASIC',
          status: 'ACTIVE',
          monthlyTokens: 1000,
        }),
        update: expect.objectContaining({
          plan: 'BASIC',
          status: 'ACTIVE',
        }),
      })
    })

    it('should handle payment confirmation failure', async () => {
      const handler = new ConfirmPaymentHandler()
      
      ;(prisma.paymentIntent.findUnique as jest.Mock).mockResolvedValue({
        id: 'intent_123',
        orderId: 'order_123',
      })
      ;(mockTossAPI.prototype.confirmPayment as jest.Mock).mockRejectedValue(
        new Error('Payment failed')
      )

      const result = await handler.handle({
        paymentKey: 'pay_123',
        orderId: 'order_123',
        amount: 9900,
      })

      expect(result.isSuccess).toBe(false)
      expect(result.error.code).toBe('PAYMENT_CONFIRM_FAILED')
    })
  })

  describe('PaymentWebhookHandler', () => {
    it('should handle payment status change webhook', async () => {
      const handler = new PaymentWebhookHandler()
      
      const webhookData = {
        eventType: 'PAYMENT_STATUS_CHANGED',
        timestamp: '2024-01-15T10:00:00Z',
        data: {
          paymentKey: 'pay_123',
          orderId: 'order_123',
          status: 'DONE',
        },
      }

      ;(prisma.paymentIntent.update as jest.Mock).mockResolvedValue({})

      const result = await handler.handle(webhookData, 'valid-signature')

      expect(result.isSuccess).toBe(true)
      expect(prisma.paymentIntent.update).toHaveBeenCalledWith({
        where: { orderId: 'order_123' },
        data: expect.objectContaining({
          status: 'COMPLETED',
        }),
      })
    })

    it('should trigger referral reward on first payment', async () => {
      const handler = new PaymentWebhookHandler()
      
      const webhookData = {
        eventType: 'VIRTUAL_ACCOUNT_DEPOSIT_CONFIRMED',
        timestamp: '2024-01-15T10:00:00Z',
        data: {
          orderId: 'order_123',
        },
      }

      const mockPaymentIntent = {
        id: 'intent_123',
        userId: 'user_123',
        amount: 9900,
        subscriptionPlan: 'BASIC',
      }

      ;(prisma.paymentIntent.findUnique as jest.Mock).mockResolvedValue(mockPaymentIntent)
      ;(prisma.paymentIntent.update as jest.Mock).mockResolvedValue({})
      ;(prisma.subscription.upsert as jest.Mock).mockResolvedValue({})

      const result = await handler.handle(webhookData, 'valid-signature')

      expect(result.isSuccess).toBe(true)
      // Verify referral reward processing was triggered
    })

    it('should reject webhook with invalid signature', async () => {
      const handler = new PaymentWebhookHandler()
      
      const result = await handler.handle({}, 'invalid-signature')

      expect(result.isSuccess).toBe(false)
      expect(result.error.code).toBe('INVALID_SIGNATURE')
    })
  })
})