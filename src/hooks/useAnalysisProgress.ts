import { useEffect, useState, useCallback } from 'react'
import { ProgressTracker, AnalysisProgress, AnalysisStage } from '@/lib/utils/progress-tracker'

interface UseAnalysisProgressOptions {
  fileId: string
  onComplete?: (resultId: string) => void
  onError?: (error: string) => void
}

export function useAnalysisProgress({ fileId, onComplete, onError }: UseAnalysisProgressOptions) {
  const [progressTracker] = useState(() => new ProgressTracker())
  const [stages, setStages] = useState<AnalysisStage[]>([])
  const [totalProgress, setTotalProgress] = useState(0)
  const [currentMessage, setCurrentMessage] = useState<string>('')
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const connect = useCallback(() => {
    if (!fileId) return
    
    const eventSource = new EventSource(`/api/analysis/progress/${fileId}`)
    
    eventSource.onopen = () => {
      setIsConnected(true)
      setError(null)
    }
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        switch (data.type) {
          case 'connection':
            setCurrentMessage(data.message)
            break
            
          case 'stage_start':
            progressTracker.updateStage(data.stage, 0, 'in_progress')
            setCurrentMessage(data.message)
            break
            
          case 'progress':
            progressTracker.updateStage(data.stage, data.progress)
            setTotalProgress(data.totalProgress || 0)
            break
            
          case 'stage_complete':
            progressTracker.updateStage(data.stage, 100, 'completed')
            setCurrentMessage(data.message)
            break
            
          case 'complete':
            setCurrentMessage(data.message)
            setTotalProgress(100)
            if (onComplete) {
              onComplete(data.resultId)
            }
            eventSource.close()
            break
            
          case 'error':
            setError(data.message)
            if (onError) {
              onError(data.message)
            }
            eventSource.close()
            break
        }
        
        // 스테이지 상태 업데이트
        setStages([...progressTracker.getStages()])
      } catch (err) {
        console.error('Failed to parse SSE data:', err)
      }
    }
    
    eventSource.onerror = (err) => {
      console.error('SSE connection error:', err)
      setIsConnected(false)
      setError('연결이 끊어졌습니다. 다시 시도해주세요.')
      eventSource.close()
    }
    
    return () => {
      eventSource.close()
      setIsConnected(false)
    }
  }, [fileId, onComplete, onError, progressTracker])
  
  useEffect(() => {
    const cleanup = connect()
    return cleanup
  }, [connect])
  
  const reset = useCallback(() => {
    progressTracker.reset()
    setStages([...progressTracker.getStages()])
    setTotalProgress(0)
    setCurrentMessage('')
    setError(null)
  }, [progressTracker])
  
  return {
    stages,
    totalProgress,
    currentMessage,
    isConnected,
    error,
    reset
  }
}