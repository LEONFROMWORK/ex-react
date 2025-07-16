#!/usr/bin/env node

/**
 * Git 커밋 준비 스크립트
 * 테스트 환경에서 작업한 내용을 배포 버전으로 준비합니다
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Git 커밋 준비');
console.log('=============\n');

// 현재 환경 확인
let currentEnv = 'unknown';
if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const envMatch = envContent.match(/APP_ENV=(\w+)/);
  if (envMatch) {
    currentEnv = envMatch[1];
  }
}

console.log(`현재 환경: ${currentEnv}`);

if (currentEnv === 'test') {
  console.log('\n⚠️  테스트 환경에서 작업 중입니다.');
  console.log('   배포 버전으로 전환하여 커밋 준비를 시작합니다.\n');
  
  // 현재 .env.local 백업
  if (fs.existsSync('.env.local')) {
    fs.copyFileSync('.env.local', '.env.local.backup');
    console.log('✓ 현재 테스트 환경 설정을 백업했습니다.');
  }
  
  // 배포용 환경 설정 복사
  if (fs.existsSync('.env.example')) {
    fs.copyFileSync('.env.example', '.env.local');
    console.log('✓ 배포용 기본 환경 설정을 적용했습니다.');
  }
  
  // 테스트 전용 파일들 확인
  const testOnlyFiles = [
    'test.db',
    'test.db-journal',
    'uploads/test',
    'logs/test'
  ];
  
  console.log('\n테스트 파일 확인:');
  testOnlyFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`  - ${file} (gitignore에 포함됨)`);
    }
  });
  
  // Git 상태 확인
  console.log('\n현재 Git 상태:');
  execSync('git status --short', { stdio: 'inherit' });
  
  console.log('\n✅ 커밋 준비 완료!');
  console.log('\n다음 단계:');
  console.log('1. 변경 사항 확인: git diff');
  console.log('2. 파일 추가: git add .');
  console.log('3. 커밋: git commit -m "메시지"');
  console.log('4. 푸시: git push');
  console.log('\n커밋 후 테스트 환경으로 돌아가려면:');
  console.log('  npm run env:restore-test');
  
} else if (currentEnv === 'production') {
  console.log('\n⚠️  프로덕션 환경 설정이 활성화되어 있습니다.');
  console.log('   실제 API 키가 노출되지 않도록 주의하세요!');
  console.log('   배포용 기본 설정으로 전환하는 것을 권장합니다.');
  
} else {
  console.log('\n✓ 개발 환경입니다. 커밋을 진행할 수 있습니다.');
}

// 중요 파일 체크
console.log('\n중요 파일 확인:');
const importantFiles = [
  { file: '.env.local', warning: '환경 설정 파일 (커밋되지 않음)' },
  { file: '.env.production', warning: '프로덕션 템플릿 (실제 키 포함 금지)' },
  { file: 'src/config/index.ts', warning: '환경 설정 모듈' }
];

importantFiles.forEach(({ file, warning }) => {
  if (fs.existsSync(file)) {
    console.log(`  ✓ ${file} - ${warning}`);
  }
});