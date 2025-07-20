'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  Database,
  Activity
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface SyncStats {
  totalRecords: number
  averageQuality: number
  lastSync: string | null
  sources: Record<string, number>
}

export function PipeDataSync() {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle')
  const [stats, setStats] = useState<SyncStats | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // 통계 로드
  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/pipedata/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleManualSync = async () => {
    setSyncStatus('syncing')
    
    try {
      const response = await fetch('/api/admin/pipedata/sync', {
        method: 'POST'
      })
      
      if (response.ok) {
        const result = await response.json()
        setSyncStatus('success')
        toast({
          title: '동기화 완료',
          description: `${result.processed}개의 데이터가 처리되었습니다.`,
        })
        
        // 통계 새로고침
        await fetchStats()
      } else {
        setSyncStatus('error')
        toast({
          title: '동기화 실패',
          description: '데이터 동기화 중 오류가 발생했습니다.',
          variant: 'destructive'
        })
      }
    } catch (error) {
      setSyncStatus('error')
      console.error('Sync error:', error)
    }
    
    // 3초 후 상태 초기화
    setTimeout(() => setSyncStatus('idle'), 3000)
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>PipeData Integration</span>
            <Badge variant="outline" className="ml-2">
              <Activity className="w-3 h-3 mr-1" />
              Active
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Records</p>
              <p className="text-2xl font-bold">
                {stats?.totalRecords.toLocaleString() || '0'}
              </p>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Average Quality</p>
              <div className="flex items-center gap-2">
                <Progress 
                  value={(stats?.averageQuality || 0) * 10} 
                  className="flex-1"
                />
                <span className="text-sm font-medium">
                  {stats?.averageQuality.toFixed(1)}/10
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Last Sync</p>
              <p className="text-sm">
                {stats?.lastSync 
                  ? new Date(stats.lastSync).toLocaleString('ko-KR')
                  : 'Never'}
              </p>
            </div>
          </div>

          {/* 소스별 통계 */}
          {stats?.sources && Object.keys(stats.sources).length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium mb-3">Data Sources</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.sources).map(([source, count]) => (
                  <Badge key={source} variant="secondary">
                    {source}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* 동기화 버튼 */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              PipeData에서 수집된 Excel Q&A 데이터를 가져옵니다.
            </p>
            <Button
              onClick={handleManualSync}
              disabled={syncStatus === 'syncing'}
              variant={syncStatus === 'success' ? 'secondary' : 'default'}
            >
              {syncStatus === 'syncing' && (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              )}
              {syncStatus === 'success' && (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              {syncStatus === 'error' && (
                <AlertCircle className="mr-2 h-4 w-4" />
              )}
              {syncStatus === 'syncing' ? 'Syncing...' : 'Manual Sync'}
            </Button>
          </div>

          {/* 상태 메시지 */}
          {syncStatus === 'success' && (
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
              <p className="text-sm text-green-600 dark:text-green-400">
                ✅ 동기화가 성공적으로 완료되었습니다.
              </p>
            </div>
          )}
          
          {syncStatus === 'error' && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
              <p className="text-sm text-red-600 dark:text-red-400">
                ❌ 동기화 중 오류가 발생했습니다.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 사용 가이드 */}
      <Card>
        <CardHeader>
          <CardTitle>How PipeData Integration Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <Database className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">Data Collection</p>
              <p className="text-sm text-muted-foreground">
                PipeData가 Stack Overflow, Reddit, 오빠두에서 Excel Q&A를 수집합니다.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <Upload className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">Knowledge Transfer</p>
              <p className="text-sm text-muted-foreground">
                수집된 고품질 데이터가 ExcelApp AI 시스템으로 전송됩니다.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">Enhanced AI</p>
              <p className="text-sm text-muted-foreground">
                AI가 실제 사례를 학습하여 더 정확한 답변을 제공합니다.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}