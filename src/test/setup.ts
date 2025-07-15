import { beforeAll, afterAll, beforeEach } from 'vitest'
import { config } from 'dotenv'

// Load test environment variables
config({ path: '.env.test' })

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.NEXTAUTH_SECRET = 'test-secret'
process.env.OPENAI_API_KEY = 'test-key'

// Global test setup
beforeAll(() => {
  console.log('🧪 Starting test suite...')
})

afterAll(() => {
  console.log('✅ Test suite completed')
})

beforeEach(() => {
  // Reset mocks before each test
  vi.clearAllMocks()
})