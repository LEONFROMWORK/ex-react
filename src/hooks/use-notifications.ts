import { useCallback } from 'react'
import { useToast } from '@/components/ui/use-toast'

export function useNotifications() {
  const { toast } = useToast()

  // 브라우저 푸시 알림 권한 요청
  const requestPushPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      toast({
        title: "푸시 알림 미지원",
        description: "이 브라우저는 푸시 알림을 지원하지 않습니다.",
        variant: "destructive"
      })
      return false
    }

    if (Notification.permission === 'granted') {
      return true
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        toast({
          title: "푸시 알림 활성화",
          description: "이제 푸시 알림을 받을 수 있습니다."
        })
        return true
      }
    }

    toast({
      title: "푸시 알림 거부됨",
      description: "브라우저 설정에서 알림 권한을 변경할 수 있습니다.",
      variant: "destructive"
    })
    return false
  }, [toast])

  // 로컬 푸시 알림 표시
  const showPushNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/icon-192x192.png',
        badge: '/icon-72x72.png',
        ...options
      })
    }
  }, [])

  // 서버에 알림 전송 요청
  const sendNotification = useCallback(async (
    type: 'analysis-complete' | 'payment-success' | 'low-tokens',
    data: Record<string, any>
  ) => {
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data })
      })

      if (!response.ok) {
        throw new Error('Failed to send notification')
      }
    } catch (error) {
      console.error('Error sending notification:', error)
    }
  }, [])

  return {
    requestPushPermission,
    showPushNotification,
    sendNotification
  }
}