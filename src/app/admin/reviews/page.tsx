"use client"

import { useEffect, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ReviewCard } from "@/components/admin/ReviewCard"
import { Loader2, FileText } from "lucide-react"
import { GetPendingReviewsResponse } from "@/Features/Admin/ReviewManagement/GetPendingReviews"

export default function AdminReviewsPage() {
  const [activeTab, setActiveTab] = useState("PENDING")
  const [loading, setLoading] = useState(true)
  const [reviews, setReviews] = useState<GetPendingReviewsResponse | null>(null)
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetchReviews()
  }, [activeTab, page])

  const fetchReviews = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        status: activeTab,
      })

      const response = await fetch(`/api/admin/reviews?${params}`)
      if (!response.ok) {
        throw new Error("Failed to fetch reviews")
      }

      const data = await response.json()
      setReviews(data)
    } catch (error) {
      console.error("Error fetching reviews:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleReviewAction = async (reviewId: string, action: "approve" | "reject", data?: any) => {
    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data || {}),
      })

      if (!response.ok) {
        throw new Error(`Failed to ${action} review`)
      }

      // Refresh the list
      fetchReviews()
    } catch (error) {
      console.error(`Error ${action}ing review:`, error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">리뷰 관리</h1>
        <div className="text-sm text-gray-500">
          {reviews && `총 ${reviews.pagination.total}개의 리뷰`}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="PENDING">대기 중</TabsTrigger>
          <TabsTrigger value="APPROVED">승인됨</TabsTrigger>
          <TabsTrigger value="REJECTED">거절됨</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : reviews && reviews.reviews.length > 0 ? (
            <>
              <div className="space-y-4">
                {reviews.reviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    onApprove={(data) => handleReviewAction(review.id, "approve", data)}
                    onReject={(data) => handleReviewAction(review.id, "reject", data)}
                    showActions={activeTab === "PENDING"}
                  />
                ))}
              </div>

              {/* Pagination */}
              {reviews.pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    이전
                  </Button>
                  <span className="text-sm text-gray-500">
                    {page} / {reviews.pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= reviews.pagination.totalPages}
                  >
                    다음
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {activeTab === "PENDING" 
                  ? "검토 대기 중인 리뷰가 없습니다"
                  : activeTab === "APPROVED"
                  ? "승인된 리뷰가 없습니다"
                  : "거절된 리뷰가 없습니다"
                }
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}