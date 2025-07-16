// Shared Middleware - Authentication
import { NextRequest, NextResponse } from 'next/server'

export type AuthenticatedHandler = (
  request: NextRequest,
  session: any,
  params?: any
) => Promise<NextResponse>

export function withAuth(handler: AuthenticatedHandler) {
  return async (request: NextRequest, params?: any) => {
    try {
      // Mock session for testing
      const testUserId = request.headers.get('x-test-user-id')
      
      if (testUserId) {
        const mockSession = {
          user: {
            id: testUserId,
            email: 'test@example.com',
            name: 'Test User'
          }
        }
        
        return handler(request, mockSession, params)
      }
      
      // 실제 환경에서는 NextAuth 등 사용
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    } catch (error) {
      console.error('Auth middleware error:', error)
      return NextResponse.json(
        { success: false, error: 'Authentication failed' },
        { status: 401 }
      )
    }
  }
}