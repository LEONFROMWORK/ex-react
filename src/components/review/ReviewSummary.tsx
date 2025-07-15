"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Star } from "lucide-react"

interface ReviewSummaryProps {
  summary: {
    averageRating: number
    totalReviews: number
    ratingDistribution: Record<string, number>
  }
}

export function ReviewSummary({ summary }: ReviewSummaryProps) {
  const maxCount = Math.max(...Object.values(summary.ratingDistribution))

  return (
    <Card>
      <CardHeader>
        <CardTitle>고객 평점</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Average Rating */}
        <div className="text-center">
          <div className="text-4xl font-bold mb-2">
            {summary.averageRating.toFixed(1)}
          </div>
          <div className="flex items-center justify-center gap-1 mb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-5 w-5 ${
                  i < Math.round(summary.averageRating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300"
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            총 {summary.totalReviews.toLocaleString()}개의 리뷰
          </p>
        </div>

        {/* Rating Distribution */}
        <div className="space-y-3">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = summary.ratingDistribution[rating] || 0
            const percentage = summary.totalReviews > 0
              ? (count / summary.totalReviews) * 100
              : 0

            return (
              <div key={rating} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-12">
                  <span className="text-sm font-medium">{rating}</span>
                  <Star className="h-3 w-3 fill-current text-yellow-400" />
                </div>
                <div className="flex-1">
                  <Progress
                    value={maxCount > 0 ? (count / maxCount) * 100 : 0}
                    className="h-2"
                  />
                </div>
                <div className="text-sm text-muted-foreground w-20 text-right">
                  {count}개 ({percentage.toFixed(0)}%)
                </div>
              </div>
            )
          })}
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <p className="text-sm text-muted-foreground">가장 많은 평점</p>
            <p className="text-lg font-semibold">
              {Object.entries(summary.ratingDistribution)
                .sort(([, a], [, b]) => b - a)[0]?.[0] || "-"}점
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">만족도</p>
            <p className="text-lg font-semibold">
              {summary.totalReviews > 0
                ? Math.round(
                    ((summary.ratingDistribution[4] || 0) + 
                     (summary.ratingDistribution[5] || 0)) /
                    summary.totalReviews * 100
                  )
                : 0}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}