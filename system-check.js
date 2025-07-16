#!/usr/bin/env node

/**
 * Excel App 시스템 체크 스크립트
 * 현재 상태를 확인하고 실행 가능한 스크립트를 안내합니다
 */

const fs = require('fs');
const path = require('path');

// 색상 코드
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m'
};

console.log(`${colors.cyan}📊 Excel App 시스템 체크${colors.reset}\n`);

// 1. 기본 정보
console.log(`${colors.yellow}1. 기본 정보:${colors.reset}`);
console.log(`   작업 디렉토리: ${process.cwd()}`);
console.log(`   Node.js 버전: ${process.version}`);
console.log(`   플랫폼: ${process.platform}`);
console.log(`   현재 시간: ${new Date().toLocaleString('ko-KR')}\n`);

// 2. 프로젝트 구조 확인
console.log(`${colors.yellow}2. 프로젝트 구조:${colors.reset}`);
const checkPaths = [
  { path: 'package.json', type: '파일' },
  { path: 'node_modules', type: '디렉토리' },
  { path: '.env.local', type: '파일' },
  { path: 'prisma/schema.prisma', type: '파일' },
  { path: 'src', type: '디렉토리' },
  { path: 'tests', type: '디렉토리' },
  { path: 'uploads', type: '디렉토리' },
  { path: 'socket-server.js', type: '파일' },
  { path: 'start-services.js', type: '파일' }
];

checkPaths.forEach(({ path: filePath, type }) => {
  const exists = fs.existsSync(filePath);
  const icon = exists ? `${colors.green}✓` : `${colors.red}✗`;
  console.log(`   ${icon} ${filePath} (${type})${colors.reset}`);
});

// 3. 실행 가능한 스크립트
console.log(`\n${colors.yellow}3. 실행 가능한 스크립트:${colors.reset}`);
const scripts = [
  'start-services.js',
  'run-all-services.js',
  'run-everything.js',
  'complete-test.js',
  'test-services.js',
  'quick-start.js',
  'tests/quick-test.js'
];

scripts.forEach(script => {
  if (fs.existsSync(script)) {
    console.log(`   ${colors.green}✓${colors.reset} node ${script}`);
  }
});

// 4. package.json 스크립트
console.log(`\n${colors.yellow}4. npm 스크립트:${colors.reset}`);
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const npmScripts = Object.keys(packageJson.scripts || {});
  npmScripts.forEach(script => {
    console.log(`   npm run ${script}`);
  });
} catch (error) {
  console.log(`   ${colors.red}package.json을 읽을 수 없습니다${colors.reset}`);
}

// 5. 서비스 상태 확인 가능 여부
console.log(`\n${colors.yellow}5. 서비스 상태:${colors.reset}`);
console.log(`   Redis: ${colors.dim}redis-cli ping 명령으로 확인${colors.reset}`);
console.log(`   PostgreSQL: ${colors.dim}psql 명령으로 확인${colors.reset}`);
console.log(`   Next.js: ${colors.dim}http://localhost:3000 접속으로 확인${colors.reset}`);
console.log(`   WebSocket: ${colors.dim}http://localhost:3001 접속으로 확인${colors.reset}`);

// 6. 권장 실행 순서
console.log(`\n${colors.blue}📋 권장 실행 순서:${colors.reset}`);
console.log(`   1. ${colors.cyan}npm install${colors.reset} - 패키지 설치`);
console.log(`   2. ${colors.cyan}node start-services.js${colors.reset} - 모든 서비스 시작`);
console.log(`   3. ${colors.cyan}node tests/quick-test.js${colors.reset} - 테스트 실행`);
console.log(`   또는`);
console.log(`   ${colors.cyan}node run-everything.js${colors.reset} - 모든 작업 자동화`);

// 7. 문제점 요약
console.log(`\n${colors.yellow}6. 확인된 문제:${colors.reset}`);
let issues = 0;

if (!fs.existsSync('node_modules')) {
  console.log(`   ${colors.red}⚠ node_modules가 없습니다. npm install을 실행하세요${colors.reset}`);
  issues++;
}

if (!fs.existsSync('.env.local')) {
  console.log(`   ${colors.red}⚠ .env.local 파일이 없습니다. 환경 변수 설정이 필요합니다${colors.reset}`);
  issues++;
}

if (!fs.existsSync('uploads')) {
  console.log(`   ${colors.yellow}! uploads 디렉토리가 없습니다. 자동 생성됩니다${colors.reset}`);
}

if (issues === 0) {
  console.log(`   ${colors.green}✓ 모든 준비가 완료되었습니다!${colors.reset}`);
}

console.log(`\n${colors.dim}시스템 체크 완료${colors.reset}\n`);