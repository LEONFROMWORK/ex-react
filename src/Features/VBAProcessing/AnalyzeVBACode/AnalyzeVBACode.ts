import { Result } from '@/Common/Result'
import { VBACodeAnalyzer, VBAAnalysisResult } from './VBACodeAnalyzer'
import { JSVBAExtractor, VBAModule } from '../ExtractVBACode/JSVBAExtractor'
import { getExcelAnalysisCacheService } from '@/Services/Cache/ExcelAnalysisCacheService'

// Request Schema
export interface AnalyzeVBACodeRequest {
  modules: Array<{
    name: string
    type: string
    code: string
  }>
  includeSecurityScan?: boolean
  includeBestPractices?: boolean
  userId: string
}

// Response Schema
export interface AnalyzeVBACodeResponse {
  analysisId: string
  analyzedAt: Date
  moduleAnalysis: Array<{
    moduleName: string
    moduleType: string
    analysis: VBAAnalysisResult
  }>
  summary: {
    totalModules: number
    avgComplexity: number
    avgQualityScore: number
    totalIssues: number
    criticalIssues: number
    totalDependencies: number
  }
  securityScan?: {
    threats: Array<{
      module: string
      line: number
      type: string
      severity: 'low' | 'medium' | 'high' | 'critical'
      description: string
    }>
    summary: {
      totalThreats: number
      criticalCount: number
      highCount: number
      mediumCount: number
      lowCount: number
    }
  }
  recommendations: Array<{
    category: 'refactoring' | 'security' | 'performance' | 'maintainability'
    priority: 'low' | 'medium' | 'high'
    title: string
    description: string
    modules: string[]
  }>
}

// Errors
export const AnalyzeVBACodeErrors = {
  InvalidRequest: {
    code: 'VBA_ANALYZE.INVALID_REQUEST',
    message: '유효하지 않은 요청입니다. 모듈 정보를 제공해주세요.',
  },
  NoModules: {
    code: 'VBA_ANALYZE.NO_MODULES',
    message: '분석할 VBA 모듈이 없습니다.',
  },
  AnalysisFailed: {
    code: 'VBA_ANALYZE.ANALYSIS_FAILED',
    message: 'VBA 코드 분석에 실패했습니다.',
  },
} as const

// Validator
export class AnalyzeVBACodeValidator {
  validate(request: AnalyzeVBACodeRequest): Result<AnalyzeVBACodeRequest> {
    if (!request.modules || !Array.isArray(request.modules)) {
      return Result.failure(AnalyzeVBACodeErrors.InvalidRequest)
    }

    if (request.modules.length === 0) {
      return Result.failure(AnalyzeVBACodeErrors.NoModules)
    }

    // 각 모듈 검증
    for (const vbaModule of request.modules) {
      if (!vbaModule.name || !vbaModule.code) {
        return Result.failure({
          code: 'VBA_ANALYZE.INVALID_MODULE',
          message: `모듈 '${vbaModule.name || '이름 없음'}'이 유효하지 않습니다`,
        })
      }
    }

    if (!request.userId || request.userId.trim() === '') {
      return Result.failure({
        code: 'VBA_ANALYZE.INVALID_USER',
        message: '사용자 ID가 필요합니다.',
      })
    }

    return Result.success(request)
  }
}

// Handler
export class AnalyzeVBACodeHandler {
  private analyzer: VBACodeAnalyzer
  private oleToolsAdapter: any // TODO: Implement PythonOleToolsAdapter
  private cacheService = getExcelAnalysisCacheService()

  constructor() {
    this.analyzer = new VBACodeAnalyzer()
    // TODO: Replace with actual PythonOleToolsAdapter implementation
    this.oleToolsAdapter = {
      analyzeVBASecurity: async () => ({ suspiciousPatterns: [], securityIssues: [] })
    }
  }

  async handle(request: AnalyzeVBACodeRequest): Promise<Result<AnalyzeVBACodeResponse>> {
    try {
      // 캐시 확인
      const cachedResult = await this.cacheService.getVBAAnalysis(request.modules)
      if (cachedResult.isSuccess && cachedResult.value) {
        console.log('VBA 분석 캐시 히트')
        return Result.success(cachedResult.value)
      }
      // 1. 각 모듈 분석
      const moduleAnalysis: AnalyzeVBACodeResponse['moduleAnalysis'] = []
      
      for (const vbaModule of request.modules) {
        const analysisResult = this.analyzer.analyze(vbaModule.code, vbaModule.name)
        
        if (!analysisResult.isSuccess) {
          console.error(`모듈 '${vbaModule.name}' 분석 실패:`, analysisResult.error)
          continue
        }

        moduleAnalysis.push({
          moduleName: vbaModule.name,
          moduleType: vbaModule.type,
          analysis: analysisResult.value,
        })
      }

      // 2. 요약 통계 계산
      const summary = this.calculateSummary(moduleAnalysis)

      // 3. 권장사항 생성
      const recommendations = this.generateRecommendations(moduleAnalysis, summary)

      // 4. 응답 구성
      const response: AnalyzeVBACodeResponse = {
        analysisId: this.generateAnalysisId(),
        analyzedAt: new Date(),
        moduleAnalysis,
        summary,
        recommendations,
      }

      // 5. 보안 스캔 (옵션)
      if (request.includeSecurityScan) {
        const vbaModules: VBAModule[] = request.modules.map(m => ({
          moduleName: m.name,
          moduleType: m.type as any,
          code: m.code,
        }))
        
        const securityScan = await this.oleToolsAdapter.scanVBASecurity(vbaModules)
        response.securityScan = securityScan
      }

      // 결과 캐싱
      await this.cacheService.cacheVBAAnalysis(request.modules, response)

      return Result.success(response)
    } catch (error) {
      console.error('VBA 분석 핸들러 오류:', error)
      return Result.failure(AnalyzeVBACodeErrors.AnalysisFailed)
    }
  }

