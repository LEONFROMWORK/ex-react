'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw, ChevronRight, Shield, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface ErrorRecoveryViewProps {
  error: {
    code: string;
    message: string;
    recoverable?: boolean;
    suggestion?: string;
  };
  sessionId: string;
  stage: 'upload' | 'processing' | 'analysis' | 'download';
  onRetry?: () => void;
  onCancel?: () => void;
  autoRetry?: boolean;
  maxRetries?: number;
}

export default function ErrorRecoveryView({
  error,
  sessionId,
  stage,
  onRetry,
  onCancel,
  autoRetry = true,
  maxRetries = 3
}: ErrorRecoveryViewProps) {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // 자동 재시도 로직
  useEffect(() => {
    if (autoRetry && error.recoverable !== false && retryCount < maxRetries) {
      const initialDelay = Math.min(1000 * Math.pow(2, retryCount), 10000); // 최대 10초
      setCountdown(Math.ceil(initialDelay / 1000));

      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(countdownInterval);
            handleRetry();
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdownInterval);
    }
  }, [retryCount, autoRetry, error.recoverable, maxRetries]);

  const handleRetry = async () => {
    setIsRetrying(true);
    setCountdown(null);
    setRetryCount(prev => prev + 1);
    
    if (onRetry) {
      try {
        await onRetry();
      } catch (err) {
        setIsRetrying(false);
      }
    }
  };

  const getStageInfo = () => {
    const stageMap = {
      upload: { icon: '📤', label: '업로드' },
      processing: { icon: '⚙️', label: '처리' },
      analysis: { icon: '🔍', label: '분석' },
      download: { icon: '📥', label: '다운로드' }
    };
    return stageMap[stage];
  };

  const getErrorTypeInfo = () => {
    const errorTypeMap: Record<string, { color: string; recoverable: boolean; action: string }> = {
      'NETWORK_ERROR': { color: 'yellow', recoverable: true, action: '네트워크 연결을 확인해주세요' },
      'RATE_LIMIT': { color: 'orange', recoverable: true, action: '잠시 후 다시 시도됩니다' },
      'FILE_TOO_LARGE': { color: 'red', recoverable: false, action: '파일 크기를 줄여주세요' },
      'INVALID_FILE_FORMAT': { color: 'red', recoverable: false, action: '올바른 파일 형식을 사용해주세요' },
      'AI_SERVICE_ERROR': { color: 'yellow', recoverable: true, action: 'AI 서비스 복구 중' },
      'INSUFFICIENT_CREDITS': { color: 'red', recoverable: false, action: '크레딧을 충전해주세요' },
      'TIMEOUT': { color: 'yellow', recoverable: true, action: '처리 시간 초과' }
    };
    
    return errorTypeMap[error.code] || { color: 'gray', recoverable: true, action: error.message };
  };

  const stageInfo = getStageInfo();
  const errorType = getErrorTypeInfo();

  return (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* 에러 헤더 */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-1">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-red-900">
                  {stageInfo.icon} {stageInfo.label} 중 오류 발생
                </h3>
                <p className="text-sm text-red-700">{errorType.action}</p>
                {error.suggestion && (
                  <p className="text-sm text-red-600 mt-2">{error.suggestion}</p>
                )}
              </div>
            </div>
            <Badge variant="outline" className={`border-${errorType.color}-500 text-${errorType.color}-700`}>
              {error.code}
            </Badge>
          </div>

          {/* 재시도 정보 */}
          {autoRetry && errorType.recoverable && retryCount < maxRetries && (
            <Alert className="bg-yellow-50 border-yellow-200">
              <Shield className="w-4 h-4" />
              <AlertTitle>자동 복구 진행 중</AlertTitle>
              <AlertDescription>
                {countdown !== null ? (
                  <div className="space-y-2">
                    <p>{countdown}초 후 자동으로 재시도합니다... (시도 {retryCount + 1}/{maxRetries})</p>
                    <Progress value={(retryCount / maxRetries) * 100} className="h-2" />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>재시도 중...</span>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* 세션 정보 */}
          <div className="text-xs text-gray-500">
            세션 ID: {sessionId}
          </div>

          {/* 액션 버튼 */}
          <div className="flex gap-2">
            {errorType.recoverable && (
              <Button
                onClick={handleRetry}
                disabled={isRetrying || countdown !== null}
                size="sm"
                variant="outline"
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    재시도 중...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    수동 재시도
                  </>
                )}
              </Button>
            )}
            
            {onCancel && (
              <Button
                onClick={onCancel}
                size="sm"
                variant="ghost"
              >
                <X className="w-4 h-4 mr-2" />
                취소
              </Button>
            )}
          </div>

          {/* 부가 정보 */}
          {retryCount >= maxRetries && (
            <Alert className="bg-gray-50 border-gray-200">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                최대 재시도 횟수를 초과했습니다. 문제가 지속되면 고객 지원팀에 문의해주세요.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}