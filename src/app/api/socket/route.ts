import { NextRequest, NextResponse } from 'next/server'
import { createServer } from 'http'
import { getProgressService } from '@/Services/WebSocket/WebSocketProgressService'

// WebSocket 서버는 Next.js API Route에서 직접 초기화할 수 없음
// 대신 커스텀 서버나 미들웨어를 사용해야 함

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'WebSocket 서버는 별도의 프로세스에서 실행되어야 합니다',
    instructions: [
      '1. server.js 파일을 생성하여 Express + Socket.IO 서버 구성',
      '2. Next.js와 별도로 WebSocket 서버 실행',
      '3. 또는 Next.js 13+ App Router의 Route Handlers 대신 Pages Router API 사용',
    ],
  })
}