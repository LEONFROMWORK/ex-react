import { SignupHandler } from './Signup'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

jest.mock('bcryptjs')

describe('Signup Integration Tests', () => {
  const mockBcryptHash = bcrypt.hash as jest.MockedFunction<typeof bcrypt.hash>
  
  beforeEach(() => {
    jest.clearAllMocks()
    mockBcryptHash.mockResolvedValue('hashed_password')
  })

  describe('SignupHandler', () => {
    it('should successfully create a new user', async () => {
      const handler = new SignupHandler()
      const mockUser = {
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed_password',
        referralCode: 'TEST_1234',
        referredBy: null,
        emailVerified: null,
        role: 'USER' as const,
        tokens: 100,
        aiPreference: 'ECONOMY' as const,
        preferences: null,
        customerKey: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.user.create as jest.Mock).mockResolvedValue(mockUser)
      ;(prisma.profile.create as jest.Mock).mockResolvedValue({})
      ;(prisma.subscription.create as jest.Mock).mockResolvedValue({})
      ;(prisma.$transaction as jest.Mock).mockImplementation(async (fn) => fn(prisma))

      const result = await handler.handle({
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
      })

      expect(result.isSuccess).toBe(true)
      expect(result.value?.user.email).toBe('test@example.com')
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'test@example.com',
          password: 'hashed_password',
          name: 'Test User',
        }),
      })
    })

    it('should fail if email already exists', async () => {
      const handler = new SignupHandler()
      
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing_user',
        email: 'test@example.com',
      })

      const result = await handler.handle({
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
      })

      expect(result.isSuccess).toBe(false)
      expect(result.error.code).toBe('Auth.EmailAlreadyExists')
    })

    it('should apply referral code if provided', async () => {
      const handler = new SignupHandler()
      const mockReferrer = {
        id: 'referrer_123',
        referralCode: 'JOHN_ABC',
      }

      ;(prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(null) // Email check
        .mockResolvedValueOnce(mockReferrer) // Referral code check
      
      ;(prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'new_user',
        email: 'test@example.com',
        referredBy: 'JOHN_ABC',
      })
      
      ;(prisma.$transaction as jest.Mock).mockImplementation(async (fn) => fn(prisma))

      const result = await handler.handle({
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
        referralCode: 'JOHN_ABC',
      })

      expect(result.isSuccess).toBe(true)
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          referredBy: 'JOHN_ABC',
        }),
      })
    })

    it('should give bonus tokens for referral signup', async () => {
      const handler = new SignupHandler()
      
      ;(prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'referrer', referralCode: 'REF123' })
      
      ;(prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'new_user',
        email: 'test@example.com',
        tokens: 200, // Bonus tokens
      })
      
      ;(prisma.$transaction as jest.Mock).mockImplementation(async (fn) => fn(prisma))

      const result = await handler.handle({
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
        referralCode: 'REF123',
      })

      expect(result.isSuccess).toBe(true)
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tokens: 200, // Includes referral bonus
        }),
      })
    })
  })
})