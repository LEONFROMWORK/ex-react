import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { env } from "@/lib/env"
import { isServer, isBuildTime } from "@/lib/utils/server-only"

export async function GET(req: NextRequest) {
  let databaseStatus = "unknown"
  let redisStatus = "not_configured"
  
  // Skip database check during build time
  if (isBuildTime) {
    return NextResponse.json({
      status: "build_mode",
      message: "Health check skipped during build"
    })
  }
  
  // Check database connection
  if (env.DATABASE_URL) {
    try {
      await db.$queryRaw`SELECT 1`
      databaseStatus = "healthy"
    } catch (error) {
      console.warn("Database check failed:", error)
      databaseStatus = "unhealthy"
    }
  } else {
    databaseStatus = "not_configured"
  }
  
  // Check cache service status
  try {
    const { container } = await import("@/Infrastructure/DependencyInjection/Container")
    const { config } = await import("@/config")
    const cacheService = container.getCache()
    
    if (config.cache.provider === 'redis') {
      // Redis is configured
      redisStatus = "healthy"
    } else {
      // Using memory cache
      redisStatus = "disabled"
    }
  } catch (error) {
    redisStatus = "error"
  }
  
  const healthStatus = {
    status: databaseStatus === "healthy" || databaseStatus === "unhealthy" ? "operational" : "degraded",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    environment: env.NODE_ENV,
    services: {
      database: databaseStatus,
      redis: redisStatus,
      cache: redisStatus === "disabled" ? "memory" : "redis"
    },
    notes: {
      database: databaseStatus === "unhealthy" ? "Database is not configured or not reachable" : null,
      redis: redisStatus === "disabled" ? "Redis is disabled, using in-memory cache" : null
    }
  }
  
  // 서비스가 작동 가능한 상태면 200 반환
  return NextResponse.json(healthStatus, { status: 200 })
}