"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/components/ui/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { 
  History, 
  Download, 
  RotateCcw, 
  GitCompare,
  Info,
  Clock,
  User,
  FileText,
  Hash,
  Tag,
  ChevronRight,
  Check,
  X,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface FileVersion {
  id: string
  versionNumber: number
  fileName: string
  fileSize: number
  checksum: string
  changes?: string
  createdBy: string
  createdByUser?: {
    id: string
    name: string
    email: string
  }
  tags?: string[]
  createdAt: Date
}

interface FileVersionHistoryProps {
  fileId: string
  currentVersion?: number
  onRestore?: (versionId: string) => Promise<void>
  onCompare?: (version1: string, version2: string) => void
}

export function FileVersionHistory({
  fileId,
  currentVersion = 1,
  onRestore,
  onCompare
}: FileVersionHistoryProps) {
  const { toast } = useToast()
  const [versions, setVersions] = useState<FileVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVersions, setSelectedVersions] = useState<string[]>([])
  const [restoreDialog, setRestoreDialog] = useState<{ open: boolean; version: FileVersion | null }>({
    open: false,
    version: null
  })
  const [restoringVersion, setRestoringVersion] = useState(false)
  const [downloadingVersion, setDownloadingVersion] = useState<string | null>(null)

  useEffect(() => {
    fetchVersionHistory()
  }, [fileId])

  const fetchVersionHistory = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/files/${fileId}/versions`)
      if (!response.ok) throw new Error('Failed to fetch version history')
      
      const data = await response.json()
      setVersions(data.versions)
    } catch (error) {
      toast({
        title: "오류",
        description: "버전 히스토리를 불러오는데 실패했습니다.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadVersion = async (versionId: string) => {
    setDownloadingVersion(versionId)
    
    try {
      const response = await fetch(`/api/files/versions/${versionId}/download`)
      if (!response.ok) throw new Error('Failed to get download URL')
      
      const { url } = await response.json()
      
      // 다운로드 시작
      const a = document.createElement('a')
      a.href = url
      a.download = `version_${versions.find(v => v.id === versionId)?.versionNumber}.xlsx`
      a.click()
      
      toast({
        title: "다운로드 시작",
        description: "버전 파일을 다운로드하고 있습니다."
      })
    } catch (error) {
      toast({
        title: "다운로드 실패",
        description: "파일 다운로드에 실패했습니다.",
        variant: "destructive"
      })
    } finally {
      setDownloadingVersion(null)
    }
  }

  const handleRestoreVersion = async () => {
    if (!restoreDialog.version || !onRestore) return
    
    setRestoringVersion(true)
    
    try {
      await onRestore(restoreDialog.version.id)
      
      toast({
        title: "복원 성공",
        description: `버전 ${restoreDialog.version.versionNumber}이(가) 성공적으로 복원되었습니다.`
      })
      
      setRestoreDialog({ open: false, version: null })
      fetchVersionHistory()
    } catch (error) {
      toast({
        title: "복원 실패",
        description: "버전 복원에 실패했습니다.",
        variant: "destructive"
      })
    } finally {
      setRestoringVersion(false)
    }
  }

  const handleCompareVersions = () => {
    if (selectedVersions.length === 2 && onCompare) {
      onCompare(selectedVersions[0], selectedVersions[1])
    }
  }

  const toggleVersionSelection = (versionId: string) => {
    setSelectedVersions(prev => {
      if (prev.includes(versionId)) {
        return prev.filter(id => id !== versionId)
      }
      if (prev.length >= 2) {
        return [prev[1], versionId]
      }
      return [...prev, versionId]
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <History className="h-5 w-5" />
            버전 히스토리
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            현재 버전: v{currentVersion}
          </p>
        </div>
        {selectedVersions.length === 2 && (
          <Button onClick={handleCompareVersions}>
            <GitCompare className="h-4 w-4 mr-2" />
            버전 비교
          </Button>
        )}
      </div>

      {/* 버전 선택 안내 */}
      {onCompare && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            비교할 두 버전을 선택하세요. 최대 2개까지 선택 가능합니다.
          </AlertDescription>
        </Alert>
      )}

      {/* 버전 목록 */}
      <ScrollArea className="h-[600px] rounded-md border p-4">
        <div className="space-y-4">
          {versions.map((version, index) => {
            const isSelected = selectedVersions.includes(version.id)
            const isCurrent = version.versionNumber === currentVersion
            
            return (
              <Card
                key={version.id}
                className={`cursor-pointer transition-all ${
                  isSelected ? 'ring-2 ring-primary' : ''
                } ${isCurrent ? 'bg-primary/5' : ''}`}
                onClick={() => onCompare && toggleVersionSelection(version.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={isCurrent ? 'default' : 'secondary'}>
                          v{version.versionNumber}
                        </Badge>
                        {isCurrent && (
                          <Badge variant="outline" className="text-xs">
                            현재 버전
                          </Badge>
                        )}
                        {version.tags?.map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{format(new Date(version.createdAt), 'yyyy-MM-dd HH:mm', { locale: ko })}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span>{version.createdByUser?.name || '알 수 없음'}</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <FileText className="h-3 w-3" />
                            <span>{formatFileSize(version.fileSize)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Hash className="h-3 w-3" />
                            <span className="font-mono text-xs">
                              {version.checksum.substring(0, 8)}...
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {version.changes && (
                        <div className="mt-2 text-sm">
                          <span className="text-muted-foreground">변경사항:</span>
                          <p className="mt-1">{version.changes}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      {isSelected && (
                        <div className="p-1 bg-primary text-primary-foreground rounded-full">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDownloadVersion(version.id)
                        }}
                        disabled={downloadingVersion === version.id}
                      >
                        {downloadingVersion === version.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                      {!isCurrent && onRestore && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setRestoreDialog({ open: true, version })
                          }}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          
          {versions.length === 0 && (
            <div className="text-center py-8">
              <History className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                아직 버전 히스토리가 없습니다.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* 복원 확인 다이얼로그 */}
      <Dialog open={restoreDialog.open} onOpenChange={(open) => 
        setRestoreDialog({ open, version: restoreDialog.version })
      }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>버전 복원</DialogTitle>
            <DialogDescription>
              이 버전으로 파일을 복원하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          
          {restoreDialog.version && (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  현재 파일의 내용이 버전 {restoreDialog.version.versionNumber}의 내용으로 교체됩니다.
                  이 작업은 새로운 버전을 생성하므로 안전합니다.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">버전:</span>
                  <span>v{restoreDialog.version.versionNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">생성일:</span>
                  <span>
                    {format(new Date(restoreDialog.version.createdAt), 'yyyy-MM-dd HH:mm', { locale: ko })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">생성자:</span>
                  <span>{restoreDialog.version.createdByUser?.name || '알 수 없음'}</span>
                </div>
                {restoreDialog.version.changes && (
                  <div>
                    <span className="text-muted-foreground">변경사항:</span>
                    <p className="mt-1">{restoreDialog.version.changes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRestoreDialog({ open: false, version: null })}
              disabled={restoringVersion}
            >
              취소
            </Button>
            <Button
              onClick={handleRestoreVersion}
              disabled={restoringVersion}
            >
              {restoringVersion ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  복원 중...
                </>
              ) : (
                <>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  복원
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}