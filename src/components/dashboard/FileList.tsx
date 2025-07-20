"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  FileSpreadsheet, 
  Download, 
  Eye, 
  MoreVertical,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface FileData {
  id: string
  originalName: string
  size: number
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  createdAt: Date
  completedAt?: Date
  errorCount?: number
  fixedCount?: number
  tokensUsed?: number
}

interface FileListProps {
  files: FileData[]
  onRefresh?: () => void
}

const statusIcons = {
  PENDING: Clock,
  PROCESSING: Loader2,
  COMPLETED: CheckCircle2,
  FAILED: XCircle
}

const statusLabels = {
  PENDING: '대기 중',
  PROCESSING: '처리 중',
  COMPLETED: '완료',
  FAILED: '실패'
}

const statusColors = {
  PENDING: 'secondary',
  PROCESSING: 'default',
  COMPLETED: 'outline',
  FAILED: 'destructive'
} as const

export function FileList({ files, onRefresh }: FileListProps) {
  const router = useRouter()
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())

  const handleSelectFile = (fileId: string) => {
    const newSelected = new Set(selectedFiles)
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId)
    } else {
      newSelected.add(fileId)
    }
    setSelectedFiles(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set())
    } else {
      setSelectedFiles(new Set(files.map(f => f.id)))
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>업로드한 파일</CardTitle>
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              새로고침
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={selectedFiles.size === files.length && files.length > 0}
                    onChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>파일명</TableHead>
                <TableHead>크기</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>오류 수정</TableHead>
                <TableHead>토큰 사용</TableHead>
                <TableHead>업로드 시간</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.map((file) => {
                const StatusIcon = statusIcons[file.status]
                const isProcessing = file.status === 'PROCESSING'
                
                return (
                  <TableRow 
                    key={file.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/dashboard/files/${file.id}`)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={selectedFiles.has(file.id)}
                        onChange={() => handleSelectFile(file.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{file.originalName}</span>
                      </div>
                    </TableCell>
                    <TableCell>{formatFileSize(file.size)}</TableCell>
                    <TableCell>
                      <Badge variant={statusColors[file.status]} className="flex items-center gap-1 w-fit">
                        <StatusIcon className={`h-3 w-3 ${isProcessing ? 'animate-spin' : ''}`} />
                        {statusLabels[file.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {file.errorCount !== undefined && file.fixedCount !== undefined ? (
                        <span className="text-sm">
                          {file.fixedCount}/{file.errorCount}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {file.tokensUsed ? (
                        <span className="text-sm">{file.tokensUsed}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {format(file.createdAt, 'MM/dd HH:mm', { locale: ko })}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>작업</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/dashboard/files/${file.id}`)
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            상세 보기
                          </DropdownMenuItem>
                          {file.status === 'COMPLETED' && (
                            <>
                              <DropdownMenuItem>
                                <Download className="mr-2 h-4 w-4" />
                                원본 다운로드
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Download className="mr-2 h-4 w-4" />
                                수정본 다운로드
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
              
              {files.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">업로드한 파일이 없습니다</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {selectedFiles.size > 0 && (
          <div className="mt-4 flex items-center justify-between border-t pt-4">
            <p className="text-sm text-muted-foreground">
              {selectedFiles.size}개 파일 선택됨
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                선택 항목 다운로드
              </Button>
              <Button variant="outline" size="sm" className="text-destructive">
                선택 항목 삭제
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}