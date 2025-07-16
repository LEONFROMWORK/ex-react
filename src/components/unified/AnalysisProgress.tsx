'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle2, 
  Circle, 
  Loader2, 
  AlertCircle,
  Upload,
  FileSearch,
  ShieldCheck,
  BugOff,
  Zap,
  Code,
  FileText
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AnalysisStage } from '@/lib/utils/progress-tracker'

interface AnalysisProgressProps {
  stages: AnalysisStage[]
  totalProgress: number
  currentMessage?: string
}

const stageIcons: Record<string, any> = {
  upload: Upload,
  parse: FileSearch,
  validate: ShieldCheck,
  errors: BugOff,
  performance: Zap,
  vba: Code,
  report: FileText
}

export function AnalysisProgress({ stages, totalProgress, currentMessage }: AnalysisProgressProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0)
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(totalProgress)
    }, 100)
    return () => clearTimeout(timer)
  }, [totalProgress])
  
  const getStageIcon = (stage: AnalysisStage) => {
    const Icon = stageIcons[stage.id] || Circle
    
    if (stage.status === 'completed') {
      return <CheckCircle2 className="h-5 w-5 text-green-500" />
    } else if (stage.status === 'error') {
      return <AlertCircle className="h-5 w-5 text-red-500" />
    } else if (stage.status === 'in_progress') {
      return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
    } else {
      return <Icon className="h-5 w-5 text-gray-400" />
    }
  }
  
  const getStageColor = (stage: AnalysisStage) => {
    switch (stage.status) {
      case 'completed':
        return 'text-green-600 font-medium'
      case 'error':
        return 'text-red-600 font-medium'
      case 'in_progress':
        return 'text-blue-600 font-medium'
      default:
        return 'text-gray-500'
    }
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>분석 진행 상황</span>
          <Badge variant="secondary" className="text-lg px-3 py-1">
            {animatedProgress}%
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 전체 진행률 */}
        <div className="space-y-2">
          <Progress value={animatedProgress} className="h-3" />
          {currentMessage && (
            <p className="text-sm text-muted-foreground text-center">
              {currentMessage}
            </p>
          )}
        </div>
        
        {/* 단계별 진행 상황 */}
        <div className="space-y-3">
          {stages.map((stage, index) => (
            <div key={stage.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getStageIcon(stage)}
                  <span className={cn("text-sm", getStageColor(stage))}>
                    {stage.name}
                  </span>
                </div>
                {stage.status === 'in_progress' && (
                  <span className="text-sm text-muted-foreground">
                    {stage.progress}%
                  </span>
                )}
              </div>
              
              {stage.status === 'in_progress' && (
                <Progress 
                  value={stage.progress} 
                  className="h-1 ml-8"
                />
              )}
              
              {/* 단계 간 연결선 */}
              {index < stages.length - 1 && (
                <div className="ml-2.5 mt-1 mb-1">
                  <div className={cn(
                    "w-0.5 h-4 mx-auto",
                    stage.status === 'completed' ? 'bg-green-500' : 'bg-gray-300'
                  )} />
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* 예상 시간 */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">예상 남은 시간</span>
            <span className="font-medium">
              {totalProgress < 30 && '약 2-3분'}
              {totalProgress >= 30 && totalProgress < 70 && '약 1-2분'}
              {totalProgress >= 70 && totalProgress < 90 && '1분 미만'}
              {totalProgress >= 90 && '곧 완료됩니다'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}