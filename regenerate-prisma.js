#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Prisma 클라이언트 재생성 중...\n');

try {
  // 1. 기존 Prisma 클라이언트 삭제
  const prismaClientPath = path.join(__dirname, 'node_modules', '.prisma');
  if (fs.existsSync(prismaClientPath)) {
    console.log('1. 기존 Prisma 클라이언트 삭제...');
    fs.rmSync(prismaClientPath, { recursive: true, force: true });
  }

  // 2. Prisma 생성
  console.log('2. Prisma 클라이언트 생성...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  // 3. 데이터베이스 파일 확인
  const dbPath = path.join(__dirname, 'prisma', 'dev.db');
  if (!fs.existsSync(dbPath)) {
    console.log('\n3. SQLite 데이터베이스 생성...');
    execSync('npx prisma db push --skip-seed', { stdio: 'inherit' });
  } else {
    console.log('\n3. SQLite 데이터베이스가 이미 존재합니다.');
  }
  
  console.log('\n✅ Prisma 재생성 완료!');
  console.log('\n이제 서버를 다시 시작하세요:');
  console.log('   node run-everything.js');
  
} catch (error) {
  console.error('❌ Prisma 재생성 실패:', error.message);
  console.log('\n문제 해결 방법:');
  console.log('1. prisma/schema.prisma 파일에서 provider가 "sqlite"로 설정되어 있는지 확인');
  console.log('2. .env.local 파일에서 DATABASE_URL이 "file:./dev.db"로 설정되어 있는지 확인');
}