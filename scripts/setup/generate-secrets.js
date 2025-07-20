#!/usr/bin/env node

/**
 * 프로덕션 환경용 보안 키 생성 스크립트
 * 사용법: node scripts/setup/generate-secrets.js
 */

const crypto = require('crypto');

// 보안 키 생성 함수
function generateSecret(length = 32) {
  return crypto.randomBytes(length).toString('base64url');
}

function generateApiKey() {
  return 'sk-' + crypto.randomBytes(24).toString('hex');
}

// 필요한 보안 키들 생성
const secrets = {
  NEXTAUTH_SECRET: generateSecret(32),
  JWT_SECRET: generateSecret(32),
  ENCRYPTION_KEY: generateSecret(32),
  WEBHOOK_SECRET: generateSecret(24),
  SESSION_SECRET: generateSecret(32),
  API_KEY_SALT: generateSecret(16)
};

console.log('='.repeat(60));
console.log('🔐 ExcelApp 보안 키 생성기');
console.log('='.repeat(60));
console.log();

console.log('Railway Secrets에 다음 값들을 설정하세요:');
console.log();

Object.entries(secrets).forEach(([key, value]) => {
  console.log(`${key}=${value}`);
});

console.log();
console.log('='.repeat(60));
console.log('📋 Railway CLI 명령어:');
console.log('='.repeat(60));
console.log();

Object.entries(secrets).forEach(([key, value]) => {
  console.log(`railway variables set ${key}="${value}"`);
});

console.log();
console.log('='.repeat(60));
console.log('⚠️  주의사항:');
console.log('='.repeat(60));
console.log('- 이 키들은 안전한 곳에 보관하세요');
console.log('- 프로덕션과 스테이징 환경에서 다른 키를 사용하세요');
console.log('- 키가 노출되면 즉시 교체하세요');
console.log('- 개발 환경에서는 이 키들을 사용하지 마세요');
console.log();

// .env.example 업데이트용 출력
console.log('='.repeat(60));
console.log('📝 .env.example 참고용:');
console.log('='.repeat(60));
console.log();

Object.entries(secrets).forEach(([key, value]) => {
  console.log(`${key}="your-${key.toLowerCase().replace(/_/g, '-')}"`);
});

console.log();