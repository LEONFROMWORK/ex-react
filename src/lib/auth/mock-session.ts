// Mock session for development without database
import { headers } from 'next/headers'

export interface MockUser {
  id: string
  email: string
  name: string
  role: string
}

const MOCK_USERS: Record<string, MockUser> = {
  'user-1': {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'USER'
  },
  'admin-1': {
    id: 'admin-1',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'ADMIN'
  }
}

export async function getMockSession() {
  try {
    const headersList = headers()
    const testUserId = headersList.get('x-test-user-id')
    
    if (testUserId && MOCK_USERS[testUserId]) {
      return {
        user: MOCK_USERS[testUserId]
      }
    }
    
    return null
  } catch (error) {
    console.error('Mock session error:', error)
    return null
  }
}