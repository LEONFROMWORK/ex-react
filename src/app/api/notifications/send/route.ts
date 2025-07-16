import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { NotificationService } from '@/lib/services/notification.service'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { type, data } = await request.json()
    const notificationService = NotificationService.getInstance()

    switch (type) {
      case 'analysis-complete':
        await notificationService.sendAnalysisComplete(
          session.user.id,
          data.fileId,
          data.fileName
        )
        break
        
      case 'payment-success':
        await notificationService.sendPaymentSuccess(
          session.user.id,
          data.amount,
          data.tier
        )
        break
        
      case 'low-tokens':
        await notificationService.sendLowTokensWarning(
          session.user.id,
          data.remainingTokens
        )
        break
        
      default:
        return new Response('Invalid notification type', { status: 400 })
    }

    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error('Error sending notification:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}