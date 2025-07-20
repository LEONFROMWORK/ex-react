import { Result } from '@/Common/Result'
import { container } from '@/Infrastructure/DependencyInjection/Container'
import crypto from 'crypto'

interface ExcelAnalysisCache {
  fileHash: string
  analysisType: string
  result: any
  metadata: {
    fileName: string
    fileSize: number
    analyzedAt: Date
    version: string
  }
}

export class ExcelAnalysisCacheService {
  private cache: any
  private readonly namespace = 'excel-analysis'
  private readonly defaultTTL = 60 * 60 * 24 * 7 // 7일
  private readonly version = '1.0.0'

  constructor() {
    this.cache = container.getCache()
  }

  // 파일 해시 생성
  private generateFileHash(fileBuffer: Buffer): string {
    return crypto.createHash('sha256').update(fileBuffer).digest('hex')
  }

  // 캐시 키 생성
  private generateCacheKey(fileHash: string, analysisType: string): string {
    return `${fileHash}:${analysisType}`
  }

  // Excel 생성 결과 캐싱
  async cacheExcelGeneration(
    prompt: string,
    result: any,
    ttl?: number
  ): Promise<Result<void>> {
    try {
      const promptHash = crypto.createHash('sha256').update(prompt).digest('hex')
      const cacheKey = this.generateCacheKey(promptHash, 'generation')

      const cacheData: ExcelAnalysisCache = {
        fileHash: promptHash,
        analysisType: 'generation',
        result,
        metadata: {
          fileName: result.fileName || 'generated.xlsx',
          fileSize: result.fileSize || 0,
          analyzedAt: new Date(),
          version: this.version,
        },
      }

      return await this.cache.set(cacheKey, cacheData, {
        ttl: ttl || this.defaultTTL,
        namespace: this.namespace,
        compress: true,
      })
    } catch (error) {
      console.error('Excel 생성 캐싱 오류:', error)
      return Result.failure({
        code: 'EXCEL_CACHE.GENERATION_ERROR',
        message: 'Excel 생성 결과 캐싱에 실패했습니다',
      })
    }
  }

  // Excel 생성 캐시 조회
  async getExcelGeneration(prompt: string): Promise<Result<any | null>> {
    try {
      const promptHash = crypto.createHash('sha256').update(prompt).digest('hex')
      const cacheKey = this.generateCacheKey(promptHash, 'generation')

      const cached = await this.cache.get(cacheKey, {
        namespace: this.namespace,
        compress: true,
      })

      if (!cached.isSuccess || !cached.value) {
        return Result.success(null)
      }

      // 버전 확인
      if (cached.value.metadata.version !== this.version) {
        await this.cache.delete(cacheKey, this.namespace)
        return Result.success(null)
      }

      return Result.success(cached.value.result)
    } catch (error) {
      console.error('Excel 생성 캐시 조회 오류:', error)
      return Result.success(null) // 오류 시에도 null 반환
    }
  }

  // VBA 추출 결과 캐싱
  async cacheVBAExtraction(
    fileBuffer: Buffer,
    result: any,
    ttl?: number
  ): Promise<Result<void>> {
    try {
      const fileHash = this.generateFileHash(fileBuffer)
      const cacheKey = this.generateCacheKey(fileHash, 'vba-extraction')

      const cacheData: ExcelAnalysisCache = {
        fileHash,
        analysisType: 'vba-extraction',
        result,
        metadata: {
          fileName: result.fileName,
          fileSize: fileBuffer.length,
          analyzedAt: new Date(),
          version: this.version,
        },
      }

      return await this.cache.set(cacheKey, cacheData, {
        ttl: ttl || this.defaultTTL,
        namespace: this.namespace,
        compress: true,
      })
    } catch (error) {
      console.error('VBA 추출 캐싱 오류:', error)
      return Result.failure({
        code: 'EXCEL_CACHE.VBA_EXTRACTION_ERROR',
        message: 'VBA 추출 결과 캐싱에 실패했습니다',
      })
    }
  }

  // VBA 추출 캐시 조회
  async getVBAExtraction(fileBuffer: Buffer): Promise<Result<any | null>> {
    try {
      const fileHash = this.generateFileHash(fileBuffer)
      const cacheKey = this.generateCacheKey(fileHash, 'vba-extraction')

      const cached = await this.cache.get(cacheKey, {
        namespace: this.namespace,
        compress: true,
      })

      if (!cached.isSuccess || !cached.value) {
        return Result.success(null)
      }

      // 버전 확인
      if (cached.value.metadata.version !== this.version) {
        await this.cache.delete(cacheKey, this.namespace)
        return Result.success(null)
      }

      return Result.success(cached.value.result)
    } catch (error) {
      console.error('VBA 추출 캐시 조회 오류:', error)
      return Result.success(null)
    }
  }

