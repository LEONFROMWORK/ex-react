"use client"

import { useState } from "react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { ReviewItem } from "@/Features/Admin/ReviewManagement/GetPendingReviews"
import { Star, Clock, Zap, CheckCircle, XCircle } from "lucide-react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"

interface ReviewCardProps {
  review: ReviewItem
  onApprove?: (data: { grantBonus: boolean; bonusTokens: number; comment?: string }) => void
  onReject?: (data: { reason: string }) => void
  showActions?: boolean
}

export function ReviewCard({ review, onApprove, onReject, showActions = false }: ReviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [grantBonus, setGrantBonus] = useState(true)
  const [processing, setProcessing] = useState(false)

  const handleApprove = async () => {
    if (!onApprove) return
    
    setProcessing(true)
    try {
      await onApprove({
        grantBonus,
        bonusTokens: 50,
        comment: "리뷰 감사합니다!",
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!onReject || !rejectReason.trim()) return
    
    setProcessing(true)
    try {
      await onReject({
        reason: rejectReason,
      })
      setShowRejectForm(false)
      setRejectReason("")
    } finally {
      setProcessing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const config = {
      PENDING: { label: "검토 대기", variant: "secondary" as const },
      APPROVED: { label: "승인됨", variant: "default" as const },
      REJECTED: { label: "거절됨", variant: "destructive" as const },
    }

    const { label, variant } = config[status as keyof typeof config] || config.PENDING

    return <Badge variant={variant}>{label}</Badge>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">{review.title}</h3>
              {getStatusBadge(review.status)}
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>{review.user.name} ({review.user.email})</span>
              <span>{format(new Date(review.createdAt), "yyyy.MM.dd HH:mm", { locale: ko })}</span>
            </div>
          </div>
          <div className="flex items-center">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={cn(
                  "h-4 w-4",
                  i < review.rating
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300"
                )}
              />
            ))}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div>
          <p className="text-gray-700 whitespace-pre-wrap">
            {isExpanded ? review.content : review.content.slice(0, 200)}
            {review.content.length > 200 && !isExpanded && "..."}
          </p>
          {review.content.length > 200 && (
            <Button
              variant="link"
              className="p-0 h-auto text-sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? "접기" : "더 보기"}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 pt-2">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <Clock className="h-4 w-4 text-gray-500" />
            </div>
            <p className="text-sm text-gray-500">절약 시간</p>
            <p className="font-semibold">{review.timeSaved || 0}분</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <Zap className="h-4 w-4 text-gray-500" />
            </div>
            <p className="text-sm text-gray-500">수정 오류</p>
            <p className="font-semibold">{review.errorsFixed || 0}개</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">사용 목적</p>
            <p className="font-semibold text-sm">{review.usageContext}</p>
          </div>
        </div>

        {showRejectForm && (
          <div className="space-y-3 p-4 border rounded-lg bg-red-50">
            <p className="text-sm font-medium">거절 사유</p>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="거절 사유를 입력하세요..."
              className="min-h-[80px]"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={handleReject}
                disabled={!rejectReason.trim() || processing}
              >
                거절 확인
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowRejectForm(false)
                  setRejectReason("")
                }}
                disabled={processing}
              >
                취소
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {showActions && (
        <CardFooter className="border-t pt-4">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`bonus-${review.id}`}
                checked={grantBonus}
                onCheckedChange={(checked) => setGrantBonus(!!checked)}
              />
              <label
                htmlFor={`bonus-${review.id}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                보너스 토큰 지급 (50 토큰)
              </label>
            </div>
            <div className="flex gap-2">
              <Button
                variant="default"
                onClick={handleApprove}
                disabled={processing}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                승인
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowRejectForm(!showRejectForm)}
                disabled={processing}
              >
                <XCircle className="mr-2 h-4 w-4" />
                거절
              </Button>
            </div>
          </div>
        </CardFooter>
      )}
    </Card>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}