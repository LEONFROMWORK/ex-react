'use client'

import React, { Component, ReactNode, ErrorInfo } from 'react'
import { BusinessContextAnalyzer, EnhancedError } from '@/Services/Error/BusinessContextAnalyzer'
import { ErrorVisualization } from './ErrorVisualization'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  showTechnicalDetails?: boolean
  operation?: string
  intent?: string
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  enhancedError: EnhancedError | null
  errorId: string
}

export class EnhancedErrorBoundary extends Component<Props, State> {
  private analyzer: BusinessContextAnalyzer

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      enhancedError: null,
      errorId: '',
    }
    this.analyzer = new BusinessContextAnalyzer()
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      enhancedError: null,
      errorId: `EB_${Date.now().toString(36)}`,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)

    // 에러 분석
    const analysisResult = this.analyzer.analyzeError(error, {
      operation: this.props.operation || 'unknown',
      intent: this.props.intent || 'unknown',
      dataContext: {
        componentStack: errorInfo.componentStack,
        props: this.props,
      },
    })

    if (analysisResult.isSuccess) {
      this.setState({
        errorInfo,
        enhancedError: analysisResult.value,
      })
    }

    // 외부 에러 핸들러 호출
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // 에러 리포팅 (예: Sentry, LogRocket 등)
    this.reportError(error, errorInfo)
  }

  reportError(error: Error, errorInfo: ErrorInfo) {
    // 실제 환경에서는 에러 리포팅 서비스로 전송
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      // Sentry.captureException(error, { extra: errorInfo })
      console.error('Production error:', {
        error,
        errorInfo,
        errorId: this.state.errorId,
      })
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      enhancedError: null,
      errorId: '',
    })
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      // 커스텀 폴백이 제공된 경우
      if (this.props.fallback) {
        return <>{this.props.fallback}</>
      }

      // 향상된 에러 정보가 있는 경우
      if (this.state.enhancedError) {
        return (
          <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
            <div className="max-w-2xl w-full">
              <ErrorVisualization
                error={this.state.enhancedError}
                onRetry={this.handleReset}
                onDismiss={this.handleGoHome}
                showTechnicalDetails={this.props.showTechnicalDetails}
              />
            </div>
          </div>
        )
      }

      // 기본 에러 UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-3 rounded-full bg-red-100">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-xl font-semibold">문제가 발생했습니다</h2>
                <p className="text-muted-foreground">
                  예기치 않은 오류가 발생했습니다. 불편을 드려 죄송합니다.
                </p>
                <div className="flex gap-3">
                  <Button onClick={this.handleReset}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    다시 시도
                  </Button>
                  <Button variant="outline" onClick={this.handleGoHome}>
                    <Home className="w-4 h-4 mr-2" />
                    홈으로
                  </Button>
                </div>
                {this.state.errorId && (
                  <p className="text-xs text-muted-foreground">
                    오류 ID: {this.state.errorId}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// React Hook for Error Handling
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null)
  const analyzer = React.useRef(new BusinessContextAnalyzer())

  const resetError = () => setError(null)

  const captureError = React.useCallback((error: Error, context?: any) => {
    console.error('Error captured:', error)
    
    // 에러 분석
    const analysisResult = analyzer.current.analyzeError(error, context)
    
    if (analysisResult.isSuccess) {
      // 분석된 에러를 상태로 설정
      setError(error)
      
      // UI에 표시하거나 리포팅
      return analysisResult.value
    }
    
    setError(error)
    return null
  }, [])

  React.useEffect(() => {
    if (error) {
      throw error
    }
  }, [error])

  return { captureError, resetError }
}