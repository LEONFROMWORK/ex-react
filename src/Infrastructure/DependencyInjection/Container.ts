import { EnhancedExcelAnalyzer } from "@/lib/excel/analyzer-enhanced"
import { OpenAI } from "openai"
import { Redis } from "ioredis"
import { prisma } from "@/lib/prisma"

// Service interfaces
export interface IFileStorage {
  save(file: Buffer, key: string): Promise<string>
  get(key: string): Promise<Buffer>
  delete(key: string): Promise<void>
}

export interface ICacheService {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttl?: number): Promise<void>
  delete(key: string): Promise<void>
}

export interface INotificationService {
  sendEmail(to: string, subject: string, body: string): Promise<void>
  sendSMS(to: string, message: string): Promise<void>
}

// Container class for dependency injection
export class Container {
  private static instance: Container
  private services: Map<string, any> = new Map()

  private constructor() {
    this.registerServices()
  }

  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container()
    }
    return Container.instance
  }

  private registerServices() {
    // Core services
    this.register("prisma", prisma)
    this.register("excelAnalyzer", () => new EnhancedExcelAnalyzer())
    
    // External services
    this.register("openai", () => new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    }))
    
    // Cache service
    if (process.env.REDIS_URL) {
      this.register("redis", () => new Redis(process.env.REDIS_URL!))
      this.register("cache", () => new RedisCacheService(this.get("redis")))
    } else {
      this.register("cache", () => new InMemoryCacheService())
    }
    
    // File storage
    if (process.env.AWS_S3_BUCKET) {
      this.register("fileStorage", () => new S3FileStorage())
    } else if (process.env.AZURE_STORAGE_CONNECTION) {
      this.register("fileStorage", () => new AzureBlobStorage())
    } else {
      this.register("fileStorage", () => new LocalFileStorage())
    }
    
    // Notification service
    this.register("notification", () => new EmailNotificationService())
  }

  register<T>(key: string, factory: () => T): void {
    this.services.set(key, factory)
  }

  get<T>(key: string): T {
    const factory = this.services.get(key)
    if (!factory) {
      throw new Error(`Service ${key} not registered`)
    }
    return factory()
  }

  // Convenience methods
  getPrisma() {
    return this.get<typeof prisma>("prisma")
  }

  getExcelAnalyzer() {
    return this.get<EnhancedExcelAnalyzer>("excelAnalyzer")
  }

  getOpenAI() {
    return this.get<OpenAI>("openai")
  }

  getCache() {
    return this.get<ICacheService>("cache")
  }

  getFileStorage() {
    return this.get<IFileStorage>("fileStorage")
  }

  getNotificationService() {
    return this.get<INotificationService>("notification")
  }
}

// Cache implementations
class InMemoryCacheService implements ICacheService {
  private cache = new Map<string, { value: any; expires: number }>()

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key)
    if (!item) return null
    
    if (Date.now() > item.expires) {
      this.cache.delete(key)
      return null
    }
    
    return item.value as T
  }

  async set<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    this.cache.set(key, {
      value,
      expires: Date.now() + ttl * 1000,
    })
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key)
  }
}

class RedisCacheService implements ICacheService {
  constructor(private redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key)
    if (!value) return null
    
    try {
      return JSON.parse(value) as T
    } catch {
      return value as T
    }
  }

  async set<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    const serialized = typeof value === "string" ? value : JSON.stringify(value)
    await this.redis.set(key, serialized, "EX", ttl)
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key)
  }
}

// File storage implementations
import { LocalFileStorage } from "@/Infrastructure/ExternalServices/LocalFileStorage"
import { S3FileStorage } from "@/Infrastructure/ExternalServices/S3FileStorage"
import { AzureBlobStorage } from "@/Infrastructure/ExternalServices/AzureBlobStorage"

// Notification implementations
class EmailNotificationService implements INotificationService {
  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    // Implementation would use SendGrid, AWS SES, etc.
    console.log(`Email to ${to}: ${subject}`)
  }

  async sendSMS(to: string, message: string): Promise<void> {
    // Implementation would use Twilio, AWS SNS, etc.
    console.log(`SMS to ${to}: ${message}`)
  }
}

// Export singleton instance
export const container = Container.getInstance()