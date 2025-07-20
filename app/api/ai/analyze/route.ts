import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { aiHelpers } from '@/lib/ai';
import { z } from 'zod';
import { progressManager } from '@/lib/websocket/analysis-progress';

// 요청 검증 스키마
const analyzeRequestSchema = z.object({
  type: z.enum(['text', 'image', 'hybrid']),
  content: z.string().optional(),
  sessionId: z.string().optional(),
  query: z.string().optional(),
  selectedTier: z.enum(['TIER1', 'TIER2', 'TIER3']).optional(),
  options: z.object({
    language: z.enum(['ko', 'en']).optional(),
    analysisDepth: z.enum(['basic', 'detailed', 'comprehensive']).optional(),
    includeRecommendations: z.boolean().optional(),
    compareMode: z.boolean().optional()
  }).optional()
});

export async function POST(request: NextRequest) {
  try {
    // 세션 확인 (데모 모드 지원)
    const session = await getServerSession(authOptions);
    const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || process.env.NODE_ENV === 'development';
    
    if (!session?.user && !demoMode) {
      return Response.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }
    
    // 데모 모드인 경우 기본 사용자 정보 사용
    const userId = session?.user?.id || 'demo-user-123';
    const userTier = (session?.user as any)?.tier || 'TIER2';

    // 요청 파싱 및 검증
    const body = await request.json();
    const validatedData = analyzeRequestSchema.parse(body);

    // Hybrid 타입인 경우 특별 처리
    if (validatedData.type === 'hybrid' && validatedData.sessionId) {
      // 세션 ID로 연관된 파일 가져오기
      const { FileAssociationService } = await import('@/src/Features/ExcelUpload/FileAssociationService');
      const { ExcelProcessingService } = await import('@/src/Features/ExcelAnalysis/ExcelProcessingService');
      const { FileRepository } = await import('@/src/Infrastructure/Repositories/FileRepository');
      
      const fileRepository = new FileRepository();
      const associationService = new FileAssociationService(fileRepository);
      const excelProcessor = new ExcelProcessingService();
      
      // 연관 파일 조회
      const filesResult = await associationService.getAssociatedFiles(validatedData.sessionId);
      if (!filesResult.isSuccess) {
        return Response.json(
          { error: '연관된 파일을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      // Excel 처리 시작 알림
      progressManager.updateProcessingProgress(validatedData.sessionId, 'parsing', 4);
      
      // Excel 파일 처리
      const excelFile = filesResult.value.excel;
      // 로컬 파일인 경우 직접 읽기
      let excelBuffer: ArrayBuffer;
      if (excelFile.uploadUrl.startsWith('/uploads/')) {
        const fs = await import('fs/promises');
        const path = await import('path');
        const filePath = path.join(process.cwd(), excelFile.uploadUrl);
        const buffer = await fs.readFile(filePath);
        excelBuffer = buffer.buffer;
      } else {
        excelBuffer = await fetch(excelFile.uploadUrl).then(res => res.arrayBuffer());
      }
      
      progressManager.updateProcessingProgress(validatedData.sessionId, 'validation', 4);
      const excelDataResult = await excelProcessor.parseExcelFile(Buffer.from(excelBuffer));
      
      if (!excelDataResult.isSuccess) {
        return Response.json(
          { error: 'Excel 파일 처리 실패' },
          { status: 400 }
        );
      }

      // 이미지 파일들을 Base64로 변환
      const imageDataArray: string[] = [];
      for (const image of filesResult.value.images) {
        let imageBuffer: ArrayBuffer;
        if (image.uploadUrl.startsWith('/uploads/')) {
          const fs = await import('fs/promises');
          const path = await import('path');
          const filePath = path.join(process.cwd(), image.uploadUrl);
          const buffer = await fs.readFile(filePath);
          imageBuffer = buffer.buffer;
        } else {
          imageBuffer = await fetch(image.uploadUrl).then(res => res.arrayBuffer());
        }
        const base64 = Buffer.from(imageBuffer).toString('base64');
        const mimeType = image.uploadUrl.includes('.png') ? 'image/png' : 'image/jpeg';
        imageDataArray.push(`data:${mimeType};base64,${base64}`);
      }

      // AI 분석 시작 알림
      progressManager.updateAnalysisProgress(validatedData.sessionId, 'AI 분석을 시작합니다...', 10);
      
      // Enhanced Analysis Service로 분석
      const { EnhancedAnalysisService } = await import('@/lib/ai/enhanced-analysis-service');
      const analysisService = new EnhancedAnalysisService();
      
      progressManager.updateAnalysisProgress(validatedData.sessionId, 'Excel 데이터와 이미지를 비교 분석 중...', 30);
      
      const result = await analysisService.analyze({
        type: 'hybrid',
        userId: userId,
        userTier: validatedData.selectedTier || userTier,
        sessionId: validatedData.sessionId,
        excelData: excelDataResult.value,
        imageDataArray,
        query: validatedData.query || filesResult.value.analysisPrompt,
        options: {
          ...validatedData.options,
          compareMode: true
        }
      });
      
      progressManager.updateAnalysisProgress(validatedData.sessionId, '분석 결과 생성 중...', 90);
      
      // 분석 완료
      progressManager.markCompleted(validatedData.sessionId);

      return Response.json({
        success: true,
        data: {
          analysis: result.result.content,
          confidence: result.result.confidence,
          sessionId: result.analysisId,
          comparisons: result.result.comparisons,
          corrections: result.result.corrections,
          metadata: result.metadata
        }
      });
    }

    // 기존 분석 로직 (text, image)
    const result = await aiHelpers.analyzeExcel({
      type: validatedData.type as 'text' | 'image',
      content: validatedData.content || '',
      userId: userId,
      userTier: userTier,
      options: validatedData.options
    });

    // 응답 반환
    return Response.json({
      success: true,
      data: {
        analysis: result.content,
        confidence: result.confidence,
        sessionId: result.metadata?.sessionId,
        metadata: {
          model: result.metadata?.selectedModel,
          processingTime: result.metadata?.processingTime,
          optimizations: result.metadata?.optimizations,
          experimentInfo: result.metadata?.experimentId ? {
            experimentId: result.metadata.experimentId,
            variantId: result.metadata.variantId
          } : undefined
        }
      }
    });

  } catch (error) {
    console.error('AI 분석 오류:', error);
    
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: '잘못된 요청 형식', details: error.errors },
        { status: 400 }
      );
    }

    return Response.json(
      { error: '분석 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 피드백 제출 엔드포인트
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const { sessionId, rating, accuracy, usefulness, comments } = await request.json();

    await aiHelpers.submitFeedback({
      sessionId,
      rating,
      accuracy,
      usefulness,
      comments
    });

    return Response.json({ success: true });

  } catch (error) {
    console.error('피드백 제출 오류:', error);
    return Response.json(
      { error: '피드백 제출 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}