"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { CreditCard, RefreshCw } from "lucide-react"

interface PaymentTableProps {
  payments: any[]
  onRefund: (paymentId: string, amount: number, reason: string) => void
}

export function PaymentTable({ payments, onRefund }: PaymentTableProps) {
  const [refundDialog, setRefundDialog] = useState<{
    open: boolean
    payment: any | null
  }>({ open: false, payment: null })
  const [refundAmount, setRefundAmount] = useState("")
  const [refundReason, setRefundReason] = useState("")
  const [processing, setProcessing] = useState(false)

  const handleRefund = async () => {
    if (!refundDialog.payment || !refundAmount || !refundReason) return

    setProcessing(true)
    try {
      await onRefund(
        refundDialog.payment.id,
        parseFloat(refundAmount),
        refundReason
      )
      setRefundDialog({ open: false, payment: null })
      setRefundAmount("")
      setRefundReason("")
    } finally {
      setProcessing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const config = {
      PENDING: { label: "대기", variant: "secondary" as const },
      COMPLETED: { label: "완료", variant: "default" as const },
      FAILED: { label: "실패", variant: "destructive" as const },
      CANCELED: { label: "취소", variant: "outline" as const },
      PARTIALLY_REFUNDED: { label: "부분환불", variant: "secondary" as const },
      EXPIRED: { label: "만료", variant: "outline" as const },
    }

    const { label, variant } = config[status as keyof typeof config] || {
      label: status,
      variant: "outline" as const,
    }

    return <Badge variant={variant}>{label}</Badge>
  }

  const getPaymentMethodLabel = (payment: any) => {
    if (payment.metadata?.method) {
      return payment.metadata.method
    }
    return "카드"
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>주문 ID</TableHead>
              <TableHead>사용자</TableHead>
              <TableHead>금액</TableHead>
              <TableHead>결제 방법</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>결제일</TableHead>
              <TableHead className="text-right">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell className="font-mono text-sm">
                  {payment.orderId}
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{payment.user?.name}</p>
                    <p className="text-sm text-gray-500">{payment.user?.email}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">
                      ₩{payment.amount.toLocaleString()}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-gray-400" />
                    <span>{getPaymentMethodLabel(payment)}</span>
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(payment.status)}</TableCell>
                <TableCell>
                  {payment.completedAt ? (
                    format(new Date(payment.completedAt), "yyyy.MM.dd HH:mm", {
                      locale: ko,
                    })
                  ) : (
                    <span className="text-gray-500">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {payment.status === "COMPLETED" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setRefundDialog({ open: true, payment })
                      }
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      환불
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Refund Dialog */}
      <Dialog
        open={refundDialog.open}
        onOpenChange={(open) =>
          setRefundDialog({ open, payment: refundDialog.payment })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>환불 처리</DialogTitle>
            <DialogDescription>
              환불 금액과 사유를 입력해주세요.
            </DialogDescription>
          </DialogHeader>
          {refundDialog.payment && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">주문 ID</p>
                <p className="font-mono">{refundDialog.payment.orderId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">원 결제 금액</p>
                <p className="font-medium">
                  ₩{refundDialog.payment.amount.toLocaleString()}
                </p>
              </div>
              <div className="space-y-2">
                <label htmlFor="refundAmount" className="text-sm font-medium">
                  환불 금액
                </label>
                <Input
                  id="refundAmount"
                  type="number"
                  placeholder="환불할 금액을 입력하세요"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  max={refundDialog.payment.amount}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="refundReason" className="text-sm font-medium">
                  환불 사유
                </label>
                <Textarea
                  id="refundReason"
                  placeholder="환불 사유를 입력하세요"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRefundDialog({ open: false, payment: null })
                setRefundAmount("")
                setRefundReason("")
              }}
              disabled={processing}
            >
              취소
            </Button>
            <Button
              onClick={handleRefund}
              disabled={
                !refundAmount ||
                !refundReason ||
                processing ||
                parseFloat(refundAmount) <= 0 ||
                parseFloat(refundAmount) > refundDialog.payment?.amount
              }
            >
              {processing ? "처리 중..." : "환불 처리"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}