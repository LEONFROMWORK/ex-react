#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🗄️  SQLite 데이터베이스 설정 중...\n');

try {
  // 1. Prisma 클라이언트 생성
  console.log('1. Prisma 클라이언트 생성...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  // 2. 데이터베이스 마이그레이션
  console.log('\n2. 데이터베이스 마이그레이션...');
  try {
    execSync('npx prisma db push --skip-seed', { stdio: 'inherit' });
    console.log('✅ 데이터베이스가 생성되었습니다');
  } catch (error) {
    console.log('⚠️  마이그레이션 실패 - 기본 데이터베이스를 사용합니다');
  }
  
  // 3. 테스트 사용자 생성 (선택사항)
  console.log('\n3. 테스트 데이터 생성...');
  const testDataScript = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // 테스트 사용자 생성
    const testUser = await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: {},
      create: {
        email: 'test@example.com',
        password: 'hashed_password',
        name: 'Test User',
        role: 'USER',
        tokens: 100
      }
    });
    console.log('✅ 테스트 사용자가 생성되었습니다:', testUser.email);
    
    // 관리자 사용자 생성
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: {
        email: 'admin@example.com',
        password: 'hashed_password',
        name: 'Admin User',
        role: 'ADMIN',
        tokens: 1000
      }
    });
    console.log('✅ 관리자 사용자가 생성되었습니다:', adminUser.email);
  } catch (error) {
    console.error('테스트 데이터 생성 실패:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
`;

  fs.writeFileSync('temp-seed.js', testDataScript);
  
  try {
    execSync('node temp-seed.js', { stdio: 'inherit' });
  } catch (error) {
    console.log('⚠️  테스트 데이터 생성 실패');
  }
  
  // 임시 파일 삭제
  if (fs.existsSync('temp-seed.js')) {
    fs.unlinkSync('temp-seed.js');
  }
  
  console.log('\n✨ SQLite 설정 완료!');
  console.log('\n데이터베이스 파일 위치: ./prisma/dev.db');
  
} catch (error) {
  console.error('❌ 오류 발생:', error.message);
  process.exit(1);
}