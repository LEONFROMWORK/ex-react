"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Star, Loader2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface ReviewFormProps {
  onSuccess?: () => void
}

export function ReviewForm({ onSuccess }: ReviewFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    rating: 5,
    title: "",
    content: "",
    usageContext: "",
    timeSaved: 0,
    errorsFixed: 0,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.content.length < 20) {
      toast({
        title: "내용이 너무 짧습니다",
        description: "최소 20자 이상 작성해주세요.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    
    try {
      const response = await fetch("/api/reviews/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || "리뷰 등록에 실패했습니다.")
      }

      toast({
        title: "리뷰가 등록되었습니다",
        description: data.message,
      })

      if (onSuccess) {
        onSuccess()
      } else {
        router.push("/reviews")
      }
    } catch (error: any) {
      toast({
        title: "오류 발생",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>이용 후기 작성</CardTitle>
        <CardDescription>
          서비스 이용 경험을 공유해주세요. 승인된 리뷰에는 50 토큰이 지급됩니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Rating */}
          <div className="space-y-2">
            <Label>평점</Label>
            <div className="flex items-center gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setFormData({ ...formData, rating: i + 1 })}
                  className="focus:outline-none"
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      i < formData.rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300 hover:text-yellow-400"
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-lg font-medium">{formData.rating}점</span>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">제목 *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="한 줄로 요약해주세요"
              maxLength={100}
              required
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">상세 내용 * (최소 20자)</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="어떤 점이 좋았는지, 어떻게 도움이 되었는지 자세히 알려주세요"
              rows={5}
              maxLength={1000}
              required
            />
            <p className="text-sm text-muted-foreground text-right">
              {formData.content.length}/1000
            </p>
          </div>

          {/* Usage Context */}
          <div className="space-y-2">
            <Label htmlFor="usageContext">사용 환경 *</Label>
            <Textarea
              id="usageContext"
              value={formData.usageContext}
              onChange={(e) => setFormData({ ...formData, usageContext: e.target.value })}
              placeholder="예: 월간 매출 보고서 작성, 재고 관리 엑셀 오류 수정 등"
              rows={2}
              maxLength={500}
              required
            />
          </div>

          {/* Time Saved */}
          <div className="space-y-2">
            <Label htmlFor="timeSaved">절약된 시간 (분)</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[formData.timeSaved]}
                onValueChange={(value) => setFormData({ ...formData, timeSaved: value[0] })}
                max={300}
                step={10}
                className="flex-1"
              />
              <span className="w-20 text-right font-medium">
                {formData.timeSaved === 0 ? "-" : `${formData.timeSaved}분`}
              </span>
            </div>
          </div>

          {/* Errors Fixed */}
          <div className="space-y-2">
            <Label htmlFor="errorsFixed">수정된 오류 개수</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[formData.errorsFixed]}
                onValueChange={(value) => setFormData({ ...formData, errorsFixed: value[0] })}
                max={100}
                step={1}
                className="flex-1"
              />
              <span className="w-20 text-right font-medium">
                {formData.errorsFixed === 0 ? "-" : `${formData.errorsFixed}개`}
              </span>
            </div>
          </div>

          <Alert>
            <AlertDescription>
              • 진실되고 구체적인 후기를 작성해주세요<br />
              • 광고, 홍보성 내용은 승인되지 않습니다<br />
              • 부적절한 내용은 삭제될 수 있습니다
            </AlertDescription>
          </Alert>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                등록 중...
              </>
            ) : (
              "리뷰 등록하기"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}