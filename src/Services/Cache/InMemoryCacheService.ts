import { Result } from '@/Common/Result'

export interface CacheOptions {
  ttl?: number // seconds
  namespace?: string
  compress?: boolean
}

export interface CacheStats {
  hits: number
  misses: number
  sets: number
  deletes: number
  errors: number
}

/**
 * Pure in-memory cache service with no Redis dependency
 */
export class InMemoryCacheService {
  private memoryCache: Map<string, { value: any; expires: number }> = new Map()
  public isConnected: boolean = true // Always connected for memory cache
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
  }

  constructor() {
    console.log('메모리 캐시 서비스가 초기화되었습니다.')
  }

  // 캐시 키 생성
  private generateKey(key: string, namespace?: string): string {
    const prefix = namespace || 'excel-app'
    return `${prefix}:${key}`
  }

  // 캐시 조회
  async get<T>(key: string, options?: CacheOptions): Promise<Result<T | null>> {
    try {
      const cacheKey = this.generateKey(key, options?.namespace)
      const cached = this.memoryCache.get(cacheKey)
      
      if (!cached || cached.expires < Date.now()) {
        this.stats.misses++
        // Clean up expired entry
        if (cached) {
          this.memoryCache.delete(cacheKey)
        }
        return Result.success(null)
      }

      this.stats.hits++
      return Result.success(cached.value as T)
    } catch (error) {
      console.error('캐시 조회 오류:', error)
      this.stats.errors++
      return Result.failure({
        code: 'CACHE.GET_ERROR',
        message: '캐시 조회 중 오류가 발생했습니다',
      })
    }
  }

  // 캐시 저장
  async set<T>(
    key: string,
    value: T,
    options?: CacheOptions
  ): Promise<Result<void>> {
    try {
      const cacheKey = this.generateKey(key, options?.namespace)
      const ttl = options?.ttl || 3600 // 기본 1시간
      
      this.memoryCache.set(cacheKey, {
        value,
        expires: Date.now() + ttl * 1000
      })

      this.stats.sets++
      
      // Clean up old entries periodically
      if (this.memoryCache.size > 1000) {
        this.cleanupExpired()
      }
      
      return Result.success(undefined)
    } catch (error) {
      console.error('캐시 저장 오류:', error)
      this.stats.errors++
      return Result.failure({
        code: 'CACHE.SET_ERROR',
        message: '캐시 저장 중 오류가 발생했습니다',
      })
    }
  }

  // 캐시 삭제
  async delete(key: string, namespace?: string): Promise<Result<void>> {
    try {
      const cacheKey = this.generateKey(key, namespace)
      this.memoryCache.delete(cacheKey)
      this.stats.deletes++
      return Result.success(undefined)
    } catch (error) {
      console.error('캐시 삭제 오류:', error)
      this.stats.errors++
      return Result.failure({
        code: 'CACHE.DELETE_ERROR',
        message: '캐시 삭제 중 오류가 발생했습니다',
      })
    }
  }

  // 패턴으로 캐시 삭제
  async deletePattern(pattern: string, namespace?: string): Promise<Result<number>> {
    try {
      const prefix = namespace || 'excel-app'
      const searchPattern = `${prefix}:${pattern}`
      
      let deletedCount = 0
      const keysToDelete: string[] = []
      
      this.memoryCache.forEach((value, key) => {
        if (key.startsWith(searchPattern.replace('*', ''))) {
          keysToDelete.push(key)
          deletedCount++
        }
      })
      
      keysToDelete.forEach(key => this.memoryCache.delete(key))
      this.stats.deletes += deletedCount
      
      return Result.success(deletedCount)
    } catch (error) {
      console.error('패턴 캐시 삭제 오류:', error)
      this.stats.errors++
      return Result.failure({
        code: 'CACHE.DELETE_PATTERN_ERROR',
        message: '패턴 캐시 삭제 중 오류가 발생했습니다',
      })
    }
  }

  // 캐시 존재 확인
  async exists(key: string, namespace?: string): Promise<boolean> {
    try {
      const cacheKey = this.generateKey(key, namespace)
      const cached = this.memoryCache.get(cacheKey)
      return cached !== undefined && cached.expires > Date.now()
    } catch (error) {
      console.error('캐시 존재 확인 오류:', error)
      return false
    }
  }

  // TTL 갱신
  async touch(key: string, ttl: number, namespace?: string): Promise<Result<void>> {
    try {
      const cacheKey = this.generateKey(key, namespace)
      const cached = this.memoryCache.get(cacheKey)
      
      if (cached) {
        cached.expires = Date.now() + ttl * 1000
      }
      
      return Result.success(undefined)
    } catch (error) {
      console.error('TTL 갱신 오류:', error)
      return Result.failure({
        code: 'CACHE.TOUCH_ERROR',
        message: 'TTL 갱신 중 오류가 발생했습니다',
      })
    }
  }

  // 통계 조회
  getStats(): CacheStats {
    return { ...this.stats }
  }

  // 통계 초기화
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
    }
  }

  // 캐시 비우기
  async flush(namespace?: string): Promise<Result<void>> {
    try {
      if (namespace) {
        const keysToDelete: string[] = []
        this.memoryCache.forEach((value, key) => {
          if (key.startsWith(`${namespace}:`)) {
            keysToDelete.push(key)
          }
        })
        keysToDelete.forEach(key => this.memoryCache.delete(key))
      } else {
        this.memoryCache.clear()
      }
      return Result.success(undefined)
    } catch (error) {
      console.error('캐시 비우기 오류:', error)
      return Result.failure({
        code: 'CACHE.FLUSH_ERROR',
        message: '캐시 비우기 중 오류가 발생했습니다',
      })
    }
  }

  // 만료된 항목 정리
  private cleanupExpired(): void {
    const now = Date.now()
    const keysToDelete: string[] = []
    
    this.memoryCache.forEach((value, key) => {
      if (value.expires < now) {
        keysToDelete.push(key)
      }
    })
    
    keysToDelete.forEach(key => this.memoryCache.delete(key))
  }

  // 연결 종료 (메모리 캐시는 아무것도 하지 않음)
  async disconnect(): Promise<void> {
    // No-op for memory cache
  }
}

// Singleton 인스턴스
let cacheInstance: InMemoryCacheService | null = null

export function getCacheService(): InMemoryCacheService & { isConnected: boolean } {
  if (!cacheInstance) {
    cacheInstance = new InMemoryCacheService()
  }
  return cacheInstance
}