import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-helper'

export async function tenantMiddleware(request: NextRequest) {
  // Skip for public routes
  const publicPaths = ['/api/auth', '/api/public']
  if (publicPaths.some(path => request.nextUrl.pathname.startsWith(path))) {
    return NextResponse.next()
  }

  try {
    const session = await getServerSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Add tenant context to headers
    const headers = new Headers(request.headers)
    headers.set('x-tenant-id', session.user.tenantId || 'default')
    headers.set('x-user-id', session.user.id)

    return NextResponse.next({
      request: {
        headers,
      },
    })
  } catch (error) {
    console.error('Tenant middleware error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}