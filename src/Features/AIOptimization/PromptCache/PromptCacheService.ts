import { z } from "zod"
import { Result } from "@/Common/Result"
import { container } from "@/Infrastructure/DependencyInjection/Container"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"

// Types
export interface CachedPromptResponse {
  response: any
  confidence: number
  tokensUsed: number
  model: string
  fromCache: boolean
}

export class PromptCacheService {
  private cache = container.getCache()
  private readonly CACHE_TTL = parseInt(process.env.AI_CACHE_TTL || "3600")
  private readonly MIN_CONFIDENCE_FOR_CACHE = 0.85

  /**
   * Get or create a cached response for a prompt
   */
  async getOrCreate(
    prompt: string,
    model: string,
    generator: () => Promise<{
      response: any
      confidence: number
      tokensUsed: number
    }>
  ): Promise<Result<CachedPromptResponse>> {
    try {
      // Generate hash for the prompt
      const promptHash = this.generateHash(prompt + model)

      // Check in-memory cache first
      const cachedInMemory = await this.cache.get<CachedPromptResponse>(
        `prompt:${promptHash}`
      )
      if (cachedInMemory) {
        await this.incrementHitCount(promptHash)
        return Result.success({
          ...cachedInMemory,
          fromCache: true,
        })
      }

      // Check database cache
      const cachedInDb = await prisma.aIPromptCache.findUnique({
        where: { promptHash },
      })

      if (cachedInDb && new Date(cachedInDb.expiresAt) > new Date()) {
        // Update hit count
        await prisma.aIPromptCache.update({
          where: { promptHash },
          data: { hitCount: { increment: 1 } },
        })

        const response: CachedPromptResponse = {
          response: cachedInDb.response,
          confidence: cachedInDb.confidence,
          tokensUsed: cachedInDb.creditsUsed,
          model: cachedInDb.model,
          fromCache: true,
        }

        // Store in memory cache for faster access
        await this.cache.set(`prompt:${promptHash}`, response, this.CACHE_TTL)

        return Result.success(response)
      }

      // Generate new response
      const generated = await generator()

      // Only cache if confidence is high enough
      if (generated.confidence >= this.MIN_CONFIDENCE_FOR_CACHE) {
        await this.cacheResponse(
          promptHash,
          model,
          generated.response,
          generated.confidence,
          generated.tokensUsed
        )
      }

      return Result.success({
        ...generated,
        model,
        fromCache: false,
      })
    } catch (error) {
      console.error("Prompt cache error:", error)
      return Result.failure({
        code: "CACHE_ERROR",
        message: "캐시 처리 중 오류가 발생했습니다.",
      })
    }
  }

  /**
   * Invalidate cache for a specific pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    // This would be implemented based on the cache backend
    // For Redis: use SCAN with pattern matching
    // For in-memory: iterate through keys
    console.log(`Invalidating cache for pattern: ${pattern}`)
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalCached: number
    totalHits: number
    hitRate: number
    tokensSaved: number
    costSaved: number
  }> {
    const stats = await prisma.aIPromptCache.aggregate({
      _count: true,
      _sum: {
        hitCount: true,
        creditsUsed: true,
      },
    })

    const totalHits = stats._sum.hitCount || 0
    const totalCached = stats._count
    const hitRate = totalCached > 0 ? totalHits / totalCached : 0
    const tokensSaved = (stats._sum.creditsUsed || 0) * totalHits
    
    // Calculate cost saved based on model
    const avgCostPerToken = 0.002 // Average between Tier 1 and Tier 2
    const costSaved = tokensSaved * avgCostPerToken

    return {
      totalCached,
      totalHits,
      hitRate,
      tokensSaved,
      costSaved,
    }
  }

  /**
   * Clean expired cache entries
   */
  async cleanExpired(): Promise<number> {
    const result = await prisma.aIPromptCache.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    })

    return result.count
  }

  private generateHash(input: string): string {
    return crypto.createHash("sha256").update(input).digest("hex")
  }

  private async cacheResponse(
    promptHash: string,
    model: string,
    response: any,
    confidence: number,
    tokensUsed: number
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + this.CACHE_TTL * 1000)

    // Store in database
    await prisma.aIPromptCache.upsert({
      where: { promptHash },
      create: {
        promptHash,
        model,
        response,
        confidence,
        creditsUsed: tokensUsed,
        expiresAt,
        hitCount: 0,
      },
      update: {
        response,
        confidence,
        creditsUsed: tokensUsed,
        expiresAt,
        model,
      },
    })

    // Store in memory cache
    await this.cache.set(
      `prompt:${promptHash}`,
      {
        response,
        confidence,
        tokensUsed,
        model,
        fromCache: false,
      },
      this.CACHE_TTL
    )
  }

  private async incrementHitCount(promptHash: string): Promise<void> {
    await prisma.aIPromptCache.update({
      where: { promptHash },
      data: { hitCount: { increment: 1 } },
    }).catch(() => {
      // Ignore errors for hit count updates
    })
  }
}

// Singleton instance
export const promptCacheService = new PromptCacheService()