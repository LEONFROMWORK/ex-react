"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { ReviewCard } from "@/components/review/ReviewCard"
import { ReviewSummary } from "@/components/review/ReviewSummary"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Star, PenSquare } from "lucide-react"
import Link from "next/link"

interface ReviewData {
  reviews: Array<{
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
  }>
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  summary: {
    averageRating: number
    totalReviews: number
    ratingDistribution: Record<string, number>
  }
}

function ReviewsContent() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ReviewData | null>(null)
  const [sortBy, setSortBy] = useState<"recent" | "rating" | "helpful">("recent")
  const [filterRating, setFilterRating] = useState<string>("all")
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetchReviews()
  }, [sortBy, filterRating, page])

  const fetchReviews = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        sortBy,
      })
      if (filterRating !== "all") {
        params.append("rating", filterRating)
      }

      const response = await fetch(`/api/reviews?${params}`)
      if (!response.ok) {
        throw new Error("Failed to fetch reviews")
      }
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error("Error fetching reviews:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading && !data) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="container mx-auto py-10">
        <p className="text-center text-muted-foreground">
          리뷰를 불러올 수 없습니다.
        </p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">고객 리뷰</h1>
          <p className="text-muted-foreground mt-2">
            실제 사용자들의 생생한 후기를 확인하세요
          </p>
        </div>
        <Button asChild>
          <Link href="/reviews/write">
            <PenSquare className="mr-2 h-4 w-4" />
            리뷰 작성하기
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <ReviewSummary summary={data.summary} />

          {/* Filters */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                평점 필터
              </label>
              <Select value={filterRating} onValueChange={setFilterRating}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 평점</SelectItem>
                  <SelectItem value="5">5점</SelectItem>
                  <SelectItem value="4">4점</SelectItem>
                  <SelectItem value="3">3점</SelectItem>
                  <SelectItem value="2">2점</SelectItem>
                  <SelectItem value="1">1점</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                정렬 기준
              </label>
              <Tabs value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="recent">최신순</TabsTrigger>
                  <TabsTrigger value="rating">평점순</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Reviews List */}
        <div className="lg:col-span-3 space-y-6">
          {data.reviews.length === 0 ? (
            <div className="text-center py-12">
              <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {filterRating !== "all" 
                  ? "선택한 평점의 리뷰가 없습니다."
                  : "아직 작성된 리뷰가 없습니다."}
              </p>
            </div>
          ) : (
            <>
              {data.reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}

              {/* Pagination */}
              {data.pagination.totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-8">
                  <Button
                    variant="outline"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    이전
                  </Button>
                  <span className="flex items-center px-4">
                    {page} / {data.pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
                    disabled={page === data.pagination.totalPages}
                  >
                    다음
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ReviewsPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto py-10">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    }>
      <ReviewsContent />
    </Suspense>
  )
}