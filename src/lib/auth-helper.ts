import { headers } from "next/headers"

// Mock session for testing without NextAuth
export async function getServerSession() {
  // For testing - get user ID from header or use default
  const headersList = headers()
  const testUserId = headersList.get('x-test-user-id')
  
  if (testUserId) {
    // Return mock session based on user ID
    const isAdmin = testUserId.includes('admin')
    return {
      user: {
        id: testUserId,
        email: isAdmin ? 'admin@example.com' : 'test@example.com',
        name: isAdmin ? 'Admin User' : 'Test User',
        role: isAdmin ? 'ADMIN' : 'USER'
      }
    }
  }
  
  // Default test session
  return {
    user: {
      id: 'test-user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'USER'
    }
  }
}