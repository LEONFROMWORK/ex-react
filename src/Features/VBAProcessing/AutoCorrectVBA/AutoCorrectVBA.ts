/**
 * VBA 자동 수정 기능 - Vertical Slice Implementation
 * SOLID 원칙을 적용한 완전한 기능 단위
 */

import { Result } from '@/Common/Result'
// Temporary type definitions - TODO: Move to separate files
interface VBAAnalysisResult {
  errors: VBAError[]
  warnings: any[]
  suggestions: any[]
}

interface VBAError {
  id: string
  type: string
  severity: string
  line: number
  message: string
  code?: string
}

interface VBACorrectionResult {
  success: boolean
  correctedErrors: VBAError[]
  newCode: string
}

// Temporary interfaces - TODO: Move to separate files
export interface IVBACorrector {
  correctError(error: VBAError, code: string): Promise<string>
}

export interface IVBAValidator {
  validateCode(code: string): Promise<VBAAnalysisResult>
}

export interface IVBABackupService {
  createBackup(fileId: string): Promise<string>
}
import { StreamingAIAnalyzer } from '@/lib/ai/streaming-analyzer'
import { RAGSystem } from '@/lib/ai/rag-system'

// === REQUEST / RESPONSE MODELS ===
export interface AutoCorrectVBARequest {
  fileId: string
  userId: string
  vbaErrors: VBAError[]
  correctionOptions: {
    preserveComments: boolean
    optimizePerformance: boolean
    enforceStandards: boolean
    backupOriginal: boolean
  }
  maxCorrectionTime?: number
}

export interface AutoCorrectVBAResponse {
  success: boolean
  correctedCode: string
  correctionSummary: VBACorrectionSummary
  backupId?: string
  warnings: string[]
  appliedFixes: VBAFixRecord[]
  estimatedPerformanceGain: number
}

export interface VBACorrectionSummary {
  totalErrors: number
  fixedErrors: number
  skippedErrors: number
  codeQualityScore: number
  securityIssuesResolved: number
  performanceOptimizations: number
  processingTime: number
  aiTierUsed: number
  costIncurred: number
}

export interface VBAFixRecord {
  errorId: string
  errorType: string
  lineNumber: number
  originalCode: string
  correctedCode: string
  explanation: string
  confidence: number
  aiJustification: string
}

// === DOMAIN ERRORS ===
export class VBAProcessingError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message)
    this.name = 'VBAProcessingError'
  }
}

// === INTERFACES (Dependency Inversion Principle) ===
export interface IVBACorrector {
  correctCode(
    originalCode: string,
    errors: VBAError[],
    options: CorrectionOptions
  ): Promise<Result<CorrectedVBACode>>
}

export interface IVBAValidator {
  validateCorrectedCode(
    original: string,
    corrected: string
  ): Promise<Result<ValidationResult>>
}

export interface IVBABackupService {
  createBackup(
    fileId: string,
    originalCode: string,
    metadata: BackupMetadata
  ): Promise<Result<string>>
  
  restoreFromBackup(backupId: string): Promise<Result<string>>
}

export interface IVBASecurityAnalyzer {
  analyzeSecurityRisks(code: string): Promise<Result<SecurityAnalysisResult>>
}

// === CORE BUSINESS LOGIC (Single Responsibility Principle) ===
export class AutoCorrectVBAHandler {
  constructor(
    private vbaCorrector: IVBACorrector,
    private vbaValidator: IVBAValidator,
    private backupService: IVBABackupService,
    private securityAnalyzer: IVBASecurityAnalyzer,
    private streamingAI: StreamingAIAnalyzer,
    private ragSystem: RAGSystem
  ) {}

