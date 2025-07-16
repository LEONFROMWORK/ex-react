"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useToast } from '@/components/ui/use-toast'
import { 
  MessageSquare, 
  Send, 
  Loader2, 
  Bug, 
  Lightbulb, 
  Heart,
  AlertCircle,
  Camera,
  X
} from 'lucide-react'

type FeedbackType = 'bug' | 'feature' | 'improvement' | 'other'
type FeedbackPriority = 'low' | 'medium' | 'high' | 'urgent'

interface FeedbackData {
  type: FeedbackType
  priority: FeedbackPriority
  subject: string
  description: string
  email?: string
  screenshot?: File
  metadata?: {
    currentPage?: string
    userAgent?: string
    timestamp?: string
  }
}

export function FeedbackWidget() {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [formData, setFormData] = useState<FeedbackData>({
    type: 'improvement',
    priority: 'medium',
    subject: '',
    description: '',
    email: ''
  })

  const feedbackTypeIcons = {
    bug: Bug,
    feature: Lightbulb,
    improvement: Heart,
    other: MessageSquare
  }

  const feedbackTypeLabels = {
    bug: '버그 신고',
    feature: '기능 제안',
    improvement: '개선 사항',
    other: '기타'
  }

  const priorityLabels = {
    low: '낮음',
    medium: '보통',
    high: '높음',
    urgent: '긴급'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.subject.trim() || !formData.description.trim()) {
      toast({
        title: "입력 오류",
        description: "제목과 내용을 모두 입력해주세요.",
        variant: "destructive"
      })
      return
    }

    setIsSubmitting(true)

    try {
      const submitData = {
        ...formData,
        metadata: {
          currentPage: window.location.pathname,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      }

      // FormData로 변환 (스크린샷 포함)
      const formDataToSend = new FormData()
      formDataToSend.append('data', JSON.stringify(submitData))
      if (screenshot) {
        formDataToSend.append('screenshot', screenshot)
      }

      const response = await fetch('/api/feedback', {
        method: 'POST',
        body: formDataToSend
      })

      if (!response.ok) {
        throw new Error('Failed to submit feedback')
      }

      toast({
        title: "피드백이 전송되었습니다",
        description: "소중한 의견 감사합니다. 빠른 시일 내에 검토하겠습니다."
      })

      // 폼 초기화
      setFormData({
        type: 'improvement',
        priority: 'medium',
        subject: '',
        description: '',
        email: ''
      })
      setScreenshot(null)
      setIsOpen(false)
    } catch (error) {
      toast({
        title: "전송 실패",
        description: "피드백 전송 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const captureScreenshot = async () => {
    try {
      // 실제로는 html2canvas 등의 라이브러리 사용
      toast({
        title: "스크린샷 기능",
        description: "스크린샷 캡처 기능은 준비 중입니다."
      })
    } catch (error) {
      console.error('Screenshot capture failed:', error)
    }
  }

  return (
    <>
      {/* 플로팅 피드백 버튼 */}
      <Button
        className="fixed bottom-6 right-6 rounded-full shadow-lg z-50"
        size="icon"
        onClick={() => setIsOpen(true)}
      >
        <MessageSquare className="h-5 w-5" />
      </Button>

      {/* 피드백 다이얼로그 */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>피드백 보내기</DialogTitle>
            <DialogDescription>
              서비스 개선을 위한 소중한 의견을 들려주세요
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 피드백 유형 */}
            <div className="space-y-2">
              <Label>피드백 유형</Label>
              <RadioGroup
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value as FeedbackType })}
              >
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(feedbackTypeLabels).map(([value, label]) => {
                    const Icon = feedbackTypeIcons[value as FeedbackType]
                    return (
                      <label
                        key={value}
                        className={`flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-muted ${
                          formData.type === value ? 'border-primary bg-primary/5' : ''
                        }`}
                      >
                        <RadioGroupItem value={value} className="sr-only" />
                        <Icon className="h-4 w-4" />
                        <span className="text-sm">{label}</span>
                      </label>
                    )
                  })}
                </div>
              </RadioGroup>
            </div>

            {/* 우선순위 */}
            <div className="space-y-2">
              <Label>우선순위</Label>
              <RadioGroup
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value as FeedbackPriority })}
                className="flex space-x-4"
              >
                {Object.entries(priorityLabels).map(([value, label]) => (
                  <label key={value} className="flex items-center space-x-2 cursor-pointer">
                    <RadioGroupItem value={value} />
                    <span className={`text-sm ${
                      value === 'urgent' ? 'text-red-600 font-semibold' :
                      value === 'high' ? 'text-orange-600' : ''
                    }`}>
                      {label}
                    </span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            {/* 제목 */}
            <div className="space-y-2">
              <Label htmlFor="subject">제목 *</Label>
              <Input
                id="subject"
                placeholder="간단한 제목을 입력해주세요"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                required
              />
            </div>

            {/* 설명 */}
            <div className="space-y-2">
              <Label htmlFor="description">상세 설명 *</Label>
              <Textarea
                id="description"
                placeholder="자세한 내용을 입력해주세요. 버그의 경우 재현 방법을 포함해주시면 도움이 됩니다."
                rows={5}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            {/* 이메일 */}
            <div className="space-y-2">
              <Label htmlFor="email">이메일 (선택)</Label>
              <Input
                id="email"
                type="email"
                placeholder="답변을 받으실 이메일 주소"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                이메일을 입력하시면 처리 결과를 알려드립니다
              </p>
            </div>

            {/* 스크린샷 */}
            <div className="space-y-2">
              <Label>스크린샷 (선택)</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={captureScreenshot}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  화면 캡처
                </Button>
                <Input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="screenshot-upload"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) setScreenshot(file)
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('screenshot-upload')?.click()}
                >
                  파일 선택
                </Button>
              </div>
              {screenshot && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{screenshot.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4"
                    onClick={() => setScreenshot(null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* 제출 버튼 */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
              >
                취소
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    전송 중...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    피드백 전송
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}