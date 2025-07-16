#!/usr/bin/env node

/**
 * 배포 환경 검증 스크립트
 * 배포 전 필수 설정과 파일들을 확인합니다
 */

const fs = require('fs');
const path = require('path');

const checks = [];
let hasError = false;

function check(name, condition, errorMessage) {
  if (condition) {
    checks.push({ name, status: 'pass', message: '✓' });
  } else {
    checks.push({ name, status: 'fail', message: errorMessage });
    hasError = true;
  }
}

console.log('배포 환경 검증');
console.log('==============\n');

// 1. 필수 파일 확인
console.log('1. 필수 파일 확인');
const requiredFiles = [
  'package.json',
  'package-lock.json',
  'next.config.mjs',
  'tsconfig.json',
  'prisma/schema.prisma',
  '.env.production'
];

requiredFiles.forEach(file => {
  check(
    `${file} 존재`,
    fs.existsSync(file),
    `${file} 파일이 없습니다`
  );
});

// 2. 환경 변수 확인
console.log('\n2. 환경 변수 확인');
if (fs.existsSync('.env.production')) {
  const envContent = fs.readFileSync('.env.production', 'utf8');
  const requiredEnvVars = [
    'DATABASE_PROVIDER',
    'DATABASE_URL',
    'AUTH_SECRET',
    'NEXTAUTH_URL',
    'OPENAI_API_KEY'
  ];
  
  requiredEnvVars.forEach(envVar => {
    const hasVar = envContent.includes(`${envVar}=`) && 
                  !envContent.match(new RegExp(`^\\s*#.*${envVar}=`, 'm'));
    check(
      `${envVar} 설정됨`,
      hasVar,
      `.env.production에 ${envVar}가 설정되지 않았습니다`
    );
  });
}

// 3. 의존성 확인
console.log('\n3. 의존성 확인');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const criticalDeps = [
  '@prisma/client',
  'next',
  'react',
  'react-dom',
  'bcryptjs'
];

criticalDeps.forEach(dep => {
  check(
    `${dep} 설치됨`,
    packageJson.dependencies[dep] !== undefined,
    `필수 의존성 ${dep}가 package.json에 없습니다`
  );
});

// 4. 빌드 가능 여부 확인
console.log('\n4. 빌드 테스트');
try {
  console.log('   TypeScript 컴파일 확인 중...');
  require('child_process').execSync('npx tsc --noEmit', { stdio: 'pipe' });
  check('TypeScript 컴파일', true);
} catch (error) {
  check('TypeScript 컴파일', false, 'TypeScript 컴파일 오류가 있습니다');
}

// 5. Prisma 설정 확인
console.log('\n5. Prisma 설정 확인');
const prismaSchema = fs.readFileSync('prisma/schema.prisma', 'utf8');
check(
  'DATABASE_PROVIDER 사용',
  prismaSchema.includes('provider = env("DATABASE_PROVIDER")'),
  'Prisma 스키마가 DATABASE_PROVIDER를 사용하지 않습니다'
);

// 6. 보안 확인
console.log('\n6. 보안 확인');
const suspiciousPatterns = [
  { pattern: /console\.log.*password/i, name: '비밀번호 로깅' },
  { pattern: /hardcoded.*secret/i, name: '하드코딩된 시크릿' },
  { pattern: /test.*key.*=.*["'][\w]+["']/i, name: '테스트 API 키' }
];

const jsFiles = [];
function findJsFiles(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      findJsFiles(fullPath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
      jsFiles.push(fullPath);
    }
  });
}

findJsFiles('src');
let securityIssues = 0;

jsFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  suspiciousPatterns.forEach(({ pattern, name }) => {
    if (pattern.test(content)) {
      console.log(`   ⚠️  ${name} 발견: ${file}`);
      securityIssues++;
    }
  });
});

check(
  '보안 이슈 없음',
  securityIssues === 0,
  `${securityIssues}개의 잠재적 보안 이슈가 발견되었습니다`
);

// 결과 출력
console.log('\n검증 결과');
console.log('==========');
checks.forEach(({ name, status, message }) => {
  const icon = status === 'pass' ? '✅' : '❌';
  console.log(`${icon} ${name}: ${message}`);
});

if (hasError) {
  console.log('\n❌ 배포 준비가 완료되지 않았습니다.');
  console.log('   위의 오류들을 수정한 후 다시 실행하세요.');
  process.exit(1);
} else {
  console.log('\n✅ 배포 준비가 완료되었습니다!');
  console.log('\n다음 단계:');
  console.log('1. npm run build:prod    # 프로덕션 빌드');
  console.log('2. npm run start:prod    # 프로덕션 서버 시작');
  console.log('3. 또는 Docker 사용:');
  console.log('   docker-compose -f docker-compose.prod.yml up');
}