  private calculateSummary(
    moduleAnalysis: AnalyzeVBACodeResponse['moduleAnalysis']
  ): AnalyzeVBACodeResponse['summary'] {
    if (moduleAnalysis.length === 0) {
      return {
        totalModules: 0,
        avgComplexity: 0,
        avgQualityScore: 0,
        totalIssues: 0,
        criticalIssues: 0,
        totalDependencies: 0,
      }
    }

    const totalComplexity = moduleAnalysis.reduce(
      (sum, m) => sum + m.analysis.complexity.cyclomaticComplexity,
      0
    )
    const totalQualityScore = moduleAnalysis.reduce(
      (sum, m) => sum + m.analysis.quality.score,
      0
    )
    const totalIssues = moduleAnalysis.reduce(
      (sum, m) => sum + m.analysis.quality.issues.length,
      0
    )
    const criticalIssues = moduleAnalysis.reduce(
      (sum, m) => sum + m.analysis.quality.issues.filter(i => i.severity === 'error').length,
      0
    )
    const totalDependencies = moduleAnalysis.reduce(
      (sum, m) => sum + 
        m.analysis.dependencies.externalReferences.length +
        m.analysis.dependencies.apiCalls.length +
        m.analysis.dependencies.fileOperations.length +
        m.analysis.dependencies.registryAccess.length,
      0
    )

    return {
      totalModules: moduleAnalysis.length,
      avgComplexity: Math.round(totalComplexity / moduleAnalysis.length),
      avgQualityScore: Math.round(totalQualityScore / moduleAnalysis.length),
      totalIssues,
      criticalIssues,
      totalDependencies,
    }
  }

  private generateRecommendations(
    moduleAnalysis: AnalyzeVBACodeResponse['moduleAnalysis'],
    summary: AnalyzeVBACodeResponse['summary']
  ): AnalyzeVBACodeResponse['recommendations'] {
    const recommendations: AnalyzeVBACodeResponse['recommendations'] = []

    // 복잡도 관련 권장사항
    if (summary.avgComplexity > 15) {
      const complexModules = moduleAnalysis
        .filter(m => m.analysis.complexity.cyclomaticComplexity > 15)
        .map(m => m.moduleName)

      recommendations.push({
        category: 'refactoring',
        priority: 'high',
        title: '높은 복잡도 개선',
        description: '일부 모듈의 순환 복잡도가 높습니다. 함수를 더 작은 단위로 분리하여 유지보수성을 개선하세요.',
        modules: complexModules,
      })
    }

    // 품질 점수 관련 권장사항
    if (summary.avgQualityScore < 70) {
      const lowQualityModules = moduleAnalysis
        .filter(m => m.analysis.quality.score < 70)
        .map(m => m.moduleName)

      recommendations.push({
        category: 'maintainability',
        priority: 'medium',
        title: '코드 품질 개선',
        description: '코드 품질 점수가 낮습니다. 명명 규칙, 에러 처리, 코드 구조를 개선하세요.',
        modules: lowQualityModules,
      })
    }

    // 외부 의존성 관련 권장사항
    if (summary.totalDependencies > 10) {
      const highDependencyModules = moduleAnalysis
        .filter(m => {
          const deps = m.analysis.dependencies
          return (deps.externalReferences.length + deps.apiCalls.length + 
                  deps.fileOperations.length + deps.registryAccess.length) > 3
        })
        .map(m => m.moduleName)

      recommendations.push({
        category: 'security',
        priority: 'medium',
        title: '외부 의존성 검토',
        description: '많은 외부 의존성이 발견되었습니다. 보안과 성능을 위해 필요한 것만 사용하도록 검토하세요.',
        modules: highDependencyModules,
      })
    }

    // 레지스트리 접근 관련 권장사항
    const registryAccessModules = moduleAnalysis
      .filter(m => m.analysis.dependencies.registryAccess.length > 0)
      .map(m => m.moduleName)

    if (registryAccessModules.length > 0) {
      recommendations.push({
        category: 'security',
        priority: 'high',
        title: '레지스트리 접근 주의',
        description: '레지스트리 접근이 감지되었습니다. 꼭 필요한 경우가 아니라면 제거하고, 필요시 적절한 권한 처리를 구현하세요.',
        modules: registryAccessModules,
      })
    }

    // 성능 관련 권장사항
    const largeModules = moduleAnalysis
      .filter(m => m.analysis.complexity.linesOfCode > 500)
      .map(m => m.moduleName)

    if (largeModules.length > 0) {
      recommendations.push({
        category: 'performance',
        priority: 'low',
        title: '모듈 크기 최적화',
        description: '일부 모듈이 너무 큽니다. 기능별로 모듈을 분리하여 로딩 시간과 메모리 사용량을 개선하세요.',
        modules: largeModules,
      })
    }

    return recommendations
  }

  private generateAnalysisId(): string {
    return `vba_analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// Convenience export
const AnalyzeVBACodeModule = {
  Request: {} as AnalyzeVBACodeRequest,
  Response: {} as AnalyzeVBACodeResponse,
  Validator: AnalyzeVBACodeValidator,
  Handler: AnalyzeVBACodeHandler,
  Errors: AnalyzeVBACodeErrors,
}

export default AnalyzeVBACodeModule