  async handle(request: AutoCorrectVBARequest): Promise<Result<AutoCorrectVBAResponse>> {
    try {
      // 1. Input Validation
      const validationResult = this.validateRequest(request)
      if (!validationResult.isSuccess) {
        return Result.failure(validationResult.error)
      }

      // 2. Security Pre-check
      const securityCheck = await this.performSecurityCheck(request)
      if (!securityCheck.isSuccess) {
        return Result.failure(securityCheck.error)
      }

      // 3. Create Backup (if requested)
      let backupId: string | undefined
      if (request.correctionOptions.backupOriginal) {
        const backupResult = await this.createBackup(request)
        if (!backupResult.isSuccess) {
          return Result.failure(backupResult.error)
        }
        backupId = backupResult.value
      }

      // 4. Perform AI-Enhanced Correction
      const correctionResult = await this.performCorrection(request)
      if (!correctionResult.isSuccess) {
        return Result.failure(correctionResult.error)
      }

      // 5. Validate Corrected Code
      const validationResult2 = await this.validateCorrection(
        request,
        correctionResult.value
      )
      if (!validationResult2.isSuccess) {
        return Result.failure(validationResult2.error)
      }

      // 6. Build Response
      const response = this.buildResponse(
        correctionResult.value,
        validationResult2.value,
        backupId
      )

      return Result.success(response)

    } catch (error) {
      return Result.failure(
        new VBAProcessingError(
          'VBA 자동 수정 중 예상치 못한 오류가 발생했습니다',
          'UNEXPECTED_ERROR',
          { originalError: error }
        )
      )
    }
  }

  private validateRequest(request: AutoCorrectVBARequest): Result<void> {
    if (!request.fileId) {
      return Result.failure(new VBAProcessingError('파일 ID가 필요합니다', 'MISSING_FILE_ID'))
    }

    if (!request.userId) {
      return Result.failure(new VBAProcessingError('사용자 ID가 필요합니다', 'MISSING_USER_ID'))
    }

    if (!request.vbaErrors || request.vbaErrors.length === 0) {
      return Result.failure(new VBAProcessingError('수정할 VBA 오류가 없습니다', 'NO_ERRORS_TO_FIX'))
    }

    return Result.success(undefined)
  }

  private async performSecurityCheck(
    request: AutoCorrectVBARequest
  ): Promise<Result<void>> {
    // Extract VBA code from errors for security analysis
    const codeToAnalyze = request.vbaErrors
      .map(error => error.code)
      .join('\n')

    const securityResult = await this.securityAnalyzer.analyzeSecurityRisks(codeToAnalyze)
    
    if (!securityResult.isSuccess) {
      return Result.failure(securityResult.error)
    }

    const securityAnalysis = securityResult.value
    
    // Block high-risk code
    if (securityAnalysis.riskLevel === 'HIGH') {
      return Result.failure(
        new VBAProcessingError(
          '보안 위험이 높은 VBA 코드는 자동 수정할 수 없습니다',
          'HIGH_SECURITY_RISK',
          { risks: securityAnalysis.detectedRisks }
        )
      )
    }

    return Result.success(undefined)
  }

  private async createBackup(
    request: AutoCorrectVBARequest
  ): Promise<Result<string>> {
    const originalCode = request.vbaErrors
      .map(error => error.code)
      .join('\n')

    const metadata: BackupMetadata = {
      userId: request.userId,
      fileId: request.fileId,
      timestamp: new Date(),
      errorCount: request.vbaErrors.length,
      correctionOptions: request.correctionOptions
    }

    const backupId = await this.backupService.createBackup(request.fileId)
    return Result.success(backupId)
  }

  private async performCorrection(
    request: AutoCorrectVBARequest
  ): Promise<Result<CorrectedVBACode>> {
    // RAG-Enhanced Correction for better results
    const ragPrompt = await this.buildRAGEnhancedPrompt(request.vbaErrors)
    
    // Stream AI correction for real-time feedback
    const correctionResult = await this.streamingAI.analyzeWithStreaming(
      ragPrompt,
      {
        systemPrompt: this.buildVBACorrectionSystemPrompt(request.correctionOptions),
        maxTokens: 4000,
        temperature: 0.1, // Low temperature for code generation
        chunkCallback: (chunk) => {
          // Real-time progress updates could be sent here
          console.log(`VBA 수정 진행: ${chunk.content.slice(0, 50)}...`)
        }
      }
    )

    if (!correctionResult.finalResult.content) {
      return Result.failure(
        new VBAProcessingError('AI 수정 결과를 받을 수 없습니다', 'AI_CORRECTION_FAILED')
      )
    }

    // Parse AI response and extract corrected code
    const parsedCorrection = this.parseAICorrectionResponse(
      correctionResult.finalResult.content
    )

    return Result.success(parsedCorrection)
  }

