#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function checkEnvFile(filename) {
  const filepath = path.join(process.cwd(), filename);
  
  if (!fs.existsSync(filepath)) {
    return { exists: false };
  }
  
  const content = fs.readFileSync(filepath, 'utf8');
  const lines = content.split('\n');
  const config = {};
  
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, value] = trimmed.split('=');
      if (key) {
        config[key.trim()] = value ? value.trim().replace(/^["']|["']$/g, '') : '';
      }
    }
  });
  
  return {
    exists: true,
    config
  };
}

function compareEnvs() {
  const envFiles = [
    { name: '.env.local', label: '현재 설정' },
    { name: '.env.example', label: '기본 설정' },
    { name: '.env.test', label: '테스트 환경' },
    { name: '.env.production', label: '프로덕션 환경' }
  ];
  
  const envData = {};
  const allKeys = new Set();
  
  // 모든 환경 파일 읽기
  envFiles.forEach(({ name, label }) => {
    const result = checkEnvFile(name);
    envData[name] = result;
    
    if (result.exists && result.config) {
      Object.keys(result.config).forEach(key => allKeys.add(key));
    }
  });
  
  // 현재 환경 표시
  console.log('환경 설정 확인');
  console.log('==============\n');
  
  const currentEnv = envData['.env.local'];
  if (currentEnv.exists) {
    const appEnv = currentEnv.config.APP_ENV || currentEnv.config.NODE_ENV || 'unknown';
    console.log(`현재 환경: ${appEnv}`);
    console.log(`설정 파일: .env.local\n`);
  } else {
    console.log('⚠️  .env.local 파일이 없습니다.');
    console.log('   npm run env:switch 명령어로 환경을 설정하세요.\n');
  }
  
  // 주요 설정 비교
  console.log('주요 설정 비교:');
  console.log('─'.repeat(80));
  
  const importantKeys = [
    'APP_ENV',
    'DATABASE_URL',
    'CACHE_PROVIDER',
    'STORAGE_PROVIDER',
    'EMAIL_PROVIDER',
    'USE_MOCK_AI',
    'MOCK_AUTH_ENABLED'
  ];
  
  // 헤더 출력
  console.log(padEnd('설정 키', 25), envFiles.map(f => padEnd(f.label, 18)).join(''));
  console.log('─'.repeat(80));
  
  // 각 키에 대한 값 출력
  importantKeys.forEach(key => {
    const values = envFiles.map(({ name }) => {
      if (!envData[name].exists) return padEnd('N/A', 18);
      const value = envData[name].config[key] || '';
      return padEnd(truncate(value, 16), 18);
    });
    
    console.log(padEnd(key, 25), values.join(''));
  });
  
  console.log('─'.repeat(80));
  
  // 환경별 특징 요약
  console.log('\n환경별 특징:');
  console.log('• development: 기본 개발 환경 (SQLite, 로컬 파일 저장)');
  console.log('• test: 모든 외부 서비스 Mock 사용 (테스트 자동화에 적합)');
  console.log('• production: 실제 서비스 사용 (PostgreSQL, Redis, S3 등)');
  
  // 누락된 설정 확인
  if (currentEnv.exists) {
    const exampleKeys = envData['.env.example'].exists ? 
      Object.keys(envData['.env.example'].config) : [];
    const missingKeys = exampleKeys.filter(key => 
      !currentEnv.config.hasOwnProperty(key) && 
      !key.startsWith('NEXT_PUBLIC_')
    );
    
    if (missingKeys.length > 0) {
      console.log('\n⚠️  누락된 설정:');
      missingKeys.forEach(key => {
        console.log(`   - ${key}`);
      });
    }
  }
}

function padEnd(str, length) {
  return str.padEnd(length);
}

function truncate(str, maxLength) {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

// 실행
compareEnvs();