// 다층 캐싱 시스템 - 극한의 성능 최적화
import { Redis } from 'ioredis'
import { LRUCache } from 'lru-cache'

interface CacheOptions {
  ttl?: number
  stale?: boolean
  compress?: boolean
}

interface CacheStats {
  hits: number
  misses: number
  evictions: number
  size: number
}

export class CacheManager {
  // L1: 메모리 캐시 (가장 빠름, 작은 용량)
  private memoryCache: LRUCache<string, any>
  
  // L2: Redis 캐시 (중간 속도, 중간 용량)
  private redisCache: Redis | null = null
  
  // 통계
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    size: 0
  }
  
  constructor(
    private namespace: string = 'default',
    private defaultTTL: number = 3600 // 1 hour
  ) {
    // 메모리 캐시 설정 (최대 100MB)
    this.memoryCache = new LRUCache({
      max: 500, // 최대 500개 항목
      maxSize: 100 * 1024 * 1024, // 100MB
      ttl: 1000 * 60 * 5, // 5분
      allowStale: true,
      updateAgeOnGet: true,
      updateAgeOnHas: true,
      sizeCalculation: (value) => {
        return JSON.stringify(value).length
      },
      dispose: (value, key) => {
        this.stats.evictions++
      }
    })
    
    // Redis 연결 (있으면)
    if (process.env.REDIS_URL) {
      this.redisCache = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true
      })
      
      this.redisCache.on('error', (err) => {
        console.error('Redis Cache Error:', err)
        // Redis 오류 시에도 메모리 캐시는 계속 작동
      })
    }
  }
  
  private getKey(key: string): string {
    return `${this.namespace}:${key}`
  }
  
  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    const fullKey = this.getKey(key)
    
    // L1: 메모리 캐시 확인
    const memoryValue = this.memoryCache.get(fullKey)
    if (memoryValue !== undefined) {
      this.stats.hits++
      return memoryValue as T
    }
    
    // L2: Redis 캐시 확인
    if (this.redisCache) {
      try {
        const redisValue = await this.redisCache.get(fullKey)
        if (redisValue) {
          this.stats.hits++
          const parsed = JSON.parse(redisValue)
          
          // 메모리 캐시에도 저장 (write-through)
          this.memoryCache.set(fullKey, parsed)
          
          return parsed as T
        }
      } catch (error) {
        console.error('Redis get error:', error)
        // Redis 오류는 무시하고 계속 진행
      }
    }
    
    this.stats.misses++
    return null
  }
  
  async set<T>(
    key: string, 
    value: T, 
    options?: CacheOptions
  ): Promise<void> {
    const fullKey = this.getKey(key)
    const ttl = options?.ttl || this.defaultTTL
    
    // L1: 메모리 캐시에 저장
    this.memoryCache.set(fullKey, value, {
      ttl: Math.min(ttl * 1000, 5 * 60 * 1000) // 최대 5분
    })
    
    // L2: Redis 캐시에 비동기로 저장
    if (this.redisCache) {
      // Fire and forget - 응답을 기다리지 않음
      this.redisCache
        .setex(fullKey, ttl, JSON.stringify(value))
        .catch(err => console.error('Redis set error:', err))
    }
    
    this.stats.size = this.memoryCache.size
  }
  
  async delete(key: string): Promise<void> {
    const fullKey = this.getKey(key)
    
    // 모든 레벨에서 삭제
    this.memoryCache.delete(fullKey)
    
    if (this.redisCache) {
      await this.redisCache.del(fullKey).catch(() => {})
    }
  }
  
  async clear(): Promise<void> {
    // 메모리 캐시 클리어
    this.memoryCache.clear()
    
    // Redis 캐시 클리어 (namespace 기준)
    if (this.redisCache) {
      const keys = await this.redisCache.keys(`${this.namespace}:*`)
      if (keys.length > 0) {
        await this.redisCache.del(...keys).catch(() => {})
      }
    }
    
    // 통계 리셋
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0
    }
  }
  
  // 캐시 워밍 - 자주 사용되는 데이터 미리 로드
  async warm(keys: string[], loader: (key: string) => Promise<any>): Promise<void> {
    const promises = keys.map(async (key) => {
      const cached = await this.get(key)
      if (!cached) {
        const value = await loader(key)
        if (value) {
          await this.set(key, value)
        }
      }
    })
    
    await Promise.all(promises)
  }
  
  // 통계 조회
  getStats(): CacheStats & { hitRate: string } {
    const total = this.stats.hits + this.stats.misses
    const hitRate = total > 0 
      ? ((this.stats.hits / total) * 100).toFixed(2) + '%'
      : '0%'
      
    return {
      ...this.stats,
      hitRate
    }
  }
  
  // 연결 종료
  async disconnect(): Promise<void> {
    if (this.redisCache) {
      await this.redisCache.quit()
    }
  }
}

// 전역 캐시 인스턴스
export const globalCache = new CacheManager('global', 3600)
export const analysisCache = new CacheManager('analysis', 7200)
export const qaCache = new CacheManager('qa', 86400) // 24시간

// 캐시 데코레이터
export function Cacheable(options?: { ttl?: number; key?: string }) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value
    
    descriptor.value = async function (...args: any[]) {
      const cacheKey = options?.key || `${target.constructor.name}:${propertyName}:${JSON.stringify(args)}`
      
      // 캐시 확인
      const cached = await globalCache.get(cacheKey)
      if (cached) {
        return cached
      }
      
      // 실행 및 캐시
      const result = await originalMethod.apply(this, args)
      await globalCache.set(cacheKey, result, { ttl: options?.ttl })
      
      return result
    }
    
    return descriptor
  }
}