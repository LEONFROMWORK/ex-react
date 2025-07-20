import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UploadMultipleFilesHandler } from '@/src/Features/ExcelUpload/UploadMultipleFiles';
import { LocalFileStorage } from '@/src/Features/ExcelUpload/UploadExcel';
import { FileRepository } from '@/src/Infrastructure/Repositories/FileRepository';
import { progressManager } from '@/lib/websocket/analysis-progress';

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

    // FormData 파싱
    const formData = await request.formData();
    
    // Excel 파일 추출
    const excelFile = formData.get('excelFile') as File;
    if (!excelFile) {
      return Response.json(
        { error: 'Excel 파일이 필요합니다.' },
        { status: 400 }
      );
    }

    // 이미지 파일들 추출
    const imageFiles: File[] = [];
    for (let i = 0; i < 5; i++) { // 최대 5개
      const imageFile = formData.get(`imageFile${i}`) as File;
      if (imageFile) {
        imageFiles.push(imageFile);
      }
    }

    if (imageFiles.length === 0) {
      return Response.json(
        { error: '최소 1개의 이미지 파일이 필요합니다.' },
        { status: 400 }
      );
    }

    // 분석 프롬프트
    const analysisPrompt = formData.get('analysisPrompt') as string;

    // 파일 업로드 처리
    const fileRepository = new FileRepository();
    const fileStorage = new LocalFileStorage();
    const uploadHandler = new UploadMultipleFilesHandler(fileRepository, fileStorage);

    // 임시 세션 ID 생성
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // 업로드 시작 알림
    progressManager.updateUploadProgress(sessionId, 10);
    
    const result = await uploadHandler.handle({
      excelFile,
      imageFiles,
      userId: userId,
      analysisPrompt,
      sessionId // 세션 ID 전달
    });

    if (!result.isSuccess) {
      progressManager.markError(sessionId, result.error.message);
      return Response.json(
        { error: result.error.message },
        { status: 400 }
      );
    }
    
    // 업로드 완료
    progressManager.updateUploadProgress(sessionId, 100);

    return Response.json({
      success: true,
      data: {
        ...result.value,
        sessionId // 클라이언트에 세션 ID 반환
      }
    });

  } catch (error) {
    console.error('Multiple file upload error:', error);
    return Response.json(
      { error: '파일 업로드 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}