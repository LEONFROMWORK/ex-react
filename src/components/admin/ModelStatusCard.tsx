"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Brain, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Zap,
  RefreshCw,
  Activity,
  DollarSign
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface ModelStatus {
  id: string
  provider: string
  modelName: string
  displayName: string
  isActive: boolean
  isDefault: boolean
  status: 'online' | 'offline' | 'error'
  latency?: number
  successRate?: number
  lastChecked?: Date
}

interface ModelStatusCardProps {
  models: ModelStatus[]
  onRefresh: () => void
  onQuickSwitch: (modelId: string) => void
}

export function ModelStatusCard({ models, onRefresh, onQuickSwitch }: ModelStatusCardProps) {
  const [testing, setTesting] = useState<string | null>(null)

  const activeModels = models.filter(m => m.isActive)
  const onlineCount = activeModels.filter(m => m.status === 'online').length
  const hasIssues = activeModels.some(m => m.status === 'error')

  const testModel = async (modelId: string) => {
    setTesting(modelId)
    try {
      const response = await fetch(`/api/admin/ai-models/${modelId}/health-check`, {
        method: 'POST'
      })
      
      if (response.ok) {
        const result = await response.json()
        toast.success(`${result.displayName}: ${result.latency}ms`)
      } else {
        toast.error('헬스체크 실패')
      }
      
      onRefresh()
    } catch (error) {
      toast.error('테스트 중 오류 발생')
    } finally {
      setTesting(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI 모델 상태
          </span>
          <div className="flex items-center gap-2">
            {hasIssues && (
              <Badge variant="destructive" className="animate-pulse">
                <AlertCircle className="h-3 w-3 mr-1" />
                문제 감지
              </Badge>
            )}
            <Badge variant="secondary">
              {onlineCount}/{activeModels.length} 정상
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {activeModels.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>활성화된 AI 모델이 없습니다</p>
          </div>
        ) : (
          activeModels.map((model) => (
            <div
              key={model.id}
              className={cn(
                "p-3 rounded-lg border transition-all",
                model.status === 'online' 
                  ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                  : model.status === 'error'
                  ? "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
                  : "bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-3 w-3 rounded-full animate-pulse",
                    model.status === 'online' ? "bg-green-500" :
                    model.status === 'error' ? "bg-red-500" : "bg-gray-400"
                  )} />
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {model.displayName}
                      {model.isDefault && (
                        <Badge variant="secondary" className="text-xs">기본</Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-3">
                      <span>{model.provider}</span>
                      {model.latency && (
                        <span className="flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          {model.latency}ms
                        </span>
                      )}
                      {model.successRate !== undefined && (
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          {model.successRate.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {model.status === 'error' && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => onQuickSwitch(model.id)}
                    >
                      <Zap className="h-3 w-3 mr-1" />
                      전환
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => testModel(model.id)}
                    disabled={testing === model.id}
                  >
                    {testing === model.id ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <Activity className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
        
        {hasIssues && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  일부 모델에 문제가 있습니다
                </p>
                <p className="text-amber-700 dark:text-amber-300 mt-1">
                  자동 폴백이 활성화되어 있어 서비스는 정상 작동합니다.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}