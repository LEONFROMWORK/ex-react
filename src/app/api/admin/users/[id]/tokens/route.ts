import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { AuthPermissionService } from '@/lib/services/auth-permission.service'
import { AdminStatsService } from '@/lib/services/admin-stats.service'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return new Response('Unauthorized', { status: 401 })
    }

    const permissionService = AuthPermissionService.getInstance()
    const userRole = await permissionService.getUserRole(session.user.id)
    
    if (!permissionService.hasPermission(userRole, 'canManageUsers')) {
      return new Response('Forbidden', { status: 403 })
    }

    const body = await request.json()
    const { amount, reason } = body

    if (amount === undefined || !reason) {
      return new Response('Missing required fields', { status: 400 })
    }

    const adminService = AdminStatsService.getInstance()
    const newBalance = await adminService.adjustUserTokens(
      params.id, 
      amount, 
      reason, 
      session.user.id
    )

    return Response.json({ newBalance })
  } catch (error) {
    console.error('Error adjusting user tokens:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}