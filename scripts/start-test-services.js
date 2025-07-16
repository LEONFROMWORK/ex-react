#!/usr/bin/env node

/**
 * 테스트 환경용 서비스 시작 스크립트
 * Mock 서비스들만 사용하므로 외부 의존성 없음
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('테스트 환경 서비스 시작');
console.log('====================');
console.log('✓ 모든 외부 서비스는 Mock으로 대체됩니다.');
console.log('✓ 데이터베이스: SQLite (test.db)');
console.log('✓ 캐시: 메모리 캐시');
console.log('✓ 파일 저장소: 로컬 디렉토리');
console.log('✓ AI 서비스: Mock AI');
console.log('✓ 이메일: Mock 이메일');
console.log('');

// 테스트 DB 초기화
console.log('데이터베이스 초기화 중...');
const dbInit = spawn('npm', ['run', 'db:migrate:test'], {
  stdio: 'inherit',
  shell: true
});

dbInit.on('close', (code) => {
  if (code !== 0) {
    console.error('데이터베이스 초기화 실패');
    process.exit(1);
  }
  
  console.log('✓ 데이터베이스 초기화 완료');
  console.log('');
  console.log('테스트 환경 준비 완료!');
  console.log('');
  console.log('다음 명령어로 애플리케이션을 실행하세요:');
  console.log('  npm run dev:test    # 개발 서버 (테스트 환경)');
  console.log('  npm run test:app    # 테스트 실행');
  console.log('');
  console.log('환경 설정 확인:');
  console.log('  npm run env:check   # 현재 환경 설정 확인');
});