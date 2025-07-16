#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const envFiles = {
  development: '.env.local',
  test: '.env.test',
  production: '.env.production'
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function copyEnvFile(source, target) {
  try {
    const sourcePath = path.join(process.cwd(), source);
    const targetPath = path.join(process.cwd(), target);
    
    if (!fs.existsSync(sourcePath)) {
      console.error(`Error: ${source} 파일을 찾을 수 없습니다.`);
      return false;
    }
    
    // .env.local 백업
    if (fs.existsSync(targetPath)) {
      const backupPath = `${targetPath}.backup`;
      fs.copyFileSync(targetPath, backupPath);
      console.log(`✓ 기존 ${target} 파일을 ${target}.backup으로 백업했습니다.`);
    }
    
    // 환경 파일 복사
    fs.copyFileSync(sourcePath, targetPath);
    console.log(`✓ ${source}를 ${target}로 복사했습니다.`);
    
    return true;
  } catch (error) {
    console.error(`Error: 파일 복사 중 오류 발생: ${error.message}`);
    return false;
  }
}

function showCurrentEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  
  if (!fs.existsSync(envPath)) {
    console.log('현재 .env.local 파일이 없습니다.');
    return;
  }
  
  const content = fs.readFileSync(envPath, 'utf8');
  const envMatch = content.match(/APP_ENV=(\w+)/);
  
  if (envMatch) {
    console.log(`현재 환경: ${envMatch[1]}`);
  } else {
    console.log('현재 환경을 확인할 수 없습니다.');
  }
}

function main() {
  console.log('환경 전환 도구');
  console.log('==============');
  showCurrentEnv();
  console.log('');
  console.log('전환할 환경을 선택하세요:');
  console.log('1. development (기본 개발 환경)');
  console.log('2. test (테스트 환경 - 모든 서비스 Mock)');
  console.log('3. production (프로덕션 환경 - 실제 서비스)');
  console.log('4. 취소');
  console.log('');
  
  rl.question('선택 (1-4): ', (answer) => {
    let sourceFile;
    
    switch(answer) {
      case '1':
        sourceFile = '.env.example';
        break;
      case '2':
        sourceFile = '.env.test';
        break;
      case '3':
        sourceFile = '.env.production';
        break;
      case '4':
        console.log('취소되었습니다.');
        rl.close();
        return;
      default:
        console.log('잘못된 선택입니다.');
        rl.close();
        return;
    }
    
    if (copyEnvFile(sourceFile, '.env.local')) {
      console.log('');
      console.log('환경 전환이 완료되었습니다!');
      console.log('');
      console.log('다음 명령어로 실행하세요:');
      
      switch(answer) {
        case '1':
          console.log('  npm run dev           # 개발 서버 실행');
          break;
        case '2':
          console.log('  npm run dev:test      # 테스트 환경 개발 서버');
          console.log('  npm run test:app      # 테스트 애플리케이션 실행');
          break;
        case '3':
          console.log('  npm run dev:prod      # 프로덕션 환경 개발 서버');
          console.log('  npm run build:prod    # 프로덕션 빌드');
          console.log('  npm run start:prod    # 프로덕션 서버 실행');
          break;
      }
    }
    
    rl.close();
  });
}

main();