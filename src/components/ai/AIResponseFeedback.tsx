"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { ThumbsUp, ThumbsDown, Star, Edit2 } from "lucide-react"
import apiClient from "@/lib/api-client"

interface AIResponseFeedbackProps {
  messageId?: string
  fineTuningDataId?: string
  aiResponse: string
  onFeedbackSubmit?: () => void
}

export function AIResponseFeedback({
  messageId,
  fineTuningDataId,
  aiResponse,
  onFeedbackSubmit
}: AIResponseFeedbackProps) {
  const { toast } = useToast()
  const [rating, setRating] = useState<number | null>(null)
  const [helpful, setHelpful] = useState<boolean | null>(null)
  const [showFeedbackForm, setShowFeedbackForm] = useState(false)
  const [feedbackText, setFeedbackText] = useState("")
  const [showEditForm, setShowEditForm] = useState(false)
  const [correctedResponse, setCorrectedResponse] = useState(aiResponse)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleRatingClick = async (star: number) => {
    setRating(star)
    await submitFeedback({ rating: star })
  }

  const handleHelpfulClick = async (isHelpful: boolean) => {
    setHelpful(isHelpful)
    await submitFeedback({ helpful: isHelpful })
  }

  const submitFeedback = async (data: any) => {
    setIsSubmitting(true)
    try {
      const response = await apiClient.post("/api/ai/feedback", {
        messageId,
        fineTuningDataId,
        ...data
      })

      if (response.data.success) {
        toast({
          title: "피드백 감사합니다!",
          description: response.data.tokensAwarded > 0 
            ? `${response.data.tokensAwarded} 토큰이 지급되었습니다.`
            : "피드백이 저장되었습니다.",
        })
        
        if (onFeedbackSubmit) {
          onFeedbackSubmit()
        }
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "피드백 저장 중 오류가 발생했습니다.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTextFeedbackSubmit = async () => {
    if (!feedbackText.trim()) return
    
    await submitFeedback({ feedbackText })
    setShowFeedbackForm(false)
    setFeedbackText("")
  }

  const handleCorrectedResponseSubmit = async () => {
    if (correctedResponse === aiResponse) return
    
    await submitFeedback({ correctedResponse })
    setShowEditForm(false)
  }

  return (
    <div className="mt-4 space-y-3">
      {/* 기본 피드백 버튼들 */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-gray-500 dark:text-gray-400">이 응답이 도움이 되었나요?</span>
        
        {/* 별점 평가 */}
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => handleRatingClick(star)}
              disabled={isSubmitting}
              className={`p-1 transition-colors ${
                rating && rating >= star
                  ? "text-yellow-500"
                  : "text-gray-300 dark:text-gray-600 hover:text-yellow-400"
              }`}
            >
              <Star className="w-4 h-4 fill-current" />
            </button>
          ))}
        </div>

        {/* 도움됨/안됨 버튼 */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={helpful === true ? "default" : "outline"}
            onClick={() => handleHelpfulClick(true)}
            disabled={isSubmitting}
            className="h-8"
          >
            <ThumbsUp className="w-3 h-3 mr-1" />
            도움됨
          </Button>
          <Button
            size="sm"
            variant={helpful === false ? "default" : "outline"}
            onClick={() => handleHelpfulClick(false)}
            disabled={isSubmitting}
            className="h-8"
          >
            <ThumbsDown className="w-3 h-3 mr-1" />
            도움안됨
          </Button>
        </div>

        {/* 추가 피드백 버튼 */}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowFeedbackForm(!showFeedbackForm)}
          className="h-8"
        >
          피드백 작성
        </Button>

        {/* 응답 수정 버튼 */}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowEditForm(!showEditForm)}
          className="h-8"
        >
          <Edit2 className="w-3 h-3 mr-1" />
          응답 수정
        </Button>
      </div>

      {/* 텍스트 피드백 폼 */}
      {showFeedbackForm && (
        <Card className="p-4">
          <h4 className="text-sm font-medium mb-2">추가 피드백</h4>
          <Textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="이 응답을 개선하기 위한 피드백을 작성해주세요..."
            className="mb-3"
            rows={3}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleTextFeedbackSubmit}
              disabled={!feedbackText.trim() || isSubmitting}
            >
              피드백 제출
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowFeedbackForm(false)
                setFeedbackText("")
              }}
            >
              취소
            </Button>
          </div>
        </Card>
      )}

      {/* 응답 수정 폼 */}
      {showEditForm && (
        <Card className="p-4">
          <h4 className="text-sm font-medium mb-2">응답 수정</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            더 나은 응답으로 수정해주세요. 이는 AI 학습에 사용됩니다.
          </p>
          <Textarea
            value={correctedResponse}
            onChange={(e) => setCorrectedResponse(e.target.value)}
            className="mb-3 font-mono text-sm"
            rows={10}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleCorrectedResponseSubmit}
              disabled={correctedResponse === aiResponse || isSubmitting}
            >
              수정 사항 저장
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowEditForm(false)
                setCorrectedResponse(aiResponse)
              }}
            >
              취소
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}