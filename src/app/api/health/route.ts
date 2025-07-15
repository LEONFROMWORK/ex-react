import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`
    
    // Check Redis connection if configured
    let redisStatus = "not_configured"
    if (process.env.REDIS_URL) {
      try {
        // Import Redis client dynamically to avoid errors if not configured
        const { redis } = await import("@/lib/redis")
        await redis.ping()
        redisStatus = "healthy"
      } catch (error) {
        redisStatus = "unhealthy"
      }
    }
    
    const healthStatus = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV,
      services: {
        database: "healthy",
        redis: redisStatus,
      }
    }
    
    return NextResponse.json(healthStatus, { status: 200 })
  } catch (error) {
    console.error("Health check failed:", error)
    
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: "Database connection failed"
      },
      { status: 503 }
    )
  }
}