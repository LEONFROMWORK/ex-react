import { Result } from '@/Common/Result'
import { JSVBAExtractor, VBAExtractionResult } from './JSVBAExtractor'
import { promises as fs } from 'fs'
import { getExcelAnalysisCacheService } from '@/Services/Cache/ExcelAnalysisCacheService'

// Request Schema
export interface ExtractVBACodeRequest {
  fileId?: string
  fileBuffer?: Buffer
  fileName: string
  userId: string
  includeSecurityScan?: boolean
}

// Response Schema
export interface ExtractVBACodeResponse {
  extractionId: string
  fileName: string
  extractedAt: Date
  vbaModules: Array<{
    name: string
    type: string
    code: string
    lineCount: number
  }>
  metadata: {
    hasVBA: boolean
    totalModules: number
    totalLines: number
    extractionTime: number
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
}

// Errors
export const ExtractVBACodeErrors = {
  InvalidRequest: {
    code: 'VBA_EXTRACT.INVALID_REQUEST',
    message: '유효하지 않은 요청입니다. fileId 또는 fileBuffer를 제공해주세요.',
  },
  FileNotFound: {
    code: 'VBA_EXTRACT.FILE_NOT_FOUND',
    message: '파일을 찾을 수 없습니다.',
  },
  NotExcelFile: {
    code: 'VBA_EXTRACT.NOT_EXCEL_FILE',
    message: 'Excel 파일이 아닙니다. .xlsx, .xlsm, .xls 파일만 지원됩니다.',
  },
  ExtractionFailed: {
    code: 'VBA_EXTRACT.EXTRACTION_FAILED',
    message: 'VBA 코드 추출에 실패했습니다.',
  },
} as const

// Validator
export class ExtractVBACodeValidator {
  validate(request: ExtractVBACodeRequest): Result<ExtractVBACodeRequest> {
    // fileId 또는 fileBuffer 중 하나는 필수
    if (!request.fileId && !request.fileBuffer) {
      return Result.failure(ExtractVBACodeErrors.InvalidRequest)
    }

    // 파일명 검증
    if (!request.fileName || request.fileName.trim() === '') {
      return Result.failure({
        code: 'VBA_EXTRACT.INVALID_FILENAME',
        message: '파일명을 제공해주세요.',
      })
    }

    // Excel 파일 확장자 검증
    const ext = request.fileName.toLowerCase().split('.').pop()
    if (!ext || !['xlsx', 'xlsm', 'xls', 'xlsb'].includes(ext)) {
      return Result.failure(ExtractVBACodeErrors.NotExcelFile)
    }

    // userId 검증
    if (!request.userId || request.userId.trim() === '') {
      return Result.failure({
        code: 'VBA_EXTRACT.INVALID_USER',
        message: '사용자 ID가 필요합니다.',
      })
    }

    return Result.success(request)
  }
}

// Handler
export class ExtractVBACodeHandler {
  private extractor: JSVBAExtractor
  private cacheService = getExcelAnalysisCacheService()

  constructor() {
    this.extractor = new JSVBAExtractor()
  }

  async handle(request: ExtractVBACodeRequest): Promise<Result<ExtractVBACodeResponse>> {
    try {
      // 1. 파일 버퍼 가져오기
      let fileBuffer: Buffer

      if (request.fileBuffer) {
        fileBuffer = request.fileBuffer
      } else if (request.fileId) {
        // 파일 시스템에서 읽기 (실제로는 스토리지 서비스 사용)
        const filePath = `/tmp/uploads/${request.fileId}`
        try {
          fileBuffer = await fs.readFile(filePath)
        } catch (error) {
          return Result.failure(ExtractVBACodeErrors.FileNotFound)
        }
      } else {
        return Result.failure(ExtractVBACodeErrors.InvalidRequest)
      }

      // 2. 캐시 확인
      const cachedResult = await this.cacheService.getVBAExtraction(fileBuffer)
      if (cachedResult.isSuccess && cachedResult.value) {
        console.log('VBA 추출 캐시 히트')
        
        // 보안 스캔이 필요한 경우 추가 처리
        if (request.includeSecurityScan && !cachedResult.value.securityScan) {
          const modules = cachedResult.value.vbaModules.map((m: any) => ({
            moduleName: m.name,
            moduleType: m.type,
            code: m.code,
          }))
          const securityScan = await this.extractor.scanVBASecurity(modules)
          cachedResult.value.securityScan = securityScan
        }
        
        return Result.success(cachedResult.value)
      }

      // 3. VBA 코드 추출
      const extractionResult = await this.extractor.extractVBACode(fileBuffer)
      
      if (!extractionResult.isSuccess) {
        return Result.failure(extractionResult.error)
      }

      const extraction = extractionResult.value

      // 3. 응답 데이터 구성
      const response: ExtractVBACodeResponse = {
        extractionId: this.generateExtractionId(),
        fileName: request.fileName,
        extractedAt: new Date(),
        vbaModules: extraction.modules.map(module => ({
          name: module.moduleName,
          type: module.moduleType,
          code: module.code,
          lineCount: module.code.split('\n').length,
        })),
        metadata: {
          hasVBA: extraction.modules.length > 0,
          totalModules: extraction.metadata.totalModules,
          totalLines: extraction.metadata.totalLines,
          extractionTime: extraction.metadata.extractionTime
        },
      }

      // 4. 보안 스캔 (옵션)
      if (request.includeSecurityScan && extraction.modules.length > 0) {
        const securityScan = await this.extractor.scanVBASecurity(extraction.modules)
        response.securityScan = securityScan
      }

      // 5. 결과 캐싱
      await this.cacheService.cacheVBAExtraction(fileBuffer, response)

      return Result.success(response)
    } catch (error) {
      console.error('VBA 추출 핸들러 오류:', error)
      return Result.failure(ExtractVBACodeErrors.ExtractionFailed)
    }
  }

  private generateExtractionId(): string {
    return `vba_extract_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// Convenience export
const ExtractVBACodeModule = {
  Request: {} as ExtractVBACodeRequest,
  Response: {} as ExtractVBACodeResponse,
  Validator: ExtractVBACodeValidator,
  Handler: ExtractVBACodeHandler,
  Errors: ExtractVBACodeErrors,
}

export default ExtractVBACodeModule