  // VBA 분석 결과 캐싱
  async cacheVBAAnalysis(
    modules: any[],
    result: any,
    ttl?: number
  ): Promise<Result<void>> {
    try {
      // 모듈 내용을 기반으로 해시 생성
      const content = JSON.stringify(modules.map(m => ({ name: m.name, code: m.code })))
      const contentHash = crypto.createHash('sha256').update(content).digest('hex')
      const cacheKey = this.generateCacheKey(contentHash, 'vba-analysis')

      const cacheData: ExcelAnalysisCache = {
        fileHash: contentHash,
        analysisType: 'vba-analysis',
        result,
        metadata: {
          fileName: 'vba-modules',
          fileSize: content.length,
          analyzedAt: new Date(),
          version: this.version,
        },
      }

      return await this.cache.set(cacheKey, cacheData, {
        ttl: ttl || this.defaultTTL,
        namespace: this.namespace,
        compress: true,
      })
    } catch (error) {
      console.error('VBA 분석 캐싱 오류:', error)
      return Result.failure({
        code: 'EXCEL_CACHE.VBA_ANALYSIS_ERROR',
        message: 'VBA 분석 결과 캐싱에 실패했습니다',
      })
    }
  }

  // VBA 분석 캐시 조회
  async getVBAAnalysis(modules: any[]): Promise<Result<any | null>> {
    try {
      const content = JSON.stringify(modules.map(m => ({ name: m.name, code: m.code })))
      const contentHash = crypto.createHash('sha256').update(content).digest('hex')
      const cacheKey = this.generateCacheKey(contentHash, 'vba-analysis')

      const cached = await this.cache.get(cacheKey, {
        namespace: this.namespace,
        compress: true,
      })

      if (!cached.isSuccess || !cached.value) {
        return Result.success(null)
      }

      // 버전 확인
      if (cached.value.metadata.version !== this.version) {
        await this.cache.delete(cacheKey, this.namespace)
        return Result.success(null)
      }

      return Result.success(cached.value.result)
    } catch (error) {
      console.error('VBA 분석 캐시 조회 오류:', error)
      return Result.success(null)
    }
  }

  // 템플릿 기반 생성 캐싱
  async cacheTemplateGeneration(
    templateId: string,
    data: any,
    result: any,
    ttl?: number
  ): Promise<Result<void>> {
    try {
      const dataHash = crypto.createHash('sha256')
        .update(JSON.stringify({ templateId, data }))
        .digest('hex')
      const cacheKey = this.generateCacheKey(dataHash, 'template-generation')

      const cacheData: ExcelAnalysisCache = {
        fileHash: dataHash,
        analysisType: 'template-generation',
        result,
        metadata: {
          fileName: result.fileName || 'template-generated.xlsx',
          fileSize: result.fileSize || 0,
          analyzedAt: new Date(),
          version: this.version,
        },
      }

      return await this.cache.set(cacheKey, cacheData, {
        ttl: ttl || this.defaultTTL,
        namespace: this.namespace,
        compress: true,
      })
    } catch (error) {
      console.error('템플릿 생성 캐싱 오류:', error)
      return Result.failure({
        code: 'EXCEL_CACHE.TEMPLATE_GENERATION_ERROR',
        message: '템플릿 생성 결과 캐싱에 실패했습니다',
      })
    }
  }

  // 템플릿 기반 생성 캐시 조회
  async getTemplateGeneration(templateId: string, data: any): Promise<Result<any | null>> {
    try {
      const dataHash = crypto.createHash('sha256')
        .update(JSON.stringify({ templateId, data }))
        .digest('hex')
      const cacheKey = this.generateCacheKey(dataHash, 'template-generation')

      const cached = await this.cache.get(cacheKey, {
        namespace: this.namespace,
        compress: true,
      })

      if (!cached.isSuccess || !cached.value) {
        return Result.success(null)
      }

      // 버전 확인
      if (cached.value.metadata.version !== this.version) {
        await this.cache.delete(cacheKey, this.namespace)
        return Result.success(null)
      }

      return Result.success(cached.value.result)
    } catch (error) {
      console.error('템플릿 생성 캐시 조회 오류:', error)
      return Result.success(null)
    }
  }

  // 캐시 무효화
  async invalidateCache(fileBuffer?: Buffer): Promise<Result<number>> {
    try {
      if (fileBuffer) {
        // 특정 파일 관련 캐시만 삭제
        const fileHash = this.generateFileHash(fileBuffer)
        const pattern = `${fileHash}:*`
        return await this.cache.deletePattern(pattern, this.namespace)
      } else {
        // 전체 캐시 삭제
        await this.cache.flush(this.namespace)
        return Result.success(0)
      }
    } catch (error) {
      console.error('캐시 무효화 오류:', error)
      return Result.failure({
        code: 'EXCEL_CACHE.INVALIDATE_ERROR',
        message: '캐시 무효화에 실패했습니다',
      })
    }
  }

  // 캐시 통계 조회
  async getCacheStats(): Promise<{
    stats: any
    namespaceInfo: {
      totalKeys: number
      totalSize: number
    }
  }> {
    // 메모리 캐시인 경우에만 통계 제공
    const stats = this.cache.getStats ? this.cache.getStats() : {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      size: 0,
      keys: 0
    }
    
    // 네임스페이스 관련 정보 조회 (실제 구현에서는 Redis SCAN 사용)
    const namespaceInfo = {
      totalKeys: 0,
      totalSize: 0,
    }

    return {
      stats,
      namespaceInfo,
    }
  }
}

// Singleton 인스턴스
let excelCacheInstance: ExcelAnalysisCacheService | null = null

export function getExcelAnalysisCacheService(): ExcelAnalysisCacheService {
  if (!excelCacheInstance) {
    excelCacheInstance = new ExcelAnalysisCacheService()
  }
  return excelCacheInstance
}