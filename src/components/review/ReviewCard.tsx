"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Star, Clock, CheckCircle2, Calendar } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ko } from "date-fns/locale"

interface ReviewCardProps {
  review: {
    id: string
    rating: number
    title: string
    content: string
    usageContext: string
    timeSaved: number | null
    errorsFixed: number | null
    createdAt: Date
    user: {
      name: string
      isVerified: boolean
    }
    stats: {
      analysisCount: number
      memberSince: Date
    }
  }
}

export function ReviewCard({ review }: ReviewCardProps) {
  const initials = review.user.name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold">{review.user.name}</p>
                {review.user.isVerified && (
                  <CheckCircle2 className="h-4 w-4 text-blue-500" />
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>분석 {review.stats.analysisCount}회</span>
                <span>
                  {formatDistanceToNow(new Date(review.stats.memberSince), {
                    addSuffix: true,
                    locale: ko,
                  })} 가입
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 mb-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < review.rating
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(review.createdAt), {
                addSuffix: true,
                locale: ko,
              })}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold text-lg mb-2">{review.title}</h3>
          <p className="text-muted-foreground whitespace-pre-wrap">
            {review.content}
          </p>
        </div>

        <div className="bg-muted p-3 rounded-lg">
          <p className="text-sm font-medium mb-1">사용 환경</p>
          <p className="text-sm text-muted-foreground">{review.usageContext}</p>
        </div>

        <div className="flex items-center gap-6">
          {review.timeSaved && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                <strong>{review.timeSaved}분</strong> 절약
              </span>
            </div>
          )}
          {review.errorsFixed && (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                <strong>{review.errorsFixed}개</strong> 오류 수정
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}