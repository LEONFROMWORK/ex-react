"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { PaymentTable } from "@/components/admin/PaymentTable"
import { Loader2, Search, Download, CreditCard, TrendingUp, AlertCircle } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"

interface PaymentStats {
  total: number
  completed: number
  pending: number
  failed: number
  refunded: number
  totalAmount: number
  refundedAmount: number
}

export default function AdminPaymentsPage() {
  const [activeTab, setActiveTab] = useState("all")
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState<any[]>([])
  const [stats, setStats] = useState<PaymentStats | null>(null)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  
  const debouncedSearch = useDebounce(search, 500)

  useEffect(() => {
    fetchPayments()
  }, [activeTab, page, debouncedSearch])

  const fetchPayments = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        status: activeTab === "all" ? "" : activeTab,
      })
      
      if (debouncedSearch) {
        params.append("search", debouncedSearch)
      }

      const [paymentsRes, statsRes] = await Promise.all([
        fetch(`/api/admin/payments?${params}`),
        fetch("/api/admin/payments/stats"),
      ])

      if (!paymentsRes.ok || !statsRes.ok) {
        throw new Error("Failed to fetch payment data")
      }

      const paymentsData = await paymentsRes.json()
      const statsData = await statsRes.json()
      
      setPayments(paymentsData.payments || [])
      setStats(statsData)
    } catch (error) {
      console.error("Error fetching payments:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefund = async (paymentId: string, amount: number, reason: string) => {
    try {
      const response = await fetch(`/api/admin/payments/${paymentId}/refund`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount, reason }),
      })

      if (!response.ok) {
        throw new Error("Failed to process refund")
      }

      // Refresh the list
      fetchPayments()
    } catch (error) {
      console.error("Error processing refund:", error)
    }
  }

  const handleExport = async () => {
    try {
      const response = await fetch("/api/admin/payments/export")
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `payments_${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Error exporting payments:", error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">결제 관리</h1>
        <Button onClick={handleExport} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          내보내기
        </Button>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                총 결제
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.total.toLocaleString()}</p>
              <p className="text-sm text-gray-500">건</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                완료된 결제
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                ₩{stats.totalAmount.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500">{stats.completed}건</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                실패/취소
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              <p className="text-sm text-gray-500">건</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">환불</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                ₩{stats.refundedAmount.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500">{stats.refunded}건</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>결제 검색</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="주문 ID, 이메일로 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Payment List */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">전체</TabsTrigger>
          <TabsTrigger value="COMPLETED">완료</TabsTrigger>
          <TabsTrigger value="PENDING">대기</TabsTrigger>
          <TabsTrigger value="FAILED">실패</TabsTrigger>
          <TabsTrigger value="REFUNDED">환불</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <PaymentTable
              payments={payments}
              onRefund={handleRefund}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}