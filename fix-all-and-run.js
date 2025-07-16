#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 모든 문제를 해결하고 서버를 시작합니다...\n');

const steps = [
  {
    name: '[userId] 폴더 제거',
    command: 'node remove-userid-folder.js',
    optional: true
  },
  {
    name: 'Auth import 수정',
    command: 'node fix-auth-imports.js',
    optional: true
  },
  {
    name: 'SQLite 데이터베이스 설정',
    command: 'node setup-sqlite.js',
    optional: true
  },
  {
    name: '서버 시작',
    command: 'node run-everything.js',
    optional: false
  }
];

for (const step of steps) {
  console.log(`\n📌 ${step.name}...`);
  try {
    execSync(step.command, { stdio: 'inherit' });
  } catch (error) {
    if (!step.optional) {
      console.error(`❌ ${step.name} 실패`);
      process.exit(1);
    } else {
      console.log(`⚠️  ${step.name} 실패 (계속 진행)`);
    }
  }
}

console.log('\n✨ 완료!');