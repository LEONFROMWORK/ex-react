#!/usr/bin/env node

/**
 * 동적 라우트 파라미터 이름 충돌 수정 스크립트
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 동적 라우트 충돌 수정 중...\n');

// 1. status 폴더를 [userId]에서 [id]로 이동
const oldStatusPath = path.join(__dirname, 'src/app/api/admin/users/[userId]/status');
const newStatusPath = path.join(__dirname, 'src/app/api/admin/users/[id]/status');

if (fs.existsSync(oldStatusPath)) {
  // [id]/status가 이미 있는지 확인
  if (!fs.existsSync(newStatusPath)) {
    // 부모 디렉토리 확인
    const parentDir = path.dirname(newStatusPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    
    // 폴더 이동
    fs.renameSync(oldStatusPath, newStatusPath);
    console.log('✓ status 폴더를 [userId]에서 [id]로 이동했습니다');
  } else {
    console.log('⚠️  [id]/status 폴더가 이미 존재합니다');
  }
  
  // 빈 [userId] 폴더 삭제
  const userIdDir = path.join(__dirname, 'src/app/api/admin/users/[userId]');
  if (fs.existsSync(userIdDir)) {
    try {
      fs.rmdirSync(userIdDir);
      console.log('✓ 빈 [userId] 폴더를 삭제했습니다');
    } catch (error) {
      console.log('! [userId] 폴더에 다른 파일이 있어 삭제하지 않았습니다');
    }
  }
} else {
  console.log('✅ 이미 수정되었거나 해당 경로가 없습니다');
}

console.log('\n✨ 완료! 이제 서버를 다시 시작하세요.');