#!/usr/bin/env node

/**
 * Excel App 통합 실행 스크립트
 * 모든 서비스를 시작하고 테스트를 자동으로 실행합니다
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const net = require('net');

// 색상 코드
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  dim: '\x1b[2m'
};

const processes = [];
let testTimeout;

// 프로세스 정리
function cleanup() {
  console.log('\n\n🛑 서비스 종료 중...');
  if (testTimeout) clearTimeout(testTimeout);
  processes.forEach(proc => {
    if (proc && !proc.killed) {
      proc.kill();
    }
  });
  setTimeout(() => process.exit(0), 1000);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// 포트 확인
function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
}

// HTTP 요청 헬퍼
function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

// 대기 함수
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 메인 실행 함수
async function main() {
  console.log(`${colors.cyan}╔════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║       Excel App 통합 실행 스크립트      ║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════╝${colors.reset}\n`);

  // 1. 사전 체크
  console.log(`${colors.yellow}📋 사전 체크 중...${colors.reset}`);
  
  // node_modules 확인
  if (!fs.existsSync('node_modules')) {
    console.log(`${colors.yellow}📦 패키지 설치 중... (시간이 걸릴 수 있습니다)${colors.reset}`);
    await new Promise((resolve, reject) => {
      const npm = spawn('npm', ['install'], { stdio: 'inherit' });
      npm.on('close', code => code === 0 ? resolve() : reject(new Error('npm install 실패')));
    });
  }

  // 필요한 디렉토리 생성
  ['uploads', 'logs', 'temp'].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`   ✓ ${dir} 디렉토리 생성`);
    }
  });

  // 포트 확인
  const port3000Free = await checkPort(3000);
  const port3001Free = await checkPort(3001);
  
  if (!port3000Free) {
    console.log(`${colors.red}❌ 포트 3000이 이미 사용 중입니다${colors.reset}`);
    console.log(`   다음 명령으로 확인: lsof -i :3000`);
  }
  
  if (!port3001Free) {
    console.log(`${colors.red}❌ 포트 3001이 이미 사용 중입니다${colors.reset}`);
    console.log(`   다음 명령으로 확인: lsof -i :3001`);
  }

  // 2. Prisma 클라이언트 생성
  console.log(`\n${colors.yellow}🔧 Prisma 클라이언트 생성...${colors.reset}`);
  try {
    await new Promise((resolve, reject) => {
      exec('npx prisma generate', (error, stdout, stderr) => {
        if (error) reject(error);
        else resolve();
      });
    });
    console.log(`   ${colors.green}✓ Prisma 클라이언트 생성 완료${colors.reset}`);
  } catch (error) {
    console.log(`   ${colors.yellow}⚠ Prisma 생성 실패 (데이터베이스 없이 실행)${colors.reset}`);
  }

  // 3. WebSocket 서버 시작
  if (port3001Free) {
    console.log(`\n${colors.yellow}🔌 WebSocket 서버 시작 중...${colors.reset}`);
    const socketServer = spawn('node', ['socket-server.js'], {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    processes.push(socketServer);
    
    socketServer.stdout.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg.includes('3001')) {
        console.log(`   ${colors.green}✓ WebSocket 서버 시작됨 (포트 3001)${colors.reset}`);
      }
    });
  }

  // 4. Next.js 서버 시작
  if (port3000Free) {
    console.log(`\n${colors.yellow}🚀 Next.js 개발 서버 시작 중...${colors.reset}`);
    
    // APP_ENV가 test로 설정되어 있으면 dev:test 사용
    const devCommand = process.env.APP_ENV === 'test' ? 'dev:test' : 'dev';
    
    const nextServer = spawn('npm', ['run', devCommand], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env }
    });
    processes.push(nextServer);
    
    let serverReady = false;
    nextServer.stdout.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes('Ready') && !serverReady) {
        serverReady = true;
        console.log(`   ${colors.green}✓ Next.js 서버 시작됨 (포트 3000)${colors.reset}`);
        
        // 서버가 준비되면 테스트 실행
        testTimeout = setTimeout(runTests, 3000);
      }
    });
    
    nextServer.stderr.on('data', (data) => {
      const msg = data.toString();
      if (!msg.includes('Experimental') && !msg.includes('Warning')) {
        console.error(`   ${colors.red}Next.js 오류: ${msg}${colors.reset}`);
      }
    });
  }

  // 모든 서버가 사용 중인 경우
  if (!port3000Free && !port3001Free) {
    console.log(`\n${colors.yellow}⚠ 모든 포트가 사용 중입니다. 기존 서버에서 테스트를 실행합니다.${colors.reset}`);
    await delay(2000);
    runTests();
  }
}

// 테스트 실행
async function runTests() {
  console.log(`\n${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.magenta}🧪 테스트 시작${colors.reset}`);
  console.log(`${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  // API 테스트
  const tests = [
    { name: '서버 연결', url: 'http://localhost:3000/api/health' },
    { name: '템플릿 목록', url: 'http://localhost:3000/api/excel/templates' },
    { name: '캐시 상태', url: 'http://localhost:3000/api/admin/cache/stats' }
  ];

  for (const test of tests) {
    try {
      const result = await httpGet(test.url);
      if (result.status === 200) {
        console.log(`${colors.green}✓${colors.reset} ${test.name}`);
      } else {
        console.log(`${colors.red}✗${colors.reset} ${test.name} (상태: ${result.status})`);
      }
    } catch (error) {
      console.log(`${colors.red}✗${colors.reset} ${test.name} (연결 실패)`);
    }
  }

  // quick-test.js 실행
  if (fs.existsSync('tests/quick-test.js')) {
    console.log(`\n${colors.yellow}📝 상세 테스트 실행 중...${colors.reset}`);
    const quickTest = spawn('node', ['tests/quick-test.js'], {
      stdio: 'inherit'
    });
    
    quickTest.on('close', (code) => {
      if (code === 0) {
        console.log(`\n${colors.green}✅ 모든 테스트 완료!${colors.reset}`);
      } else {
        console.log(`\n${colors.red}❌ 일부 테스트 실패${colors.reset}`);
      }
      
      showDashboard();
    });
  } else {
    showDashboard();
  }
}

// 대시보드 표시
function showDashboard() {
  console.log(`\n${colors.cyan}╔════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║         서비스 준비 완료!              ║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════╝${colors.reset}\n`);
  
  console.log(`${colors.yellow}🌐 접속 가능한 URL:${colors.reset}`);
  console.log(`   메인: ${colors.blue}http://localhost:3000${colors.reset}`);
  console.log(`   테스트 페이지: ${colors.blue}http://localhost:3000/test${colors.reset}`);
  console.log(`   Excel 대시보드: ${colors.blue}http://localhost:3000/excel/dashboard${colors.reset}`);
  console.log(`   VBA 추출: ${colors.blue}http://localhost:3000/vba/extract${colors.reset}`);
  console.log(`   캐시 관리: ${colors.blue}http://localhost:3000/admin/cache${colors.reset}`);
  
  console.log(`\n${colors.yellow}📊 서비스 상태:${colors.reset}`);
  console.log(`   Next.js: ${colors.green}● 실행 중${colors.reset} (포트 3000)`);
  console.log(`   WebSocket: ${colors.green}● 실행 중${colors.reset} (포트 3001)`);
  
  console.log(`\n${colors.dim}종료하려면 Ctrl+C를 누르세요${colors.reset}`);
}

// 실행
main().catch(error => {
  console.error(`${colors.red}오류 발생:${colors.reset}`, error);
  cleanup();
});