const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 테스트 데이터베이스 설정');
console.log('==========================');

// SQLite 테스트 데이터베이스를 위한 임시 스키마 생성
const testSchemaPath = path.join(__dirname, '../../prisma/schema.test.prisma');
const originalSchemaPath = path.join(__dirname, '../../prisma/schema.prisma');

// 원본 스키마 읽기
const originalSchema = fs.readFileSync(originalSchemaPath, 'utf8');

// SQLite용으로 변환
const sqliteSchema = originalSchema
  .replace('provider = "postgresql"', 'provider = "sqlite"')
  .replace(/@db\.Text/g, '')
  .replace(/@db\.Timestamp/g, '')
  .replace(/Json\?/g, 'String?')
  .replace(/Json\[\]/g, 'String')
  .replace(/String\[\]/g, 'String')
  .replace(/DateTime @default\(now\(\)\)/g, 'DateTime @default(now())')
  .replace(/@@index/g, '// @@index') // SQLite는 복합 인덱스 제한적
  .replace(/enum /g, '// enum '); // Enum 주석 처리

// 테스트 스키마 저장
fs.writeFileSync(testSchemaPath, sqliteSchema);

console.log('✅ SQLite 테스트 스키마 생성됨');

// 환경 변수 임시 설정
process.env.DATABASE_URL = 'file:./test.db';

try {
  // Prisma 클라이언트 재생성
  console.log('🔄 Prisma 클라이언트 생성 중...');
  execSync('npx prisma generate --schema=./prisma/schema.test.prisma', { stdio: 'inherit' });
  
  // 마이그레이션 적용
  console.log('🔄 데이터베이스 마이그레이션 중...');
  execSync('npx prisma db push --schema=./prisma/schema.test.prisma', { stdio: 'inherit' });
  
  console.log('✅ 테스트 데이터베이스 준비 완료!');
  console.log('');
  console.log('다음 명령으로 서버를 실행하세요:');
  console.log('npm run dev:test');
  
} catch (error) {
  console.error('❌ 오류 발생:', error.message);
  process.exit(1);
}