import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { aiHelpers } from '@/lib/ai';

// 관리자 전용 대시보드 API
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // 관리자 권한 확인
    if (!session?.user || session.user.role !== 'ADMIN') {
      return Response.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    // 쿼리 파라미터에서 시간 범위 가져오기
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');
    
    const timeRange = {
      start: startDate ? new Date(startDate) : new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: endDate ? new Date(endDate) : new Date()
    };

    // 대시보드 데이터 가져오기
    const [dashboardData, costAnalysis] = await Promise.all([
      aiHelpers.getDashboardData(timeRange),
      aiHelpers.getCostAnalysis()
    ]);

    return Response.json({
      success: true,
      data: {
        dashboard: dashboardData,
        cost: costAnalysis,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('대시보드 데이터 조회 오류:', error);
    return Response.json(
      { error: '대시보드 데이터 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 실시간 메트릭 스트리밍 (Server-Sent Events)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return Response.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    // SSE 스트림 생성
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        // 실시간 메트릭 스트리밍
        const { PerformanceDashboard } = await import('@/lib/ai/performance-dashboard');
        const dashboard = new PerformanceDashboard();
        
        const cleanup = await dashboard.streamRealtimeMetrics((metrics) => {
          const data = JSON.stringify(metrics);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        });

        // 30분 후 자동 종료
        setTimeout(() => {
          cleanup();
          controller.close();
        }, 30 * 60 * 1000);
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

  } catch (error) {
    console.error('실시간 스트리밍 오류:', error);
    return Response.json(
      { error: '실시간 데이터 스트리밍 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}