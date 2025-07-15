"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ReviewForm } from "@/components/review/ReviewForm"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle2, Clock, FileText, Loader2 } from "lucide-react"
import Link from "next/link"

interface MyReviewData {
  hasReview: boolean
  canWriteReview: boolean
  minimumUsageRequired: number
  currentUsageCount: number
  review: {
    id: string
    rating: number
    title: string
    content: string
    status: "PENDING" | "APPROVED" | "REJECTED"
    createdAt: Date
    rejectionReason?: string
  } | null
}

export default function WriteReviewPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<MyReviewData | null>(null)

  useEffect(() => {
    fetchMyReviewStatus()
  }, [])

  const fetchMyReviewStatus = async () => {
    try {
      const response = await fetch("/api/reviews/my")
      if (!response.ok) {
        throw new Error("Failed to fetch review status")
      }
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error("Error fetching review status:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto py-10">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="container max-w-4xl mx-auto py-10">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>
            리뷰 상태를 확인할 수 없습니다.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // User has already written a review
  if (data.hasReview && data.review) {
    const statusConfig = {
      PENDING: {
        icon: Clock,
        title: "리뷰 검토 중",
        description: "작성하신 리뷰를 검토하고 있습니다. 승인되면 50 토큰이 지급됩니다.",
        variant: "secondary" as const,
      },
      APPROVED: {
        icon: CheckCircle2,
        title: "리뷰가 승인되었습니다",
        description: "리뷰가 성공적으로 게시되었으며, 보너스 토큰이 지급되었습니다.",
        variant: "default" as const,
      },
      REJECTED: {
        icon: AlertCircle,
        title: "리뷰가 거절되었습니다",
        description: data.review.rejectionReason || "리뷰 내용이 가이드라인에 부합하지 않습니다.",
        variant: "destructive" as const,
      },
    }

    const config = statusConfig[data.review.status]
    const Icon = config.icon

    return (
      <div className="container max-w-4xl mx-auto py-10">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Icon className="h-6 w-6" />
              <CardTitle>{config.title}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertDescription>{config.description}</AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">{data.review.title}</h3>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={config.variant}>
                    {data.review.status === "PENDING" && "검토 중"}
                    {data.review.status === "APPROVED" && "승인됨"}
                    {data.review.status === "REJECTED" && "거절됨"}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    평점: {data.review.rating}점
                  </span>
                </div>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {data.review.content}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button asChild variant="outline">
                <Link href="/reviews">
                  <FileText className="mr-2 h-4 w-4" />
                  모든 리뷰 보기
                </Link>
              </Button>
              {data.review.status === "APPROVED" && (
                <Button asChild>
                  <Link href={`/reviews#${data.review.id}`}>
                    내 리뷰 보기
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // User cannot write review yet
  if (!data.canWriteReview) {
    const remainingUsage = data.minimumUsageRequired - data.currentUsageCount

    return (
      <div className="container max-w-4xl mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle>아직 리뷰를 작성할 수 없습니다</CardTitle>
            <CardDescription>
              리뷰 작성을 위해서는 최소 {data.minimumUsageRequired}회 이상 서비스를 이용해주세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">현재 이용 횟수</p>
                  <p className="text-2xl font-bold">{data.currentUsageCount}회</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">필요 횟수</p>
                  <p className="text-lg">{data.minimumUsageRequired}회</p>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {remainingUsage}회 더 이용하시면 리뷰를 작성할 수 있습니다.
                </AlertDescription>
              </Alert>

              <Button asChild className="w-full">
                <Link href="/dashboard/upload">
                  파일 분석하러 가기
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // User can write review
  return (
    <div className="container max-w-4xl mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">이용 후기 작성</h1>
        <p className="text-muted-foreground mt-2">
          서비스 이용 경험을 공유해주세요
        </p>
      </div>

      <ReviewForm />
    </div>
  )
}