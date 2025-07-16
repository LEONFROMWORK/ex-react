#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 Excel App 설정 및 테스트 시작...\n');

const steps = [
  {
    name: '데이터베이스 초기화',
    command: 'node init-db.js'
  },
  {
    name: 'Redis 확인',
    command: 'redis-cli ping',
    optional: true
  },
  {
    name: '서버 시작',
    command: 'node run-everything.js'
  }
];

console.log('📋 실행할 작업:');
console.log('1. SQLite 데이터베이스 생성');
console.log('2. Redis 연결 확인 (선택사항)');
console.log('3. 모든 서비스 시작');
console.log('4. API 테스트\n');

// 데이터베이스 초기화만 먼저 실행
try {
  console.log('🗄️  데이터베이스 초기화 중...');
  execSync('node init-db.js', { stdio: 'inherit' });
  console.log('\n✅ 데이터베이스 준비 완료!');
  
  console.log('\n이제 다음 명령을 실행하세요:');
  console.log('   node run-everything.js');
  console.log('\n서버가 시작되면 http://localhost:3000/test 에서 테스트하세요.');
  console.log('\n💡 팁: Chrome 확장 프로그램 오류가 있다면 시크릿 모드를 사용하세요!');
} catch (error) {
  console.error('❌ 오류 발생:', error.message);
}