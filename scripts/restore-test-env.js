#!/usr/bin/env node

/**
 * 테스트 환경 복원 스크립트
 * 커밋 후 다시 테스트 환경으로 돌아갑니다
 */

const fs = require('fs');
const path = require('path');

console.log('테스트 환경 복원');
console.log('===============\n');

// 백업 파일 확인
if (fs.existsSync('.env.local.backup')) {
  // 백업 복원
  fs.copyFileSync('.env.local.backup', '.env.local');
  console.log('✓ 테스트 환경 설정을 복원했습니다.');
  
  // 백업 파일 삭제
  fs.unlinkSync('.env.local.backup');
  console.log('✓ 백업 파일을 삭제했습니다.');
} else {
  // 백업이 없으면 .env.test 복사
  if (fs.existsSync('.env.test')) {
    fs.copyFileSync('.env.test', '.env.local');
    console.log('✓ 테스트 환경 설정을 적용했습니다.');
  } else {
    console.error('❌ 테스트 환경 파일을 찾을 수 없습니다.');
    process.exit(1);
  }
}

// 환경 확인
const envContent = fs.readFileSync('.env.local', 'utf8');
const envMatch = envContent.match(/APP_ENV=(\w+)/);

if (envMatch && envMatch[1] === 'test') {
  console.log('\n✅ 테스트 환경으로 복원되었습니다!');
  console.log('\n테스트 실행:');
  console.log('  npm run dev:test    # 개발 서버');
  console.log('  npm run test:app    # 통합 테스트');
} else {
  console.error('\n⚠️  환경 복원에 문제가 있을 수 있습니다.');
  console.error('   수동으로 확인해주세요.');
}