import { Result } from '@/Common/Result'

export interface BusinessContext {
  operation: string // 수행 중이던 작업
  intent: string // 사용자의 의도
  dataContext: any // 관련 데이터
  previousSteps: string[] // 이전 단계들
  timestamp: Date
}

export interface EnhancedError {
  originalError: any
  businessContext: BusinessContext
  userFriendlyMessage: string
  technicalDetails: string
  suggestedActions: string[]
  relatedDocumentation?: string[]
  errorCategory: 'user' | 'system' | 'data' | 'network' | 'permission'
  severity: 'low' | 'medium' | 'high' | 'critical'
  errorCode: string
  stackTrace?: string
}

export class BusinessContextAnalyzer {
  private errorPatterns = new Map<RegExp, (error: any, context: BusinessContext) => Partial<EnhancedError>>()
  private contextHistory: BusinessContext[] = []
  private maxHistorySize = 50

  constructor() {
    this.initializeErrorPatterns()
  }

  // 에러 패턴 초기화
  private initializeErrorPatterns() {
    // Excel 생성 관련 에러
    this.errorPatterns.set(
      /EXCEL.*GENERATION.*FAILED/i,
      (error, context) => ({
        userFriendlyMessage: 'Excel 파일 생성에 실패했습니다. 입력하신 내용을 확인해주세요.',
        suggestedActions: [
          '프롬프트에 더 구체적인 정보를 추가해보세요',
          '데이터 양을 줄여서 다시 시도해보세요',
          '다른 템플릿을 사용해보세요',
        ],
        errorCategory: 'data',
        severity: 'medium',
      })
    )

    // VBA 추출 관련 에러
    this.errorPatterns.set(
      /VBA.*EXTRACTION.*FAILED/i,
      (error, context) => ({
        userFriendlyMessage: 'VBA 코드를 추출할 수 없습니다. 파일에 VBA가 포함되어 있는지 확인해주세요.',
        suggestedActions: [
          '.xlsm 또는 .xlsb 파일인지 확인하세요',
          '파일이 손상되지 않았는지 확인하세요',
          'VBA가 포함된 다른 파일로 시도해보세요',
        ],
        errorCategory: 'data',
        severity: 'low',
      })
    )

    // 메모리 부족 에러
    this.errorPatterns.set(
      /out of memory|heap out of memory/i,
      (error, context) => ({
        userFriendlyMessage: '파일이 너무 커서 처리할 수 없습니다.',
        suggestedActions: [
          '파일 크기를 줄여주세요',
          '데이터를 여러 파일로 나눠주세요',
          '스트리밍 옵션을 사용해보세요',
        ],
        errorCategory: 'system',
        severity: 'high',
      })
    )

    // 권한 에러
    this.errorPatterns.set(
      /permission denied|access denied|unauthorized/i,
      (error, context) => ({
        userFriendlyMessage: '이 작업을 수행할 권한이 없습니다.',
        suggestedActions: [
          '로그인 상태를 확인해주세요',
          '계정 권한을 확인해주세요',
          '관리자에게 문의해주세요',
        ],
        errorCategory: 'permission',
        severity: 'medium',
      })
    )

    // 네트워크 에러
    this.errorPatterns.set(
      /network error|timeout|ECONNREFUSED/i,
      (error, context) => ({
        userFriendlyMessage: '네트워크 연결에 문제가 있습니다.',
        suggestedActions: [
          '인터넷 연결을 확인해주세요',
          '잠시 후 다시 시도해주세요',
          'VPN을 사용 중이라면 끄고 시도해보세요',
        ],
        errorCategory: 'network',
        severity: 'medium',
      })
    )

    // 파일 형식 에러
    this.errorPatterns.set(
      /invalid file format|not a valid excel/i,
      (error, context) => ({
        userFriendlyMessage: '올바른 Excel 파일 형식이 아닙니다.',
        suggestedActions: [
          '파일 확장자를 확인해주세요 (.xlsx, .xls, .xlsm)',
          '파일이 손상되지 않았는지 확인해주세요',
          'Excel에서 파일을 다시 저장해보세요',
        ],
        errorCategory: 'data',
        severity: 'low',
      })
    )

    // AI/LLM 관련 에러
    this.errorPatterns.set(
      /AI.*error|LLM.*failed|token.*limit/i,
      (error, context) => ({
        userFriendlyMessage: 'AI 처리 중 문제가 발생했습니다.',
        suggestedActions: [
          '프롬프트를 더 짧게 작성해보세요',
          '요청을 더 구체적으로 작성해보세요',
          '복잡한 요청은 여러 단계로 나눠서 시도해보세요',
        ],
        errorCategory: 'system',
        severity: 'medium',
        relatedDocumentation: ['/docs/ai-limits', '/docs/prompt-guide'],
      })
    )
  }

