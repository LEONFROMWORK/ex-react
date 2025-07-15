// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.NEXTAUTH_SECRET = 'test-secret'
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.OPENAI_API_KEY = 'test-key'
process.env.TOSS_SECRET_KEY = 'test-toss-key'
process.env.TOSS_WEBHOOK_SECRET = 'test-webhook-secret'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock prisma client
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    file: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    analysis: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    subscription: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    referral: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    errorPattern: {
      create: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    correction: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
  },
}))

// Mock OpenAI
jest.mock('openai', () => ({
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                confidence: 85,
                corrections: [],
                insights: 'Test analysis',
              }),
            },
          }],
          usage: {
            total_tokens: 100,
            prompt_tokens: 50,
            completion_tokens: 50,
          },
        }),
      },
    },
  })),
}))