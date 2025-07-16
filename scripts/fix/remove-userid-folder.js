#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 [userId] 폴더 제거 중...\n');

const userIdPath = path.join(__dirname, 'src/app/api/admin/users/[userId]');

// 폴더가 존재하는지 확인
if (fs.existsSync(userIdPath)) {
  try {
    // 폴더 내용 확인
    console.log('[userId] 폴더 내용:');
    const files = fs.readdirSync(userIdPath, { withFileTypes: true });
    files.forEach(file => {
      console.log(`  - ${file.name}${file.isDirectory() ? '/' : ''}`);
    });
    
    // 재귀적으로 폴더 삭제
    fs.rmSync(userIdPath, { recursive: true, force: true });
    console.log('\n✅ [userId] 폴더를 성공적으로 삭제했습니다');
  } catch (error) {
    console.error('❌ 폴더 삭제 실패:', error.message);
    
    // 대안: 각 파일을 개별적으로 삭제
    console.log('\n대안 방법으로 시도 중...');
    try {
      const statusFile = path.join(userIdPath, 'status', 'route.ts');
      if (fs.existsSync(statusFile)) {
        fs.unlinkSync(statusFile);
        console.log('  - status/route.ts 삭제됨');
      }
      
      const statusDir = path.join(userIdPath, 'status');
      if (fs.existsSync(statusDir)) {
        fs.rmdirSync(statusDir);
        console.log('  - status/ 디렉토리 삭제됨');
      }
      
      fs.rmdirSync(userIdPath);
      console.log('  - [userId] 디렉토리 삭제됨');
      console.log('\n✅ 대안 방법으로 삭제 완료');
    } catch (altError) {
      console.error('❌ 대안 방법도 실패:', altError.message);
    }
  }
} else {
  console.log('✅ [userId] 폴더가 이미 없습니다');
}

// 현재 구조 확인
console.log('\n📁 현재 admin/users 구조:');
const usersPath = path.join(__dirname, 'src/app/api/admin/users');
if (fs.existsSync(usersPath)) {
  const items = fs.readdirSync(usersPath);
  items.forEach(item => {
    console.log(`   ${item}`);
    if (item.startsWith('[')) {
      const subPath = path.join(usersPath, item);
      const subItems = fs.readdirSync(subPath);
      subItems.forEach(subItem => {
        console.log(`     └─ ${subItem}`);
      });
    }
  });
}

console.log('\n✨ 완료! 서버를 다시 시작하세요.');