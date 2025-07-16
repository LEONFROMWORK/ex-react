"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Bell, Mail, Smartphone, Loader2 } from 'lucide-react'

interface NotificationPreferences {
  emailNotifications: boolean
  emailAnalysisComplete: boolean
  emailPaymentSuccess: boolean
  emailLowTokens: boolean
  emailAnnouncements: boolean
  pushNotifications: boolean
  pushAnalysisComplete: boolean
  pushLowTokens: boolean
}

export function NotificationSettings() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailNotifications: true,
    emailAnalysisComplete: true,
    emailPaymentSuccess: true,
    emailLowTokens: true,
    emailAnnouncements: false,
    pushNotifications: false,
    pushAnalysisComplete: false,
    pushLowTokens: false
  })

  useEffect(() => {
    fetchPreferences()
  }, [])

  const fetchPreferences = async () => {
    try {
      const response = await fetch('/api/user/preferences')
      if (response.ok) {
        const data = await response.json()
        if (data.notifications) {
          setPreferences(data.notifications)
        }
      }
    } catch (error) {
      console.error('Error fetching preferences:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences(prev => {
      const newPrefs = { ...prev, [key]: !prev[key] }
      
      // 메인 토글이 꺼지면 하위 옵션도 모두 끄기
      if (key === 'emailNotifications' && !newPrefs.emailNotifications) {
        newPrefs.emailAnalysisComplete = false
        newPrefs.emailPaymentSuccess = false
        newPrefs.emailLowTokens = false
        newPrefs.emailAnnouncements = false
      }
      
      if (key === 'pushNotifications' && !newPrefs.pushNotifications) {
        newPrefs.pushAnalysisComplete = false
        newPrefs.pushLowTokens = false
      }
      
      return newPrefs
    })
  }

  const savePreferences = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifications: preferences })
      })

      if (response.ok) {
        toast({
          title: "설정이 저장되었습니다",
          description: "알림 설정이 업데이트되었습니다."
        })
      } else {
        throw new Error('Failed to save preferences')
      }
    } catch (error) {
      toast({
        title: "오류가 발생했습니다",
        description: "설정을 저장하는 중 문제가 발생했습니다.",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          알림 설정
        </CardTitle>
        <CardDescription>
          서비스 알림 수신 방법을 설정하세요
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 이메일 알림 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-notifications" className="text-base font-semibold flex items-center gap-2">
                <Mail className="h-4 w-4" />
                이메일 알림
              </Label>
              <p className="text-sm text-muted-foreground">
                중요한 알림을 이메일로 받습니다
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={preferences.emailNotifications}
              onCheckedChange={() => handleToggle('emailNotifications')}
            />
          </div>

          {preferences.emailNotifications && (
            <div className="ml-6 space-y-3 border-l-2 pl-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="email-analysis" className="text-sm">
                  파일 분석 완료
                </Label>
                <Switch
                  id="email-analysis"
                  checked={preferences.emailAnalysisComplete}
                  onCheckedChange={() => handleToggle('emailAnalysisComplete')}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="email-payment" className="text-sm">
                  결제 관련 알림
                </Label>
                <Switch
                  id="email-payment"
                  checked={preferences.emailPaymentSuccess}
                  onCheckedChange={() => handleToggle('emailPaymentSuccess')}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="email-tokens" className="text-sm">
                  토큰 부족 알림
                </Label>
                <Switch
                  id="email-tokens"
                  checked={preferences.emailLowTokens}
                  onCheckedChange={() => handleToggle('emailLowTokens')}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="email-announcements" className="text-sm">
                  서비스 공지사항
                </Label>
                <Switch
                  id="email-announcements"
                  checked={preferences.emailAnnouncements}
                  onCheckedChange={() => handleToggle('emailAnnouncements')}
                />
              </div>
            </div>
          )}
        </div>

        {/* 푸시 알림 */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="push-notifications" className="text-base font-semibold flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                푸시 알림
              </Label>
              <p className="text-sm text-muted-foreground">
                브라우저 푸시 알림을 받습니다
              </p>
            </div>
            <Switch
              id="push-notifications"
              checked={preferences.pushNotifications}
              onCheckedChange={() => handleToggle('pushNotifications')}
            />
          </div>

          {preferences.pushNotifications && (
            <div className="ml-6 space-y-3 border-l-2 pl-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="push-analysis" className="text-sm">
                  파일 분석 완료
                </Label>
                <Switch
                  id="push-analysis"
                  checked={preferences.pushAnalysisComplete}
                  onCheckedChange={() => handleToggle('pushAnalysisComplete')}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="push-tokens" className="text-sm">
                  토큰 부족 알림
                </Label>
                <Switch
                  id="push-tokens"
                  checked={preferences.pushLowTokens}
                  onCheckedChange={() => handleToggle('pushLowTokens')}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={savePreferences} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                저장 중...
              </>
            ) : (
              '설정 저장'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}