  // 비즈니스 컨텍스트 추가
  addContext(context: BusinessContext): void {
    this.contextHistory.push(context)
    if (this.contextHistory.length > this.maxHistorySize) {
      this.contextHistory.shift()
    }
  }

  // 에러 분석 및 강화
  analyzeError(error: any, currentContext?: Partial<BusinessContext>): Result<EnhancedError> {
    try {
      // 현재 컨텍스트 구성
      const context: BusinessContext = {
        operation: currentContext?.operation || '알 수 없는 작업',
        intent: currentContext?.intent || '알 수 없는 의도',
        dataContext: currentContext?.dataContext || {},
        previousSteps: this.getPreviousSteps(),
        timestamp: new Date(),
      }

      // 기본 에러 정보
      const enhancedError: EnhancedError = {
        originalError: error,
        businessContext: context,
        userFriendlyMessage: '작업 중 오류가 발생했습니다.',
        technicalDetails: this.extractTechnicalDetails(error),
        suggestedActions: ['다시 시도해주세요', '문제가 지속되면 고객 지원에 문의해주세요'],
        errorCategory: 'system',
        severity: 'medium',
        errorCode: this.generateErrorCode(error),
        stackTrace: error.stack,
      }

      // 에러 패턴 매칭
      for (const [pattern, analyzer] of this.errorPatterns) {
        if (pattern.test(error.message || '') || pattern.test(error.code || '')) {
          const analysis = analyzer(error, context)
          Object.assign(enhancedError, analysis)
          break
        }
      }

      // 컨텍스트 기반 추가 분석
      this.enhanceWithContextualInfo(enhancedError, context)

      // 사용자 친화적 메시지 개선
      this.improveUserMessage(enhancedError)

      return Result.success(enhancedError)
    } catch (analysisError) {
      console.error('에러 분석 실패:', analysisError)
      return Result.failure({
        code: 'ERROR_ANALYSIS.FAILED',
        message: '에러 분석에 실패했습니다',
      })
    }
  }

  // 이전 단계 추출
  private getPreviousSteps(): string[] {
    return this.contextHistory
      .slice(-5) // 최근 5개
      .map(ctx => `${ctx.operation} (${new Date(ctx.timestamp).toLocaleTimeString()})`)
  }

  // 기술적 세부사항 추출
  private extractTechnicalDetails(error: any): string {
    const details: string[] = []

    if (error.message) details.push(`메시지: ${error.message}`)
    if (error.code) details.push(`코드: ${error.code}`)
    if (error.statusCode) details.push(`상태 코드: ${error.statusCode}`)
    if (error.response?.data) details.push(`응답: ${JSON.stringify(error.response.data)}`)

    return details.join('\n')
  }

  // 에러 코드 생성
  private generateErrorCode(error: any): string {
    const timestamp = Date.now().toString(36).toUpperCase()
    const errorType = (error.code || error.name || 'UNKNOWN').replace(/[^A-Z0-9]/g, '')
    return `${errorType}_${timestamp}`
  }