  private async buildRAGEnhancedPrompt(errors: VBAError[]): Promise<string> {
    // Search for similar VBA errors in knowledge base
    const similarSolutions = await Promise.all(
      errors.map(error => 
        this.ragSystem.searchSimilarSolutions(
          `VBA ${error.type}: ${error.description}`,
          { categories: ['vba'], threshold: 0.75 }
        )
      )
    )

    const contextSections = similarSolutions
      .flat()
      .slice(0, 5) // Top 5 similar solutions
      .map((solution, index) => `
**참조 해결책 ${index + 1}** (유사도: ${(solution.similarity * 100).toFixed(1)}%)
오류 유형: ${solution.metadata.errorType}
해결 방법: ${solution.metadata.solution}
신뢰도: ${solution.metadata.confidence}
      `.trim())
      .join('\n\n')

    const errorDescriptions = errors.map((error, index) => `
**오류 ${index + 1}**
유형: ${error.type}
라인: ${error.lineNumber}
설명: ${error.description}
코드: ${error.code}
    `.trim()).join('\n\n')

    return `
다음은 유사한 VBA 오류 해결책들입니다:

${contextSections}

---

위의 참조 정보를 바탕으로 다음 VBA 오류들을 수정해주세요:

${errorDescriptions}

**수정 요구사항:**
1. 참조 해결책을 활용하되 현재 코드에 맞게 조정
2. 코드의 기능성을 유지하면서 오류만 수정
3. 성능 최적화 가능한 부분이 있다면 개선
4. 각 수정 사항에 대한 설명 제공
5. 신뢰도를 "신뢰도: 0.XX" 형식으로 표시
    `.trim()
  }

  private buildVBACorrectionSystemPrompt(options: any): string {
    return `
당신은 VBA 코드 수정 전문가입니다. 다음 원칙을 준수하여 코드를 수정하세요:

**수정 원칙:**
1. 기능성 유지: 원본 코드의 의도된 기능을 변경하지 마세요
2. 최소 침습: 오류 수정에 필요한 최소한의 변경만 수행
3. 성능 고려: ${options.optimizePerformance ? '성능 최적화를 적극 적용' : '성능보다 안정성 우선'}
4. 주석 처리: ${options.preserveComments ? '기존 주석을 모두 보존' : '불필요한 주석 정리 허용'}
5. 표준 준수: ${options.enforceStandards ? 'VBA 코딩 표준을 엄격히 적용' : '기존 스타일 최대한 유지'}

**응답 형식:**
\`\`\`vba
[수정된 VBA 코드]
\`\`\`

**수정 내역:**
1. [수정 사항 1 설명]
2. [수정 사항 2 설명]

**신뢰도:** [0.00-1.00]
    `.trim()
  }

  private parseAICorrectionResponse(response: string): CorrectedVBACode {
    // Extract VBA code from response
    const codeMatch = response.match(/```vba\n([\s\S]*?)\n```/i)
    const correctedCode = codeMatch ? codeMatch[1] : ''

    // Extract confidence
    const confidenceMatch = response.match(/신뢰도:\s*(\d*\.?\d+)/i)
    const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.7

    // Extract corrections
    const correctionsSection = response.split('**수정 내역:**')[1] || ''
    const corrections = this.extractCorrections(correctionsSection)

    return {
      correctedCode,
      confidence,
      corrections,
      explanation: response,
      estimatedPerformanceGain: this.estimatePerformanceGain(corrections)
    }
  }

  private extractCorrections(correctionsText: string): VBAFixRecord[] {
    // Parse numbered list of corrections
    const correctionLines = correctionsText
      .split('\n')
      .filter(line => line.match(/^\d+\./))
      .map((line, index) => ({
        errorId: `fix-${index + 1}`,
        errorType: 'general',
        lineNumber: 0, // Would need more sophisticated parsing
        originalCode: '',
        correctedCode: '',
        explanation: line.replace(/^\d+\.\s*/, ''),
        confidence: 0.8,
        aiJustification: line
      }))

    return correctionLines
  }

