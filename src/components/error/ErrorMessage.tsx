'use client'

import { useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  AlertCircle, 
  XCircle, 
  AlertTriangle, 
  Info,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  HelpCircle,
  Mail
} from 'lucide-react'

export type ErrorSeverity = 'error' | 'warning' | 'info'

interface ErrorMessageProps {
  title: string
  message: string
  severity?: ErrorSeverity
  code?: string
  details?: string
  actions?: ErrorAction[]
  showDetails?: boolean
  onDismiss?: () => void
}

interface ErrorAction {
  label: string
  action: () => void
  variant?: 'default' | 'outline' | 'ghost'
}

const severityConfig = {
  error: {
    icon: XCircle,
    className: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950',
    iconClassName: 'text-red-600 dark:text-red-400'
  },
  warning: {
    icon: AlertTriangle,
    className: 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950',
    iconClassName: 'text-yellow-600 dark:text-yellow-400'
  },
  info: {
    icon: Info,
    className: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950',
    iconClassName: 'text-blue-600 dark:text-blue-400'
  }
}

// 일반적인 오류 코드와 해결 방법
const errorSolutions: Record<string, { title: string; solutions: string[] }> = {
  'AUTH_REQUIRED': {
    title: '인증이 필요합니다',
    solutions: [
      '로그인 페이지로 이동하여 다시 로그인해주세요',
      '세션이 만료되었을 수 있습니다'
    ]
  },
  'INSUFFICIENT_TOKENS': {
    title: '토큰이 부족합니다',
    solutions: [
      '토큰 구매 페이지에서 추가 토큰을 구매하세요',
      '무료 토큰 이벤트를 확인해보세요'
    ]
  },
  'FILE_TOO_LARGE': {
    title: '파일이 너무 큽니다',
    solutions: [
      '파일 크기를 50MB 이하로 줄여주세요',
      'Excel 파일을 여러 개로 분할해보세요',
      '불필요한 시트나 데이터를 제거해보세요'
    ]
  },
  'INVALID_FILE_FORMAT': {
    title: '지원하지 않는 파일 형식',
    solutions: [
      '.xls, .xlsx, .xlsm, .xlsb 형식만 지원됩니다',
      '파일을 Excel 형식으로 저장 후 다시 시도해주세요'
    ]
  },
  'NETWORK_ERROR': {
    title: '네트워크 오류',
    solutions: [
      '인터넷 연결을 확인해주세요',
      '잠시 후 다시 시도해주세요',
      'VPN을 사용 중이라면 끄고 시도해보세요'
    ]
  },
  'SERVER_ERROR': {
    title: '서버 오류',
    solutions: [
      '일시적인 서버 문제일 수 있습니다',
      '5분 후 다시 시도해주세요',
      '문제가 지속되면 고객 지원팀에 문의하세요'
    ]
  }
}

export function ErrorMessage({
  title,
  message,
  severity = 'error',
  code,
  details,
  actions = [],
  showDetails = false,
  onDismiss
}: ErrorMessageProps) {
  const [isExpanded, setIsExpanded] = useState(showDetails)
  const config = severityConfig[severity]
  const Icon = config.icon
  const solutions = code ? errorSolutions[code] : null
  
  return (
    <Card className={config.className}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <Icon className={`h-5 w-5 mt-0.5 ${config.iconClassName}`} />
            <div className="space-y-1">
              <CardTitle className="text-base">{title}</CardTitle>
              <p className="text-sm text-muted-foreground">{message}</p>
            </div>
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={onDismiss}
            >
              <span className="sr-only">닫기</span>
              ×
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* 해결 방법 */}
        {solutions && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              {solutions.title}
            </h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-6">
              {solutions.solutions.map((solution, index) => (
                <li key={index}>{solution}</li>
              ))}
            </ul>
          </div>
        )}
        
        {/* 액션 버튼 */}
        {actions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {actions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || 'outline'}
                size="sm"
                onClick={action.action}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
        
        {/* 상세 정보 */}
        {(details || code) && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 font-normal"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  상세 정보 숨기기
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  상세 정보 보기
                </>
              )}
            </Button>
            
            {isExpanded && (
              <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">
                {code && <div>오류 코드: {code}</div>}
                {details && <div className="mt-1">{details}</div>}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// 전역 에러 헬퍼 함수
export function getErrorMessage(error: any): {
  title: string
  message: string
  code?: string
  severity: ErrorSeverity
} {
  // API 에러 응답
  if (error.response) {
    const status = error.response.status
    const data = error.response.data
    
    if (status === 401) {
      return {
        title: '인증 필요',
        message: '로그인이 필요한 기능입니다.',
        code: 'AUTH_REQUIRED',
        severity: 'error'
      }
    }
    
    if (status === 403) {
      return {
        title: '권한 없음',
        message: '이 작업을 수행할 권한이 없습니다.',
        code: 'FORBIDDEN',
        severity: 'error'
      }
    }
    
    if (status === 429) {
      return {
        title: '요청 제한',
        message: '너무 많은 요청을 보냈습니다. 잠시 후 다시 시도해주세요.',
        code: 'RATE_LIMIT',
        severity: 'warning'
      }
    }
    
    if (data?.error) {
      return {
        title: '오류 발생',
        message: data.error,
        code: data.code,
        severity: 'error'
      }
    }
  }
  
  // 네트워크 에러
  if (error.code === 'NETWORK_ERROR' || !navigator.onLine) {
    return {
      title: '연결 오류',
      message: '인터넷 연결을 확인해주세요.',
      code: 'NETWORK_ERROR',
      severity: 'error'
    }
  }
  
  // 기본 에러
  return {
    title: '오류 발생',
    message: error.message || '알 수 없는 오류가 발생했습니다.',
    severity: 'error'
  }
}