'use client';

import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface AnalysisProgress {
  sessionId: string;
  stage: 'uploading' | 'processing' | 'analyzing' | 'completed' | 'error';
  progress: number;
  message: string;
  details?: {
    currentStep?: string;
    totalSteps?: number;
    estimatedTime?: number;
  };
  error?: string;
}

export function useAnalysisProgress(sessionId: string | null) {
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    // Socket.IO 클라이언트 초기화
    const socketInstance = io({
      path: '/api/socket',
      transports: ['websocket', 'polling'],
    });

    socketInstance.on('connect', () => {
      console.log('Connected to progress socket');
      setIsConnected(true);
      
      // 세션 구독
      socketInstance.emit('subscribe', sessionId);
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from progress socket');
      setIsConnected(false);
    });

    socketInstance.on('progress', (data: AnalysisProgress) => {
      setProgress(data);
    });

    socketInstance.on('error', (error: any) => {
      console.error('Socket error:', error);
    });

    setSocket(socketInstance);

    return () => {
      if (socketInstance) {
        socketInstance.emit('unsubscribe', sessionId);
        socketInstance.disconnect();
      }
    };
  }, [sessionId]);

  const reset = useCallback(() => {
    setProgress(null);
  }, []);

  return {
    progress,
    isConnected,
    reset
  };
}