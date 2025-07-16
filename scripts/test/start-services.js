#!/usr/bin/env node

/**
 * 테스트를 위한 서비스 시작 스크립트
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Excel App 서비스를 시작합니다...\n');

// 색상 코드
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

// 프로세스 목록
const processes = [];

// 프로세스 종료 핸들러
function cleanup() {
  console.log('\n\n정리 중...');
  processes.forEach(proc => {
    if (proc && !proc.killed) {
      proc.kill();
    }
  });
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// 1. Redis 확인
console.log(`${colors.yellow}1. Redis 서버 확인...${colors.reset}`);
const redis = spawn('redis-cli', ['ping'], { stdio: 'pipe' });
redis.on('error', () => {
  console.log(`${colors.red}❌ Redis가 실행되지 않았습니다. 먼저 Redis를 시작하세요:${colors.reset}`);
  console.log('   brew services start redis (Mac)');
  console.log('   또는 redis-server');
  process.exit(1);
});
redis.stdout.on('data', (data) => {
  if (data.toString().trim() === 'PONG') {
    console.log(`${colors.green}✓ Redis가 실행 중입니다${colors.reset}`);
  }
});

// 2. 필요한 디렉토리 생성
console.log(`\n${colors.yellow}2. 필요한 디렉토리 생성...${colors.reset}`);
const dirs = ['uploads', 'logs', 'temp'];
dirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`   ✓ ${dir} 디렉토리 생성됨`);
  }
});

// 3. Prisma 생성
console.log(`\n${colors.yellow}3. Prisma 클라이언트 생성...${colors.reset}`);
const prismaGenerate = spawn('npx', ['prisma', 'generate'], { 
  stdio: 'inherit',
  cwd: __dirname 
});

prismaGenerate.on('close', (code) => {
  if (code === 0) {
    console.log(`${colors.green}✓ Prisma 클라이언트 생성 완료${colors.reset}`);
    
    // 4. WebSocket 서버 시작
    console.log(`\n${colors.yellow}4. WebSocket 서버 시작 (포트 3001)...${colors.reset}`);
    const socketServer = spawn('node', ['socket-server.js'], {
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    processes.push(socketServer);
    
    socketServer.stdout.on('data', (data) => {
      console.log(`[WebSocket] ${data.toString().trim()}`);
    });
    
    socketServer.stderr.on('data', (data) => {
      console.error(`[WebSocket Error] ${data.toString().trim()}`);
    });
    
    // 5. Next.js 개발 서버 시작
    setTimeout(() => {
      console.log(`\n${colors.yellow}5. Next.js 개발 서버 시작 (포트 3000)...${colors.reset}`);
      const nextServer = spawn('npm', ['run', 'dev'], {
        cwd: __dirname,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: 'development' }
      });
      
      processes.push(nextServer);
      
      nextServer.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Ready')) {
          console.log(`\n${colors.green}✨ 모든 서비스가 시작되었습니다!${colors.reset}\n`);
          console.log('접속 주소:');
          console.log(`  - 메인: ${colors.blue}http://localhost:3000${colors.reset}`);
          console.log(`  - 테스트: ${colors.blue}http://localhost:3000/test${colors.reset}`);
          console.log(`  - Excel 대시보드: ${colors.blue}http://localhost:3000/excel/dashboard${colors.reset}`);
          console.log(`  - VBA 추출: ${colors.blue}http://localhost:3000/vba/extract${colors.reset}`);
          console.log(`  - 캐시 관리: ${colors.blue}http://localhost:3000/admin/cache${colors.reset}`);
          console.log(`\n${colors.yellow}테스트 실행:${colors.reset}`);
          console.log(`  node tests/quick-test.js`);
          console.log(`\n${colors.yellow}종료하려면 Ctrl+C를 누르세요${colors.reset}`);
        } else if (!output.includes('Compiling') && !output.includes('webpack')) {
          console.log(`[Next.js] ${output.trim()}`);
        }
      });
      
      nextServer.stderr.on('data', (data) => {
        const error = data.toString();
        if (!error.includes('Experimental features') && !error.includes('Warning')) {
          console.error(`[Next.js Error] ${error.trim()}`);
        }
      });
    }, 2000);
    
  } else {
    console.log(`${colors.red}❌ Prisma 클라이언트 생성 실패${colors.reset}`);
    process.exit(1);
  }
});

// 에러 핸들링
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  cleanup();
});