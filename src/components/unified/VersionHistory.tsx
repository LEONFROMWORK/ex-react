'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clock, Download, RotateCcw, FileText } from 'lucide-react'
import { useFileStore } from '@/lib/stores/fileStore'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface VersionHistoryProps {
  fileId: string
}

export function VersionHistory({ fileId }: VersionHistoryProps) {
  const { versions } = useFileStore()
  
  // Mock data if no versions
  const displayVersions = versions.length > 0 ? versions : [
    {
      id: 'v1',
      fileId,
      versionNumber: 1,
      createdAt: new Date(),
      changes: ['초기 업로드'],
      size: 1024 * 512
    }
  ]
  
  const handleRestore = (versionId: string) => {
    // TODO: Implement version restore
    console.log('Restore version:', versionId)
  }
  
  const handleDownload = (versionId: string) => {
    // TODO: Implement version download
    console.log('Download version:', versionId)
  }
  
  const handleViewChanges = (versionId: string) => {
    // TODO: Implement change viewer
    console.log('View changes:', versionId)
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          버전 히스토리
        </CardTitle>
        <CardDescription>
          파일의 모든 변경 사항이 자동으로 저장됩니다
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displayVersions.map((version, index) => (
            <div key={version.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">버전 {version.versionNumber}</h4>
                    {index === 0 && (
                      <Badge variant="secondary">현재</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {format(version.createdAt, 'yyyy년 MM월 dd일 HH:mm', { locale: ko })}
                  </p>
                </div>
                <span className="text-sm text-muted-foreground">
                  {(version.size / 1024).toFixed(1)} KB
                </span>
              </div>
              
              <div className="mb-3">
                <p className="text-sm font-medium mb-1">변경 사항:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {version.changes.map((change, i) => (
                    <li key={i} className="flex items-start">
                      <span className="mr-2">•</span>
                      {change}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="flex gap-2">
                {index !== 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRestore(version.id)}
                  >
                    <RotateCcw className="mr-2 h-3 w-3" />
                    복원
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(version.id)}
                >
                  <Download className="mr-2 h-3 w-3" />
                  다운로드
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleViewChanges(version.id)}
                >
                  <FileText className="mr-2 h-3 w-3" />
                  상세
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}