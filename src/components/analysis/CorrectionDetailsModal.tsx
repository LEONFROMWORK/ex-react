"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CorrectionDetails } from './CorrectionDetails'
import { Button } from '@/components/ui/button'
import { Download, X } from 'lucide-react'

interface CorrectionDetailsModalProps {
  open: boolean
  onClose: () => void
  analysisData: {
    fileName: string
    totalErrors: number
    fixedErrors: number
    corrections: any[]
  }
  onDownloadReport?: () => void
}

export function CorrectionDetailsModal({
  open,
  onClose,
  analysisData,
  onDownloadReport
}: CorrectionDetailsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>수정 내역 상세 보기</DialogTitle>
            <div className="flex items-center gap-2">
              {onDownloadReport && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onDownloadReport}
                >
                  <Download className="h-4 w-4 mr-2" />
                  리포트 다운로드
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
          <CorrectionDetails
            fileName={analysisData.fileName}
            totalErrors={analysisData.totalErrors}
            fixedErrors={analysisData.fixedErrors}
            corrections={analysisData.corrections}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}