import { NextRequest } from 'next/server';
import { auth } from '@/src/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// POST - 분석 이력 저장
const saveHistorySchema = z.object({
  analysisId: z.string(),
  type: z.string(),
  tier: z.string(),
  fileInfo: z.object({
    excelFileName: z.string(),
    excelFileSize: z.number(),
    imageCount: z.number(),
    totalSize: z.number()
  }),
  query: z.string().optional(),
  result: z.object({
    confidence: z.number(),
    errorCount: z.number(),
    correctionCount: z.number()
  }),
  cost: z.object({
    tokensUsed: z.number(),
    estimatedCost: z.number()
  }),
  metadata: z.any().optional()
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
    
    if (!session?.user && !demoMode) {
      return Response.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }
    
    const userId = session?.user?.id || 'demo-user-123';
    const body = await request.json();
    const data = saveHistorySchema.parse(body);
    
    // 분석 이력 저장
    const history = await prisma.analysisHistory.create({
      data: {
        userId,
        analysisId: data.analysisId,
        type: data.type,
        tier: data.tier,
        query: data.query,
        fileInfo: data.fileInfo,
        result: data.result,
        cost: data.cost,
        metadata: data.metadata
      }
    });
    
    // 사용자 통계 업데이트
    await updateUserStats(userId, data);
    
    return Response.json({
      success: true,
      historyId: history.id
    });
  } catch (error) {
    console.error('Save history error:', error);
    
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: '잘못된 요청 형식', details: error.errors },
        { status: 400 }
      );
    }
    
    return Response.json(
      { error: '이력 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// GET - 분석 이력 조회
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
    
    if (!session?.user && !demoMode) {
      return Response.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }
    
    const userId = session?.user?.id || 'demo-user-123';
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const type = searchParams.get('type');
    const tier = searchParams.get('tier');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    // 필터 조건 구성
    const where: any = { userId };
    
    if (type) where.type = type;
    if (tier) where.tier = tier;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    
    // 전체 개수 조회
    const total = await prisma.analysisHistory.count({ where });
    
    // 페이징 처리된 데이터 조회
    const histories = await prisma.analysisHistory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        analysisId: true,
        type: true,
        tier: true,
        query: true,
        fileInfo: true,
        result: true,
        cost: true,
        createdAt: true
      }
    });
    
    // 사용자 통계 조회
    const userStats = await prisma.userStats.findUnique({
      where: { userId }
    });
    
    return Response.json({
      success: true,
      data: {
        histories,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        },
        stats: userStats
      }
    });
  } catch (error) {
    console.error('Get history error:', error);
    return Response.json(
      { error: '이력 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// DELETE - 분석 이력 삭제
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const historyId = searchParams.get('id');
    
    if (!historyId) {
      return Response.json(
        { error: '이력 ID가 필요합니다.' },
        { status: 400 }
      );
    }
    
    // 소유권 확인
    const history = await prisma.analysisHistory.findFirst({
      where: {
        id: historyId,
        userId: session.user.id
      }
    });
    
    if (!history) {
      return Response.json(
        { error: '이력을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // 삭제
    await prisma.analysisHistory.delete({
      where: { id: historyId }
    });
    
    return Response.json({
      success: true,
      message: '이력이 삭제되었습니다.'
    });
  } catch (error) {
    console.error('Delete history error:', error);
    return Response.json(
      { error: '이력 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 사용자 통계 업데이트
async function updateUserStats(userId: string, data: any) {
  try {
    const stats = await prisma.userStats.upsert({
      where: { userId },
      create: {
        userId,
        totalAnalyses: 1,
        errorDetectionCount: data.result.errorCount > 0 ? 1 : 0,
        visualComparisonCount: data.type === 'hybrid' ? 1 : 0,
        improvementSuggestionCount: data.result.correctionCount > 0 ? 1 : 0,
        totalTokensUsed: data.cost.tokensUsed,
        totalCost: data.cost.estimatedCost,
        preferredTier: data.tier,
        averageFileSize: data.fileInfo.totalSize,
        averageErrorCount: data.result.errorCount,
        averageProcessingTime: data.metadata?.processingTime || 0,
        lastAnalysisAt: new Date()
      },
      update: {
        totalAnalyses: { increment: 1 },
        errorDetectionCount: {
          increment: data.result.errorCount > 0 ? 1 : 0
        },
        visualComparisonCount: {
          increment: data.type === 'hybrid' ? 1 : 0
        },
        improvementSuggestionCount: {
          increment: data.result.correctionCount > 0 ? 1 : 0
        },
        totalTokensUsed: {
          increment: data.cost.tokensUsed
        },
        totalCost: {
          increment: data.cost.estimatedCost
        },
        preferredTier: data.tier,
        lastAnalysisAt: new Date()
      }
    });
    
    // 평균값 재계산
    await prisma.$executeRaw`
      UPDATE "UserStats"
      SET 
        "averageFileSize" = "totalCost" / NULLIF("totalAnalyses", 0),
        "averageErrorCount" = "errorDetectionCount" / NULLIF("totalAnalyses", 0),
        "averageProcessingTime" = "averageProcessingTime"
      WHERE "userId" = ${userId}
    `;
  } catch (error) {
    console.error('Update user stats error:', error);
  }
}