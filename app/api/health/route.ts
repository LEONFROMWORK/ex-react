import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // 데이터베이스 연결 확인
    await prisma.$queryRaw`SELECT 1`;
    
    // 환경 변수 확인
    const hasRequiredEnvVars = !!(
      process.env.DATABASE_URL &&
      process.env.NEXTAUTH_SECRET &&
      (process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY)
    );
    
    // 헬스 상태 정보
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: 'connected',
      env_vars: hasRequiredEnvVars ? 'configured' : 'missing',
      version: process.env.npm_package_version || '1.0.0',
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: 'MB'
      }
    };
    
    return NextResponse.json(healthStatus, { status: 200 });
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      database: 'disconnected'
    }, { status: 503 });
  } finally {
    await prisma.$disconnect();
  }
}