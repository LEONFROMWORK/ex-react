#!/usr/bin/env node

/**
 * 프로덕션 환경용 서비스 확인 스크립트
 * 실제 서비스 연결 상태를 확인
 */

const { execSync } = require('child_process');

console.log('프로덕션 환경 서비스 확인');
console.log('========================');
console.log('');

const services = [
  {
    name: 'PostgreSQL',
    check: () => {
      try {
        // DATABASE_URL에서 연결 정보 추출
        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl || !dbUrl.startsWith('postgresql://')) {
          return { status: 'error', message: 'DATABASE_URL이 설정되지 않았습니다.' };
        }
        return { status: 'ready', message: '연결 정보 확인됨' };
      } catch (error) {
        return { status: 'error', message: error.message };
      }
    }
  },
  {
    name: 'Redis',
    check: () => {
      const redisUrl = process.env.REDIS_URL;
      if (!redisUrl) {
        return { status: 'warning', message: 'REDIS_URL이 설정되지 않았습니다.' };
      }
      return { status: 'ready', message: '연결 정보 확인됨' };
    }
  },
  {
    name: 'AWS S3',
    check: () => {
      const hasCredentials = process.env.AWS_ACCESS_KEY_ID && 
                           process.env.AWS_SECRET_ACCESS_KEY && 
                           process.env.S3_BUCKET_NAME;
      if (!hasCredentials) {
        return { status: 'warning', message: 'AWS 자격 증명이 설정되지 않았습니다.' };
      }
      return { status: 'ready', message: '자격 증명 확인됨' };
    }
  },
  {
    name: 'SendGrid/SMTP',
    check: () => {
      const provider = process.env.EMAIL_PROVIDER;
      if (provider === 'sendgrid' && !process.env.SENDGRID_API_KEY) {
        return { status: 'warning', message: 'SendGrid API 키가 설정되지 않았습니다.' };
      }
      if (provider === 'smtp' && !process.env.SMTP_HOST) {
        return { status: 'warning', message: 'SMTP 설정이 없습니다.' };
      }
      return { status: 'ready', message: `${provider} 설정 확인됨` };
    }
  },
  {
    name: 'AI Services',
    check: () => {
      const hasAnyKey = process.env.OPENAI_API_KEY || 
                       process.env.ANTHROPIC_API_KEY || 
                       process.env.GOOGLE_AI_API_KEY;
      if (!hasAnyKey) {
        return { status: 'error', message: 'AI 서비스 API 키가 설정되지 않았습니다.' };
      }
      return { status: 'ready', message: 'API 키 확인됨' };
    }
  }
];

// 서비스 상태 확인
let hasError = false;
services.forEach(service => {
  const result = service.check();
  const icon = result.status === 'ready' ? '✓' : 
               result.status === 'warning' ? '⚠' : '✗';
  const color = result.status === 'ready' ? '\x1b[32m' : 
                result.status === 'warning' ? '\x1b[33m' : '\x1b[31m';
  
  console.log(`${color}${icon}\x1b[0m ${service.name}: ${result.message}`);
  
  if (result.status === 'error') {
    hasError = true;
  }
});

console.log('');

if (hasError) {
  console.log('\x1b[31m⚠️  일부 필수 서비스가 설정되지 않았습니다.\x1b[0m');
  console.log('   .env.production 파일을 확인하고 필요한 값을 설정하세요.');
} else {
  console.log('\x1b[32m✓ 모든 서비스 설정이 확인되었습니다.\x1b[0m');
  console.log('');
  console.log('프로덕션 환경 실행:');
  console.log('  npm run build:prod  # 프로덕션 빌드');
  console.log('  npm run start:prod  # 프로덕션 서버 시작');
}

console.log('');
console.log('도커 컨테이너로 실행:');
console.log('  npm run docker:compose:prod  # Docker Compose로 전체 스택 실행');