  // 컨텍스트 정보로 강화
  private enhanceWithContextualInfo(error: EnhancedError, context: BusinessContext): void {
    // 작업별 추가 정보
    switch (context.operation) {
      case 'excel-generation':
        if (context.dataContext?.prompt) {
          error.suggestedActions.unshift(
            `프롬프트 길이를 ${context.dataContext.prompt.length}자에서 줄여보세요`
          )
        }
        break

      case 'vba-extraction':
        if (context.dataContext?.fileSize) {
          const sizeMB = context.dataContext.fileSize / 1024 / 1024
          if (sizeMB > 50) {
            error.suggestedActions.unshift('50MB 이하의 파일을 사용해주세요')
            error.severity = 'high'
          }
        }
        break

      case 'template-generation':
        if (context.dataContext?.templateId) {
          error.relatedDocumentation = [
            `/docs/templates/${context.dataContext.templateId}`,
          ]
        }
        break
    }

    // 반복적인 에러 감지
    const recentErrors = this.contextHistory
      .slice(-10)
      .filter(ctx => ctx.operation === context.operation)

    if (recentErrors.length > 3) {
      error.suggestedActions.push(
        '같은 작업이 반복적으로 실패하고 있습니다. 다른 방법을 시도해보세요.'
      )
      error.severity = 'high'
    }
  }

  // 사용자 메시지 개선
  private improveUserMessage(error: EnhancedError): void {
    const context = error.businessContext

    // 시간대별 메시지
    const hour = new Date().getHours()
    const timePrefix = hour < 12 ? '오전' : hour < 18 ? '오후' : '저녁'

    // 의도 기반 메시지
    switch (context.intent) {
      case 'create-report':
        error.userFriendlyMessage = `${timePrefix}에 보고서 생성 중 문제가 발생했습니다. ${error.userFriendlyMessage}`
        break
      case 'analyze-data':
        error.userFriendlyMessage = `데이터 분석 중 문제가 발생했습니다. ${error.userFriendlyMessage}`
        break
    }

    // 심각도별 추가 메시지
    if (error.severity === 'critical') {
      error.userFriendlyMessage += ' 시스템 관리자에게 즉시 문의해주세요.'
    } else if (error.severity === 'high') {
      error.userFriendlyMessage += ' 지속적인 문제 발생 시 고객 지원에 문의해주세요.'
    }
  }

  // 에러 리포트 생성
  generateErrorReport(error: EnhancedError): string {
    return `
# 오류 보고서

## 오류 정보
- **코드**: ${error.errorCode}
- **카테고리**: ${error.errorCategory}
- **심각도**: ${error.severity}
- **시간**: ${error.businessContext.timestamp.toLocaleString()}

## 사용자 메시지
${error.userFriendlyMessage}

## 권장 조치
${error.suggestedActions.map((action, i) => `${i + 1}. ${action}`).join('\n')}

## 기술적 세부사항
\`\`\`
${error.technicalDetails}
\`\`\`

## 작업 컨텍스트
- **작업**: ${error.businessContext.operation}
- **의도**: ${error.businessContext.intent}
- **이전 단계**: 
${error.businessContext.previousSteps.map(step => `  - ${step}`).join('\n')}

${error.stackTrace ? `## 스택 추적\n\`\`\`\n${error.stackTrace}\n\`\`\`` : ''}
    `.trim()
  }

  // 통계 수집
  getErrorStatistics(): {
    totalErrors: number
    errorsByCategory: Record<string, number>
    errorsBySeverity: Record<string, number>
    commonErrors: Array<{ pattern: string, count: number }>
  } {
    // 실제로는 데이터베이스에서 조회
    return {
      totalErrors: this.contextHistory.length,
      errorsByCategory: {
        user: 10,
        system: 5,
        data: 8,
        network: 3,
        permission: 2,
      },
      errorsBySeverity: {
        low: 15,
        medium: 10,
        high: 3,
        critical: 0,
      },
      commonErrors: [
        { pattern: 'Excel generation failed', count: 5 },
        { pattern: 'VBA extraction failed', count: 3 },
        { pattern: 'Network timeout', count: 2 },
      ],
    }
  }
}