import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { NextApiResponse } from 'next';

export interface AnalysisProgress {
  sessionId: string;
  stage: 'uploading' | 'processing' | 'analyzing' | 'completed' | 'error';
  progress: number; // 0-100
  message: string;
  details?: {
    currentStep?: string;
    totalSteps?: number;
    estimatedTime?: number; // seconds
  };
  error?: string;
}

class AnalysisProgressManager {
  private io: SocketIOServer | null = null;
  private progressMap: Map<string, AnalysisProgress> = new Map();

  initialize(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      path: '/api/socket',
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        credentials: true
      }
    });

    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      // 클라이언트가 특정 세션 구독
      socket.on('subscribe', (sessionId: string) => {
        socket.join(`session:${sessionId}`);
        
        // 기존 진행상황이 있으면 전송
        const existingProgress = this.progressMap.get(sessionId);
        if (existingProgress) {
          socket.emit('progress', existingProgress);
        }
      });

      // 구독 해제
      socket.on('unsubscribe', (sessionId: string) => {
        socket.leave(`session:${sessionId}`);
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
  }

  updateProgress(progress: AnalysisProgress) {
    this.progressMap.set(progress.sessionId, progress);
    
    if (this.io) {
      this.io.to(`session:${progress.sessionId}`).emit('progress', progress);
    }
    
    // 완료되거나 에러인 경우 일정 시간 후 제거
    if (progress.stage === 'completed' || progress.stage === 'error') {
      setTimeout(() => {
        this.progressMap.delete(progress.sessionId);
      }, 300000); // 5분 후 제거
    }
  }

  // 파일 업로드 진행상황
  updateUploadProgress(sessionId: string, progress: number) {
    this.updateProgress({
      sessionId,
      stage: 'uploading',
      progress,
      message: `파일 업로드 중... ${progress}%`
    });
  }

  // Excel 처리 진행상황
  updateProcessingProgress(sessionId: string, currentStep: string, totalSteps: number) {
    const stepProgress = {
      'parsing': 20,
      'validation': 40,
      'error-detection': 60,
      'formatting': 80,
      'completed': 100
    };

    this.updateProgress({
      sessionId,
      stage: 'processing',
      progress: stepProgress[currentStep] || 50,
      message: 'Excel 파일 처리 중...',
      details: {
        currentStep,
        totalSteps
      }
    });
  }

  // AI 분석 진행상황
  updateAnalysisProgress(sessionId: string, message: string, progress: number) {
    this.updateProgress({
      sessionId,
      stage: 'analyzing',
      progress,
      message,
      details: {
        estimatedTime: Math.max(5, (100 - progress) * 0.3) // 예상 시간 계산
      }
    });
  }

  // 완료
  markCompleted(sessionId: string) {
    this.updateProgress({
      sessionId,
      stage: 'completed',
      progress: 100,
      message: '분석이 완료되었습니다!'
    });
  }

  // 에러
  markError(sessionId: string, error: string) {
    this.updateProgress({
      sessionId,
      stage: 'error',
      progress: 0,
      message: '오류가 발생했습니다',
      error
    });
  }
}

// 싱글톤 인스턴스
export const progressManager = new AnalysisProgressManager();

// Next.js API Route에서 WebSocket 초기화를 위한 헬퍼
export function initializeWebSocket(res: NextApiResponse) {
  if (!res.socket.server.io) {
    console.log('Initializing Socket.IO...');
    const io = new SocketIOServer(res.socket.server as any, {
      path: '/api/socket',
      addTrailingSlash: false,
    });
    res.socket.server.io = io;
    progressManager.initialize(res.socket.server as any);
  }
}