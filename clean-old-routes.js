#!/usr/bin/env node

/**
 * 이전 [userId] 폴더 정리 스크립트
 */

const fs = require('fs');
const path = require('path');

console.log('🧹 이전 동적 라우트 폴더 정리 중...\n');

const oldUserIdPath = path.join(__dirname, 'src/app/api/admin/users/[userId]');

if (fs.existsSync(oldUserIdPath)) {
  try {
    // 재귀적으로 폴더 삭제
    fs.rmSync(oldUserIdPath, { recursive: true, force: true });
    console.log('✓ [userId] 폴더를 삭제했습니다');
  } catch (error) {
    console.error('❌ 폴더 삭제 중 오류:', error.message);
  }
} else {
  console.log('✅ [userId] 폴더가 이미 없습니다');
}

// 현재 구조 확인
console.log('\n📁 현재 admin/users 구조:');
const usersPath = path.join(__dirname, 'src/app/api/admin/users');
const items = fs.readdirSync(usersPath);
items.forEach(item => {
  console.log(`   - ${item}`);
});

console.log('\n✨ 정리 완료!');