  private estimatePerformanceGain(corrections: VBAFixRecord[]): number {
    // Simple heuristic for performance gain estimation
    const performanceKeywords = ['loop', 'select', 'variant', 'redim', 'collection']
    
    let gainScore = 0
    corrections.forEach(correction => {
      performanceKeywords.forEach(keyword => {
        if (correction.explanation.toLowerCase().includes(keyword)) {
          gainScore += 10
        }
      })
    })

    return Math.min(gainScore, 100) // Cap at 100%
  }

  private async validateCorrection(
    request: AutoCorrectVBARequest,
    correctedCode: CorrectedVBACode
  ): Promise<Result<ValidationResult>> {
    const originalCode = request.vbaErrors
      .map(error => error.code)
      .join('\n')

    return await this.vbaValidator.validateCorrectedCode(
      originalCode,
      correctedCode.correctedCode
    )
  }

  private buildResponse(
    correctedCode: CorrectedVBACode,
    validation: ValidationResult,
    backupId?: string
  ): AutoCorrectVBAResponse {
    return {
      success: true,
      correctedCode: correctedCode.correctedCode,
      correctionSummary: {
        totalErrors: correctedCode.corrections.length,
        fixedErrors: correctedCode.corrections.length,
        skippedErrors: 0,
        codeQualityScore: validation.qualityScore,
        securityIssuesResolved: validation.securityIssuesResolved,
        performanceOptimizations: this.countPerformanceOptimizations(correctedCode.corrections),
        processingTime: Date.now(), // Would track actual time
        aiTierUsed: 1, // Would come from AI service
        costIncurred: 0.05 // Would calculate actual cost
      },
      backupId,
      warnings: validation.warnings,
      appliedFixes: correctedCode.corrections,
      estimatedPerformanceGain: correctedCode.estimatedPerformanceGain
    }
  }

  private countPerformanceOptimizations(corrections: VBAFixRecord[]): number {
    return corrections.filter(c => 
      c.explanation.toLowerCase().includes('성능') ||
      c.explanation.toLowerCase().includes('최적화') ||
      c.explanation.toLowerCase().includes('performance')
    ).length
  }
}

// === SUPPORTING TYPES ===
interface CorrectionOptions {
  preserveComments: boolean
  optimizePerformance: boolean
  enforceStandards: boolean
}

interface CorrectedVBACode {
  correctedCode: string
  confidence: number
  corrections: VBAFixRecord[]
  explanation: string
  estimatedPerformanceGain: number
}

interface ValidationResult {
  isValid: boolean
  warnings: string[]
  qualityScore: number
  securityIssuesResolved: number
}

interface BackupMetadata {
  userId: string
  fileId: string
  timestamp: Date
  errorCount: number
  correctionOptions: any
}

interface SecurityAnalysisResult {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  detectedRisks: string[]
}

// === USAGE EXAMPLE ===
// Temporary implementations - TODO: Move to separate files
class VBACorrectorImpl implements IVBACorrector {
  async correctError(error: VBAError, code: string): Promise<string> {
    return code // TODO: Implement actual correction logic
  }
}

class VBAValidatorImpl implements IVBAValidator {
  async validateCode(code: string): Promise<VBAAnalysisResult> {
    return { errors: [], warnings: [], suggestions: [] }
  }
}

class VBABackupServiceImpl implements IVBABackupService {
  async createBackup(fileId: string): Promise<string> {
    return `backup-${fileId}-${Date.now()}`
  }
}

class VBASecurityAnalyzerImpl {
  async analyzeSecurityRisks(code: string): Promise<any> {
    return { risks: [], vulnerabilities: [] }
  }
}

export async function autoCorrectVBA(
  request: AutoCorrectVBARequest
): Promise<Result<AutoCorrectVBAResponse>> {
  // Dependency injection - following Dependency Inversion Principle
  const handler = new AutoCorrectVBAHandler(
    new VBACorrectorImpl(),
    new VBAValidatorImpl(),
    new VBABackupServiceImpl(),
    new VBASecurityAnalyzerImpl(),
    new StreamingAIAnalyzer(process.env.OPENROUTER_API_KEY!),
    new RAGSystem(process.env.OPENROUTER_API_KEY!)
  )

  return await handler.handle(request)
}