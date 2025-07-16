import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return new Response('Unauthorized', { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { preferences: true }
    })

    const preferences = user?.preferences ? JSON.parse(user.preferences) : {
      notifications: {
        emailNotifications: true,
        emailAnalysisComplete: true,
        emailPaymentSuccess: true,
        emailLowTokens: true,
        emailAnnouncements: false,
        pushNotifications: false,
        pushAnalysisComplete: false,
        pushLowTokens: false
      },
      language: 'ko',
      theme: 'system'
    }

    return Response.json(preferences)
  } catch (error) {
    console.error('Error fetching preferences:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return new Response('Unauthorized', { status: 401 })
    }

    const updates = await request.json()
    
    // 현재 설정 가져오기
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { preferences: true }
    })

    const currentPreferences = user?.preferences ? JSON.parse(user.preferences) : {}
    const newPreferences = { ...currentPreferences, ...updates }

    // 설정 업데이트
    await prisma.user.update({
      where: { id: session.user.id },
      data: { preferences: JSON.stringify(newPreferences) }
    })

    return Response.json(newPreferences)
  } catch (error) {
    console.error('Error updating preferences:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}