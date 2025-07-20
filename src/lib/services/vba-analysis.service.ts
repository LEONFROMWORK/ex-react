import * as ExcelJS from 'exceljs'
import { AIService } from './ai.service'

interface VBACode {
  moduleName: string
  moduleType: 'Standard' | 'Class' | 'Form' | 'Sheet' | 'ThisWorkbook'
  code: string
  procedures: VBAProcedure[]
}

interface VBAProcedure {
  name: string
  type: 'Sub' | 'Function' | 'Property'
  visibility: 'Public' | 'Private' | 'Friend'
  parameters: string[]
  returnType?: string
  startLine: number
  endLine: number
  body: string
}

interface VBAError {
  type: 'syntax' | 'logic' | 'performance' | 'security' | 'deprecated'
  severity: 'error' | 'warning' | 'info'
  module: string
  procedure?: string
  line: number
  column?: number
  message: string
  suggestion?: string
  autoFixable: boolean
}

interface VBAAnalysisResult {
  modules: VBACode[]
  errors: VBAError[]
  summary: {
    totalModules: number
    totalProcedures: number
    totalLines: number
    errorCount: number
    warningCount: number
    infoCount: number
  }
  recommendations: string[]
  securityIssues: SecurityIssue[]
}

interface SecurityIssue {
  type: 'file_access' | 'registry_access' | 'shell_execution' | 'network_access' | 'unsafe_api'
  severity: 'critical' | 'high' | 'medium' | 'low'
  module: string
  line: number
  description: string
  recommendation: string
}

export class VBAAnalysisService {
  private aiService: AIService

  constructor() {
    this.aiService = new AIService({
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY || '',
      model: 'gpt-4'
    })
  }

  /**
   * Excel 파일에서 VBA 코드 추출
   */
  async extractVBACode(workbook: ExcelJS.Workbook): Promise<VBACode[]> {
    const vbaModules: VBACode[] = []
    
    // ExcelJS는 VBA 코드를 직접 지원하지 않으므로
    // JavaScript 기반 JSVBAExtractor 사용
    // ExcelJS로 VBA 관련 패턴 감지
    
    return vbaModules
  }

  /**
   * VBA 코드 분석
   */
  async analyzeVBACode(vbaCode: string, moduleName: string): Promise<VBAAnalysisResult> {
    const errors: VBAError[] = []
    const securityIssues: SecurityIssue[] = []
    
    // 기본 구문 검사
    errors.push(...this.checkSyntax(vbaCode, moduleName))
    
    // 보안 문제 검사
    securityIssues.push(...this.checkSecurity(vbaCode, moduleName))
    
    // 성능 문제 검사
    errors.push(...this.checkPerformance(vbaCode, moduleName))
    
    // Deprecated API 검사
    errors.push(...this.checkDeprecated(vbaCode, moduleName))
    
    // AI를 통한 심층 분석
    const aiAnalysis = await this.performAIAnalysis(vbaCode, moduleName)
    errors.push(...aiAnalysis.errors)
    
    const procedures = this.parseProcedures(vbaCode, moduleName)
    
    return {
      modules: [{
        moduleName,
        moduleType: 'Standard',
        code: vbaCode,
        procedures
      }],
      errors,
      summary: {
        totalModules: 1,
        totalProcedures: procedures.length,
        totalLines: vbaCode.split('\n').length,
        errorCount: errors.filter(e => e.severity === 'error').length,
        warningCount: errors.filter(e => e.severity === 'warning').length,
        infoCount: errors.filter(e => e.severity === 'info').length
      },
      recommendations: this.generateRecommendations(errors, securityIssues),
      securityIssues
    }
  }

  /**
   * 기본 구문 검사
   */
  private checkSyntax(code: string, module: string): VBAError[] {
    const errors: VBAError[] = []
    const lines = code.split('\n')
    
    lines.forEach((line, index) => {
      // Option Explicit 검사
      if (index === 0 && !line.trim().startsWith('Option Explicit')) {
        errors.push({
          type: 'syntax',
          severity: 'warning',
          module,
          line: 1,
          message: 'Option Explicit가 선언되지 않았습니다',
          suggestion: '모듈 상단에 "Option Explicit"를 추가하세요',
          autoFixable: true
        })
      }
      
      // On Error Resume Next 경고
      if (line.includes('On Error Resume Next')) {
        errors.push({
          type: 'logic',
          severity: 'warning',
          module,
          line: index + 1,
          message: 'On Error Resume Next는 오류를 무시할 수 있습니다',
          suggestion: '적절한 오류 처리를 구현하세요',
          autoFixable: false
        })
      }
      
      // GoTo 문 경고
      if (line.match(/\bGoTo\s+\w+/) && !line.includes('On Error GoTo')) {
        errors.push({
          type: 'logic',
          severity: 'warning',
          module,
          line: index + 1,
          message: 'GoTo 문은 코드 가독성을 떨어뜨립니다',
          suggestion: '구조화된 제어문을 사용하세요',
          autoFixable: false
        })
      }
    })
    
    return errors
  }

