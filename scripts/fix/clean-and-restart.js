#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧹 Next.js 캐시 정리 및 재시작...\n');

// 1. .next 폴더 삭제
const nextDir = path.join(__dirname, '.next');
if (fs.existsSync(nextDir)) {
  console.log('1. .next 폴더 삭제 중...');
  try {
    fs.rmSync(nextDir, { recursive: true, force: true });
    console.log('   ✅ .next 폴더 삭제 완료');
  } catch (error) {
    console.log('   ⚠️  .next 폴더 삭제 실패:', error.message);
  }
} else {
  console.log('1. .next 폴더가 없습니다');
}

// 2. node_modules/.cache 삭제
const cacheDir = path.join(__dirname, 'node_modules', '.cache');
if (fs.existsSync(cacheDir)) {
  console.log('\n2. node_modules/.cache 삭제 중...');
  try {
    fs.rmSync(cacheDir, { recursive: true, force: true });
    console.log('   ✅ 캐시 삭제 완료');
  } catch (error) {
    console.log('   ⚠️  캐시 삭제 실패:', error.message);
  }
}

// 3. TypeScript 캐시 파일 삭제
console.log('\n3. TypeScript 캐시 정리...');
try {
  execSync('find . -name "*.tsbuildinfo" -type f -delete', { stdio: 'inherit' });
  console.log('   ✅ TypeScript 캐시 정리 완료');
} catch (error) {
  console.log('   ⚠️  TypeScript 캐시 정리 실패');
}

console.log('\n✨ 캐시 정리 완료!');
console.log('\n이제 다음 명령을 실행하세요:');
console.log('   node run-everything.js');
console.log('\n또는 개별적으로:');
console.log('   npm run dev');