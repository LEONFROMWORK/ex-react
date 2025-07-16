#!/usr/bin/env node

/**
 * 데이터베이스 초기화 스크립트
 * 환경에 따라 적절한 데이터베이스를 초기화합니다
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 환경 변수 확인
const appEnv = process.env.APP_ENV || 'development';
const dbProvider = process.env.DATABASE_PROVIDER || 'sqlite';
const dbUrl = process.env.DATABASE_URL;

console.log('데이터베이스 초기화');
console.log('==================');
console.log(`환경: ${appEnv}`);
console.log(`데이터베이스: ${dbProvider}`);
console.log('');

async function initDatabase() {
  try {
    // SQLite인 경우 디렉토리 생성
    if (dbProvider === 'sqlite' && dbUrl) {
      const dbPath = dbUrl.replace('file:', '');
      const dbDir = path.dirname(dbPath);
      
      if (dbDir && dbDir !== '.') {
        fs.mkdirSync(dbDir, { recursive: true });
        console.log(`✓ 데이터베이스 디렉토리 생성: ${dbDir}`);
      }
    }
    
    // Prisma 클라이언트 생성
    console.log('Prisma 클라이언트 생성 중...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('✓ Prisma 클라이언트 생성 완료');
    console.log('');
    
    // 데이터베이스 마이그레이션
    console.log('데이터베이스 마이그레이션 실행 중...');
    
    if (appEnv === 'production') {
      // 프로덕션: deploy 명령 사용
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    } else {
      // 개발/테스트: dev 명령 사용
      execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
    }
    
    console.log('✓ 데이터베이스 마이그레이션 완료');
    console.log('');
    
    // 시드 데이터 (개발/테스트 환경만)
    if (appEnv !== 'production' && fs.existsSync('prisma/seed.ts')) {
      console.log('시드 데이터 생성 중...');
      try {
        execSync('npx tsx prisma/seed.ts', { stdio: 'inherit' });
        console.log('✓ 시드 데이터 생성 완료');
      } catch (seedError) {
        console.log('⚠ 시드 데이터 생성 실패 (선택적)');
      }
    }
    
    console.log('');
    console.log('✅ 데이터베이스 초기화 완료!');
    
    // 연결 정보 표시
    if (dbProvider === 'sqlite') {
      console.log(`   SQLite 파일: ${dbUrl}`);
    } else if (dbProvider === 'postgresql') {
      const dbHost = dbUrl.match(/\/\/[^:]+:.*@([^:\/]+)/)?.[1] || 'unknown';
      const dbName = dbUrl.match(/\/([^?]+)(\?|$)/)?.[1] || 'unknown';
      console.log(`   PostgreSQL 호스트: ${dbHost}`);
      console.log(`   데이터베이스 이름: ${dbName}`);
    }
    
  } catch (error) {
    console.error('');
    console.error('❌ 데이터베이스 초기화 실패');
    console.error(`오류: ${error.message}`);
    
    // 상세 도움말
    console.error('');
    console.error('해결 방법:');
    
    if (error.message.includes('P1001')) {
      console.error('- 데이터베이스 서버가 실행 중인지 확인하세요');
      console.error('- DATABASE_URL이 올바른지 확인하세요');
    } else if (error.message.includes('P1002')) {
      console.error('- 데이터베이스 서버 시간 초과');
      console.error('- 네트워크 연결을 확인하세요');
    } else if (error.message.includes('P1003')) {
      console.error('- 데이터베이스가 존재하지 않습니다');
      console.error('- 데이터베이스를 먼저 생성하세요');
    }
    
    process.exit(1);
  }
}

// 환경 변수 체크
if (!dbUrl) {
  console.error('❌ DATABASE_URL이 설정되지 않았습니다');
  console.error('   .env 파일을 확인하거나 환경 변수를 설정하세요');
  process.exit(1);
}

// 실행
initDatabase();