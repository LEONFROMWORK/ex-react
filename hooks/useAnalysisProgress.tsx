'use client';

import { useState, useEffect, useCallback } from 'react';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export interface AnalysisProgress {
  stage: 'upload' | 'processing' | 'analyzing' | 'complete' | 'error';
  progress: number;
  message: string;
  details?: any;
}

export function useAnalysisProgress() {
  const [progress, setProgress] = useState<AnalysisProgress>({
    stage: 'upload',
    progress: 0,
    message: '파일 업로드 준비 중...'
  });

  const updateProgress = useCallback((update: Partial<AnalysisProgress>) => {
    setProgress(prev => ({ ...prev, ...update }));
  }, []);

  const resetProgress = useCallback(() => {
    setProgress({
      stage: 'upload',
      progress: 0,
      message: '파일 업로드 준비 중...'
    });
  }, []);

  return { progress, updateProgress, resetProgress };
}

interface AnalysisProgressIndicatorProps {
  progress: AnalysisProgress;
  className?: string;
}

export function AnalysisProgressIndicator({ progress, className }: AnalysisProgressIndicatorProps) {
  const getIcon = () => {
    switch (progress.stage) {
      case 'complete':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Loader2 className="w-5 h-5 animate-spin" />;
    }
  };

  const getStatusColor = () => {
    switch (progress.stage) {
      case 'complete':
        return 'border-green-500 bg-green-50';
      case 'error':
        return 'border-red-500 bg-red-50';
      default:
        return 'border-blue-500 bg-blue-50';
    }
  };

  if (progress.stage === 'upload' && progress.progress === 0) {
    return null;
  }

  return (
    <Alert className={`${getStatusColor()} ${className}`}>
      <div className="flex items-center gap-3">
        {getIcon()}
        <div className="flex-1">
          <AlertDescription className="font-medium">
            {progress.message}
          </AlertDescription>
          {progress.stage !== 'complete' && progress.stage !== 'error' && (
            <Progress value={progress.progress} className="mt-2" />
          )}
        </div>
      </div>
    </Alert>
  );
}