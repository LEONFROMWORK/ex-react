/**
 * WebSocket 서버 - 실시간 진행률 업데이트용
 */

const { Server } = require('socket.io');
const http = require('http');

const PORT = process.env.WEBSOCKET_PORT || 3001;

// HTTP 서버 생성
const server = http.createServer();

// Socket.IO 서버 생성
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// 연결된 클라이언트 관리
const clients = new Map();

// 진행 중인 작업 관리
const tasks = new Map();

io.on('connection', (socket) => {
  console.log(`클라이언트 연결: ${socket.id}`);
  clients.set(socket.id, { connected: new Date() });

  // 작업 시작
  socket.on('task:start', (data) => {
    const { taskId, type, description } = data;
    tasks.set(taskId, {
      id: taskId,
      type,
      description,
      status: 'running',
      progress: 0,
      startTime: new Date(),
      socketId: socket.id
    });
    
    socket.emit('task:started', { taskId });
    console.log(`작업 시작: ${taskId} - ${description}`);
  });

  // 진행률 업데이트
  socket.on('task:progress', (data) => {
    const { taskId, progress, message } = data;
    const task = tasks.get(taskId);
    
    if (task && task.socketId === socket.id) {
      task.progress = progress;
      task.lastUpdate = new Date();
      task.message = message;
      
      // 모든 클라이언트에게 진행률 브로드캐스트
      io.emit('progress:update', {
        taskId,
        progress,
        message,
        timestamp: new Date()
      });
    }
  });

  // 작업 완료
  socket.on('task:complete', (data) => {
    const { taskId, result } = data;
    const task = tasks.get(taskId);
    
    if (task && task.socketId === socket.id) {
      task.status = 'completed';
      task.progress = 100;
      task.endTime = new Date();
      task.result = result;
      
      io.emit('task:completed', {
        taskId,
        duration: task.endTime - task.startTime,
        result
      });
      
      console.log(`작업 완료: ${taskId}`);
      
      // 완료된 작업은 5분 후 삭제
      setTimeout(() => tasks.delete(taskId), 5 * 60 * 1000);
    }
  });

  // 작업 실패
  socket.on('task:error', (data) => {
    const { taskId, error } = data;
    const task = tasks.get(taskId);
    
    if (task && task.socketId === socket.id) {
      task.status = 'failed';
      task.error = error;
      task.endTime = new Date();
      
      io.emit('task:failed', {
        taskId,
        error,
        duration: task.endTime - task.startTime
      });
      
      console.log(`작업 실패: ${taskId} - ${error}`);
    }
  });

  // 작업 취소
  socket.on('task:cancel', (data) => {
    const { taskId } = data;
    const task = tasks.get(taskId);
    
    if (task) {
      task.status = 'cancelled';
      task.endTime = new Date();
      
      io.emit('task:cancelled', { taskId });
      console.log(`작업 취소: ${taskId}`);
    }
  });

  // 연결 해제
  socket.on('disconnect', () => {
    console.log(`클라이언트 연결 해제: ${socket.id}`);
    clients.delete(socket.id);
    
    // 해당 소켓의 진행 중인 작업 정리
    for (const [taskId, task] of tasks.entries()) {
      if (task.socketId === socket.id && task.status === 'running') {
        task.status = 'disconnected';
        io.emit('task:disconnected', { taskId });
      }
    }
  });

  // 상태 조회
  socket.on('status:request', () => {
    socket.emit('status:response', {
      connectedClients: clients.size,
      activeTasks: Array.from(tasks.values()).filter(t => t.status === 'running').length,
      totalTasks: tasks.size
    });
  });
});

// 서버 시작
server.listen(PORT, () => {
  console.log(`WebSocket 서버가 포트 ${PORT}에서 실행 중입니다`);
});

// 정리 작업
process.on('SIGTERM', () => {
  console.log('서버 종료 중...');
  io.close(() => {
    server.close(() => {
      console.log('서버가 종료되었습니다');
      process.exit(0);
    });
  });
});