import { NextRequest, NextResponse } from "next/server"
import { container } from "@/Infrastructure/DependencyInjection/Container"

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  keyGenerator: (req: NextRequest) => string
}

export class RateLimitMiddleware {
  private cache = container.getCache()
  private config: RateLimitConfig

  constructor(config?: Partial<RateLimitConfig>) {
    this.config = {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000"), // 1 minute
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "60"),
      keyGenerator: (req) => {
        // Use IP address or user ID as key
        const forwarded = req.headers.get("x-forwarded-for")
        const ip = forwarded ? forwarded.split(",")[0] : "127.0.0.1"
        return `rate-limit:${ip}`
      },
      ...config,
    }
  }

  async handle(req: NextRequest): Promise<NextResponse | null> {
    const key = this.config.keyGenerator(req)
    const now = Date.now()
    const windowStart = now - this.config.windowMs

    // Get current request count
    const requests = await this.getRequests(key)
    const recentRequests = requests.filter(timestamp => timestamp > windowStart)

    // Check if limit exceeded
    if (recentRequests.length >= this.config.maxRequests) {
      const resetTime = Math.min(...recentRequests) + this.config.windowMs
      const retryAfter = Math.ceil((resetTime - now) / 1000)

      return NextResponse.json(
        {
          error: "Too Many Requests",
          message: "API rate limit exceeded",
          retryAfter,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": this.config.maxRequests.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": new Date(resetTime).toISOString(),
            "Retry-After": retryAfter.toString(),
          },
        }
      )
    }

    // Add current request
    recentRequests.push(now)
    await this.setRequests(key, recentRequests)

    // Add rate limit headers to response
    const remaining = this.config.maxRequests - recentRequests.length
    const reset = recentRequests[0] + this.config.windowMs

    // Continue to next middleware
    return null
  }

  private async getRequests(key: string): Promise<number[]> {
    const cached = await this.cache.get<number[]>(key)
    return cached || []
  }

  private async setRequests(key: string, requests: number[]): Promise<void> {
    const ttl = Math.ceil(this.config.windowMs / 1000)
    await this.cache.set(key, requests, ttl)
  }
}

// Factory functions for different rate limit strategies
export const createApiRateLimit = () => new RateLimitMiddleware({
  windowMs: 60000, // 1 minute
  maxRequests: 60,
})

export const createAuthRateLimit = () => new RateLimitMiddleware({
  windowMs: 900000, // 15 minutes
  maxRequests: 5,
  keyGenerator: (req) => {
    const body = req.body as any
    const email = body?.email || "unknown"
    return `auth-limit:${email}`
  },
})

export const createAIRateLimit = () => new RateLimitMiddleware({
  windowMs: 3600000, // 1 hour
  maxRequests: 100,
  keyGenerator: (req) => {
    // Use user ID from session
    const userId = req.headers.get("x-user-id") || "anonymous"
    return `ai-limit:${userId}`
  },
})