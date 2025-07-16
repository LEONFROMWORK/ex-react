const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔄 데이터베이스 초기화 중...\n');

try {
  // 1. 기존 데이터베이스 파일 삭제
  const dbPath = path.join(__dirname, 'prisma', 'dev.db');
  const dbJournalPath = path.join(__dirname, 'prisma', 'dev.db-journal');
  
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('✅ 기존 데이터베이스 삭제');
  }
  
  if (fs.existsSync(dbJournalPath)) {
    fs.unlinkSync(dbJournalPath);
  }
  
  // 2. Prisma 클라이언트 재생성
  console.log('\n2. Prisma 클라이언트 생성...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  // 3. 데이터베이스 생성 및 스키마 적용
  console.log('\n3. 데이터베이스 생성 및 스키마 적용...');
  execSync('npx prisma db push', { stdio: 'inherit' });
  
  console.log('\n✅ 데이터베이스 초기화 완료!');
  console.log('\n다음 명령어로 서버를 시작하세요:');
  console.log('   npm run dev');
  
} catch (error) {
  console.error('❌ 데이터베이스 초기화 실패:', error.message);
  process.exit(1);
}