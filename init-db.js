#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🗄️  데이터베이스 초기화 중...\n');

try {
  // 1. Prisma 클라이언트 생성
  console.log('1. Prisma 클라이언트 생성...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  // 2. 데이터베이스 생성 및 마이그레이션
  console.log('\n2. SQLite 데이터베이스 생성...');
  execSync('npx prisma db push --force-reset', { stdio: 'inherit' });
  
  console.log('\n✅ 데이터베이스 초기화 완료!');
  console.log('데이터베이스 파일: ./prisma/dev.db');
  
} catch (error) {
  console.error('❌ 데이터베이스 초기화 실패:', error.message);
  process.exit(1);
}