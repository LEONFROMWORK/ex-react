// 단순하고 효율적인 캐싱 시스템
import { Redis } from 'ioredis'

interface CacheOptions {
  ttl?: number // seconds
}

export class SimpleCache {
  private memoryCache = new Map<string, { value: any; expires: number }>()
  private redis: Redis | null = null
  
  constructor(private namespace: string = 'default') {
    // Redis 연결 (옵션)
    if (process.env.REDIS_URL) {
      try {
        this.redis = new Redis(process.env.REDIS_URL)
        this.redis.on('error', (err) => {
          console.error('Redis error:', err)
          // Redis 오류 시에도 메모리 캐시는 계속 작동
        })
      } catch (error) {
        console.error('Failed to connect to Redis:', error)
      }
    }
  }
  
  async get<T>(key: string): Promise<T | null> {
    const fullKey = `${this.namespace}:${key}`
    
    // 1. 메모리 캐시 확인
    const memoryItem = this.memoryCache.get(fullKey)
    if (memoryItem && memoryItem.expires > Date.now()) {
      return memoryItem.value as T
    }
    
    // 만료된 항목 제거
    if (memoryItem) {
      this.memoryCache.delete(fullKey)
    }
    
    // 2. Redis 캐시 확인 (있으면)
    if (this.redis) {
      try {
        const value = await this.redis.get(fullKey)
        if (value) {
          const parsed = JSON.parse(value)
          // 메모리 캐시에도 저장 (5분)
          this.memoryCache.set(fullKey, {
            value: parsed,
            expires: Date.now() + 5 * 60 * 1000
          })
          return parsed as T
        }
      } catch (error) {
        // Redis 오류는 무시하고 계속
      }
    }
    
    return null
  }
  
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const fullKey = `${this.namespace}:${key}`
    const ttl = options?.ttl || 3600 // 기본 1시간
    
    // 1. 메모리 캐시에 저장 (최대 5분)
    this.memoryCache.set(fullKey, {
      value,
      expires: Date.now() + Math.min(ttl * 1000, 5 * 60 * 1000)
    })
    
    // 2. Redis에 저장 (비동기)
    if (this.redis) {
      this.redis
        .setex(fullKey, ttl, JSON.stringify(value))
        .catch(() => {}) // 오류 무시
    }
  }
  
  async delete(key: string): Promise<void> {
    const fullKey = `${this.namespace}:${key}`
    
    this.memoryCache.delete(fullKey)
    
    if (this.redis) {
      await this.redis.del(fullKey).catch(() => {})
    }
  }
  
  // 메모리 캐시 정리 (주기적으로 실행)
  cleanup(): void {
    const now = Date.now()
    for (const [key, item] of this.memoryCache.entries()) {
      if (item.expires <= now) {
        this.memoryCache.delete(key)
      }
    }
  }
}

// 전역 캐시 인스턴스
export const analysisCache = new SimpleCache('analysis')
export const qaCache = new SimpleCache('qa')

// 주기적 정리 (5분마다)
if (typeof window === 'undefined') {
  setInterval(() => {
    analysisCache.cleanup()
    qaCache.cleanup()
  }, 5 * 60 * 1000)
}