import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { AuthPermissionService } from '@/lib/services/auth-permission.service'
import { prisma } from '@/lib/prisma'

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
    
    // Only SUPER_ADMIN can change roles
    if (userRole !== 'SUPER_ADMIN') {
      return new Response('Forbidden', { status: 403 })
    }

    const body = await request.json()
    const { role, reason } = body

    if (!role || !reason) {
      return new Response('Missing required fields', { status: 400 })
    }

    // Update user role
    await prisma.user.update({
      where: { id: params.id },
      data: { role }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE_USER_ROLE',
        targetId: params.id,
        details: {
          newRole: role,
          reason
        }
      }
    })

    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error('Error updating user role:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}