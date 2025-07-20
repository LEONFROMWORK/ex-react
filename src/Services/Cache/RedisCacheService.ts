import { Redis } from 'ioredis'
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

export class RedisCacheService {
  private client: Redis | null = null
  private memoryCache: Map<string, { value: any; expires: number }> = new Map()
  public isConnected: boolean = false
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
  }

  constructor() {
    // Redis 비활성화 옵션 확인
    if (process.env.DISABLE_REDIS === 'true' || process.env.NODE_ENV === 'development') {
      console.log('Redis가 비활성화되었습니다. 메모리 캐시를 사용합니다.')
      this.client = null
      this.isConnected = false
      return
    }

    try {
      this.client = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0'),
        maxRetriesPerRequest: 0,
        enableOfflineQueue: false,
        lazyConnect: true,
        showFriendlyErrorStack: false,
        retryStrategy: () => null, // 재시도 하지 않음
        reconnectOnError: () => false, // 재연결 하지 않음
        enableReadyCheck: false,
        connectTimeout: 1000, // 1초 타임아웃
      })

      // 모든 에러를 조용히 처리
      this.client.on('error', (err: any) => {
        // 연결 오류는 무시 (로그만 남김)
        if (err.code === 'ECONNREFUSED') {
          if (this.isConnected) {
            console.log('Redis 연결이 끊어졌습니다. 메모리 캐시를 사용합니다.')
          }
        }
        this.isConnected = false
        // 에러 이벤트가 전파되지 않도록 처리
        err.handled = true
      })

      this.client.on('connect', () => {
        console.log('Redis 연결 성공')
        this.isConnected = true
      })

      this.client.on('end', () => {
        this.isConnected = false
      })

      // 연결 시도 (실패해도 계속 진행)
      this.client.connect().catch(() => {
        // 연결 실패는 조용히 처리
        this.isConnected = false
        // 클라이언트 정리
        if (this.client) {
          this.client.disconnect()
          this.client = null
        }
      })
    } catch (error) {
      // 초기화 실패는 조용히 처리
      this.client = null
      this.isConnected = false
    }
  }

  // 캐시 키 생성
  private generateKey(key: string, namespace?: string): string {
    const prefix = namespace || 'excel-app'
    return `${prefix}:${key}`
  }

  // 데이터 압축 (선택적)
  private async compress(data: string): Promise<string> {
    // 실제 구현에서는 zlib 등을 사용
    // 여기서는 간단히 Base64 인코딩만 수행
    return Buffer.from(data).toString('base64')
  }

  // 데이터 압축 해제
  private async decompress(data: string): Promise<string> {
    return Buffer.from(data, 'base64').toString('utf-8')
  }

  // 캐시 조회
  async get<T>(key: string, options?: CacheOptions): Promise<Result<T | null>> {
    try {
      const cacheKey = this.generateKey(key, options?.namespace)
      
      // Redis 사용 가능한 경우
      if (this.isConnected && this.client) {
        const cached = await this.client.get(cacheKey)

        if (!cached) {
          this.stats.misses++
          return Result.success(null)
        }

        this.stats.hits++
        
        let data = cached
        if (options?.compress) {
          data = await this.decompress(cached)
        }

        return Result.success(JSON.parse(data) as T)
      } 
      
      // 메모리 캐시 사용
      const cached = this.memoryCache.get(cacheKey)
      if (!cached || cached.expires < Date.now()) {
        this.stats.misses++
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
      
      // Redis 사용 가능한 경우
      if (this.isConnected && this.client) {
        let data = JSON.stringify(value)

        if (options?.compress) {
          data = await this.compress(data)
        }

        if (options?.ttl) {
          await this.client.setex(cacheKey, options.ttl, data)
        } else {
          await this.client.set(cacheKey, data)
        }
      } else {
        // 메모리 캐시 사용
        const ttl = options?.ttl || 3600 // 기본 1시간
        this.memoryCache.set(cacheKey, {
          value,
          expires: Date.now() + ttl * 1000
        })
      }

      this.stats.sets++
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
      
      if (this.isConnected && this.client) {
        await this.client.del(cacheKey)
      } else {
        this.memoryCache.delete(cacheKey)
      }
      
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
      
      if (this.isConnected && this.client) {
        const keys = await this.client.keys(searchPattern)
        if (keys.length === 0) {
          return Result.success(0)
        }

        const pipeline = this.client.pipeline()
        keys.forEach(key => pipeline.del(key))
        await pipeline.exec()

        this.stats.deletes += keys.length
        return Result.success(keys.length)
      } else {
        // 메모리 캐시에서 패턴 삭제
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
      }
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
      
      if (this.isConnected && this.client) {
        const exists = await this.client.exists(cacheKey)
        return exists === 1
      } else {
        // 메모리 캐시 확인
        const cached = this.memoryCache.get(cacheKey)
        return cached !== undefined && cached.expires > Date.now()
      }
    } catch (error) {
      console.error('캐시 존재 확인 오류:', error)
      return false
    }
  }

  // TTL 갱신
  async touch(key: string, ttl: number, namespace?: string): Promise<Result<void>> {
    try {
      const cacheKey = this.generateKey(key, namespace)
      
      if (this.isConnected && this.client) {
        await this.client.expire(cacheKey, ttl)
      } else {
        // 메모리 캐시 TTL 갱신
        const cached = this.memoryCache.get(cacheKey)
        if (cached) {
          cached.expires = Date.now() + ttl * 1000
        }
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

  // 캐시 비우기 (주의: 전체 DB를 비움)
  async flush(namespace?: string): Promise<Result<void>> {
    try {
      if (this.isConnected && this.client) {
        if (namespace) {
          // 특정 네임스페이스만 삭제
          const pattern = `${namespace}:*`
          const keys = await this.client.keys(pattern)
          if (keys.length > 0) {
            const pipeline = this.client.pipeline()
            keys.forEach(key => pipeline.del(key))
            await pipeline.exec()
          }
        } else {
          // 전체 캐시 비우기 (주의 필요)
          await this.client.flushdb()
        }
      } else {
        // 메모리 캐시 비우기
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

  // 연결 종료
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit()
    }
  }
}

// Singleton 인스턴스
let cacheInstance: RedisCacheService | null = null

export function getCacheService(): RedisCacheService & { isConnected: boolean } {
  if (!cacheInstance) {
    try {
      cacheInstance = new RedisCacheService()
    } catch (error) {
      console.log('캐시 서비스 초기화 중 오류 발생, 메모리 캐시 사용')
      // 오류 발생 시에도 인스턴스 생성
      cacheInstance = new RedisCacheService()
    }
  }
  return cacheInstance as RedisCacheService & { isConnected: boolean }
}