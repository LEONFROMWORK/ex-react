import { cookies, headers } from 'next/headers'
import { prisma } from '@/lib/prisma'

export interface Session {
  user: {
    id: string
    email: string
    name: string
    role: string
  }
}

export async function getServerSession(): Promise<Session | null> {
  try {
    // First check for test user header (for development)
    const headersList = headers()
    const testUserId = headersList.get('x-test-user-id')
    
    if (testUserId) {
      const user = await prisma.user.findUnique({
        where: { id: testUserId }
      })
      
      if (user) {
        return {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          }
        }
      }
    }
    
    // Then check cookies
    const cookieStore = cookies()
    const sessionCookie = cookieStore.get('user-session')
    
    if (!sessionCookie?.value) {
      return null
    }

    const userSession = JSON.parse(sessionCookie.value)
    
    // Verify user exists in database
    const user = await prisma.user.findUnique({
      where: { id: userSession.id }
    })

    if (!user) {
      return null
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    }
  } catch (error) {
    console.error('Session error:', error)
    return null
  }
}