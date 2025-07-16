"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ComparisonView } from './ComparisonView'
import { Button } from '@/components/ui/button'
import { X, Download } from 'lucide-react'

interface ComparisonModalProps {
  open: boolean
  onClose: () => void
  originalData: any
  correctedData: any
  fileName: string
  onDownload?: () => void
}

export function ComparisonModal({
  open,
  onClose,
  originalData,
  correctedData,
  fileName,
  onDownload
}: ComparisonModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>
              원본/수정본 비교 - {fileName}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {onDownload && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onDownload}
                >
                  <Download className="h-4 w-4 mr-2" />
                  비교 리포트
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
          <ComparisonView
            originalData={originalData}
            correctedData={correctedData}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}