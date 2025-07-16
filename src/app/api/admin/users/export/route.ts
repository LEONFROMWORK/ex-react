import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { AuthPermissionService } from '@/lib/services/auth-permission.service'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return new Response('Unauthorized', { status: 401 })
    }

    const permissionService = AuthPermissionService.getInstance()
    const userRole = await permissionService.getUserRole(session.user.id)
    
    if (!permissionService.hasPermission(userRole, 'canAccessAdmin')) {
      return new Response('Forbidden', { status: 403 })
    }

    // Get all users with relevant data
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tier: true,
        tokens: true,
        emailVerified: true,
        createdAt: true,
        lastActiveAt: true,
        _count: {
          select: {
            files: true,
            analyses: true,
            tokenTransactions: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Create CSV content
    const headers = [
      'ID',
      '이름',
      '이메일',
      '역할',
      '등급',
      '토큰 잔액',
      '이메일 인증',
      '가입일',
      '마지막 활동',
      '파일 수',
      '분석 수',
      '토큰 거래 수'
    ]

    const rows = users.map(user => [
      user.id,
      user.name || '',
      user.email,
      user.role,
      user.tier || 'FREE',
      user.tokens,
      user.emailVerified ? '인증됨' : '미인증',
      format(new Date(user.createdAt), 'yyyy-MM-dd HH:mm:ss'),
      user.lastActiveAt ? format(new Date(user.lastActiveAt), 'yyyy-MM-dd HH:mm:ss') : '',
      user._count.files,
      user._count.analyses,
      user._count.tokenTransactions
    ])

    // Add BOM for Excel UTF-8 compatibility
    const BOM = '\uFEFF'
    const csvContent = BOM + [
      headers.join(','),
      ...rows.map(row => row.map(cell => 
        typeof cell === 'string' && cell.includes(',') 
          ? `"${cell.replace(/"/g, '""')}"` 
          : cell
      ).join(','))
    ].join('\n')

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=users_${format(new Date(), 'yyyy-MM-dd')}.csv`
      }
    })
  } catch (error) {
    console.error('Error exporting users:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}