  /**
   * 보안 검사
   */
  private checkSecurity(code: string, module: string): SecurityIssue[] {
    const issues: SecurityIssue[] = []
    const lines = code.split('\n')
    
    const dangerousPatterns = [
      {
        pattern: /CreateObject\s*\(\s*["']Shell\.Application["']/i,
        type: 'shell_execution' as const,
        severity: 'high' as const,
        description: 'Shell.Application 사용 감지',
        recommendation: 'Shell 실행은 보안 위험이 있습니다. 필요한 경우 제한된 권한으로 실행하세요'
      },
      {
        pattern: /CreateObject\s*\(\s*["']WScript\.Shell["']/i,
        type: 'shell_execution' as const,
        severity: 'critical' as const,
        description: 'WScript.Shell 사용 감지',
        recommendation: '외부 프로그램 실행은 매우 위험합니다. 대체 방법을 고려하세요'
      },
      {
        pattern: /Open\s+.+\s+For\s+(Binary|Random|Output|Append|Input)/i,
        type: 'file_access' as const,
        severity: 'medium' as const,
        description: '파일 시스템 접근 감지',
        recommendation: '파일 경로를 검증하고 사용자 권한을 확인하세요'
      },
      {
        pattern: /GetObject\s*\(/i,
        type: 'unsafe_api' as const,
        severity: 'medium' as const,
        description: 'GetObject 사용 감지',
        recommendation: 'COM 객체 접근 시 보안을 고려하세요'
      },
      {
        pattern: /\bKill\s+/i,
        type: 'file_access' as const,
        severity: 'high' as const,
        description: '파일 삭제 명령 감지',
        recommendation: '파일 삭제 전 충분한 검증을 수행하세요'
      }
    ]
    
    lines.forEach((line, index) => {
      dangerousPatterns.forEach(({ pattern, type, severity, description, recommendation }) => {
        if (pattern.test(line)) {
          issues.push({
            type,
            severity,
            module,
            line: index + 1,
            description,
            recommendation
          })
        }
      })
    })
    
    return issues
  }

  /**
   * 성능 검사
   */
  private checkPerformance(code: string, module: string): VBAError[] {
    const errors: VBAError[] = []
    const lines = code.split('\n')
    
    // Select/Activate 사용 검사
    lines.forEach((line, index) => {
      if (line.match(/\.(Select|Activate)\b/)) {
        errors.push({
          type: 'performance',
          severity: 'warning',
          module,
          line: index + 1,
          message: 'Select/Activate는 성능을 저하시킵니다',
          suggestion: '객체를 직접 참조하여 사용하세요',
          autoFixable: true
        })
      }
      
      // 비효율적인 루프 검사
      if (line.match(/For\s+Each.*\.Cells\b/i)) {
        errors.push({
          type: 'performance',
          severity: 'warning',
          module,
          line: index + 1,
          message: '모든 셀을 순회하는 것은 비효율적입니다',
          suggestion: 'UsedRange 또는 특정 범위를 사용하세요',
          autoFixable: false
        })
      }
    })
    
    return errors
  }

  /**
   * Deprecated API 검사
   */
  private checkDeprecated(code: string, module: string): VBAError[] {
    const errors: VBAError[] = []
    const lines = code.split('\n')
    
    const deprecatedAPIs = [
      { pattern: /\bApplication\.FileSearch\b/i, replacement: 'FileSystemObject' },
      { pattern: /\bApplication\.Assistant\b/i, replacement: '사용하지 마세요' },
      { pattern: /\bCommandBars\b/i, replacement: 'Ribbon UI' }
    ]
    
    lines.forEach((line, index) => {
      deprecatedAPIs.forEach(({ pattern, replacement }) => {
        if (pattern.test(line)) {
          errors.push({
            type: 'deprecated',
            severity: 'warning',
            module,
            line: index + 1,
            message: '더 이상 사용되지 않는 API입니다',
            suggestion: `${replacement}를 사용하세요`,
            autoFixable: false
          })
        }
      })
    })
    
    return errors
  }

  /**
   * AI를 통한 심층 분석
   */
  private async performAIAnalysis(code: string, module: string): Promise<{ errors: VBAError[] }> {
    const prompt = `
    다음 VBA 코드를 분석하고 문제점을 찾아주세요:
    
    ${code}
    
    다음 항목들을 검토하세요:
    1. 논리적 오류
    2. 메모리 누수 가능성
    3. 예외 처리 미흡
    4. 변수 명명 규칙
    5. 코드 중복
    
    JSON 형식으로 결과를 반환하세요.
    `
    
    try {
      const result = await this.aiService.generateCompletion(prompt)
      // AI 결과 파싱 및 변환
      return { errors: [] }
    } catch (error) {
      console.error('AI analysis failed:', error)
      return { errors: [] }
    }
  }

  /**
   * 프로시저 파싱
   */
  private parseProcedures(code: string, module: string): VBAProcedure[] {
    const procedures: VBAProcedure[] = []
    const lines = code.split('\n')
    
    const procPattern = /^\s*(Public|Private|Friend)?\s*(Sub|Function|Property\s+(Get|Let|Set))\s+(\w+)\s*\(([^)]*)\)/i
    
    let currentProc: VBAProcedure | null = null
    let procBody: string[] = []
    
    lines.forEach((line, index) => {
      const match = line.match(procPattern)
      
      if (match) {
        // 이전 프로시저 저장
        if (currentProc) {
          currentProc.body = procBody.join('\n')
          currentProc.endLine = index
          procedures.push(currentProc)
        }
        
        // 새 프로시저 시작
        const [, visibility, procType, , procName, params] = match
        currentProc = {
          name: procName,
          type: procType.startsWith('Property') ? 'Property' : procType as 'Sub' | 'Function',
          visibility: (visibility || 'Public') as 'Public' | 'Private' | 'Friend',
          parameters: params.split(',').map(p => p.trim()).filter(p => p),
          startLine: index + 1,
          endLine: index + 1,
          body: ''
        }
        procBody = []
      } else if (currentProc) {
        if (line.match(/^\s*End\s+(Sub|Function|Property)\s*$/i)) {
          currentProc.body = procBody.join('\n')
          currentProc.endLine = index + 1
          procedures.push(currentProc)
          currentProc = null
          procBody = []
        } else {
          procBody.push(line)
        }
      }
    })
    
    return procedures
  }

  /**
   * 추천사항 생성
   */
  private generateRecommendations(errors: VBAError[], securityIssues: SecurityIssue[]): string[] {
    const recommendations: string[] = []
    
    if (errors.some(e => e.type === 'performance')) {
      recommendations.push('Select/Activate 사용을 피하고 객체를 직접 참조하세요')
    }
    
    if (securityIssues.length > 0) {
      recommendations.push('보안 검토를 수행하고 위험한 API 사용을 제한하세요')
    }
    
    if (!errors.some(e => e.message.includes('Option Explicit'))) {
      recommendations.push('모든 모듈에 Option Explicit를 선언하세요')
    }
    
    recommendations.push('정기적으로 코드 리팩토링을 수행하세요')
    recommendations.push('단위 테스트를 작성하여 코드 품질을 향상시키세요')
    
    return recommendations
  }

  /**
   * VBA 코드 자동 수정
   */
  async fixVBACode(code: string, errors: VBAError[]): Promise<string> {
    let fixedCode = code
    const lines = fixedCode.split('\n')
    
    // Option Explicit 추가
    const optionExplicitError = errors.find(e => e.message.includes('Option Explicit'))
    if (optionExplicitError && optionExplicitError.autoFixable) {
      lines.unshift('Option Explicit')
    }
    
    // Select/Activate 제거
    errors
      .filter(e => e.type === 'performance' && e.message.includes('Select/Activate'))
      .forEach(error => {
        const lineIndex = error.line - 1
        if (lines[lineIndex]) {
          // 예: Range("A1").Select -> 직접 참조로 변경
          lines[lineIndex] = lines[lineIndex]
            .replace(/\.Select\b/, '')
            .replace(/\.Activate\b/, '')
        }
      })
    
    // AI를 통한 고급 수정
    const complexErrors = errors.filter(e => !e.autoFixable)
    if (complexErrors.length > 0) {
      const aiFixedCode = await this.aiFixVBACode(lines.join('\n'), complexErrors)
      return aiFixedCode
    }
    
    return lines.join('\n')
  }

  /**
   * AI를 통한 VBA 코드 수정
   */
  private async aiFixVBACode(code: string, errors: VBAError[]): Promise<string> {
    const errorDescriptions = errors.map(e => 
      `- ${e.line}번 줄: ${e.message} (${e.suggestion || '수동 수정 필요'})`
    ).join('\n')
    
    const prompt = `
    다음 VBA 코드에서 발견된 문제들을 수정해주세요:
    
    코드:
    ${code}
    
    발견된 문제:
    ${errorDescriptions}
    
    수정된 전체 코드를 반환해주세요.
    `
    
    try {
      const result = await this.aiService.generateCompletion(prompt)
      return result.content
    } catch (error) {
      console.error('AI code fix failed:', error)
      return code
    }
  }
}