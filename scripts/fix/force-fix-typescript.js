const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 TypeScript 강제 수정 스크립트');
console.log('==================================');

// 1. TypeScript 직접 설치
console.log('\n1. TypeScript 강제 설치...');
try {
  // package.json에서 TypeScript 버전 확인 및 수정
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // TypeScript 버전 고정
  packageJson.devDependencies = packageJson.devDependencies || {};
  packageJson.devDependencies.typescript = "5.4.3";
  packageJson.devDependencies["@types/react"] = "18.2.71";
  packageJson.devDependencies["@types/node"] = "20.11.30";
  
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('   ✅ package.json 업데이트 완료');
  
  // TypeScript 재설치
  execSync('npm install typescript@5.4.3 @types/react@18.2.71 @types/node@20.11.30 --save-dev --force', { stdio: 'inherit' });
  console.log('   ✅ TypeScript 설치 완료');
} catch (error) {
  console.error('   ❌ TypeScript 설치 실패:', error.message);
}

// 2. Next.js 환경 초기화
console.log('\n2. Next.js 환경 초기화...');
try {
  // .next 폴더 삭제
  if (fs.existsSync('.next')) {
    execSync('rm -rf .next', { stdio: 'inherit' });
  }
  
  // next-env.d.ts 재생성
  const nextEnvContent = `/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/basic-features/typescript for more information.
`;
  fs.writeFileSync('next-env.d.ts', nextEnvContent);
  console.log('   ✅ Next.js 환경 초기화 완료');
} catch (error) {
  console.error('   ❌ Next.js 초기화 실패:', error.message);
}

// 3. 간단한 tsconfig.json 생성
console.log('\n3. tsconfig.json 재생성...');
const tsconfigContent = {
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": false,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
};

fs.writeFileSync('tsconfig.json', JSON.stringify(tsconfigContent, null, 2));
console.log('   ✅ tsconfig.json 생성 완료');

// 4. NODE_ENV 설정 확인
console.log('\n4. 환경 변수 설정...');
const envLocalPath = '.env.local';
if (fs.existsSync(envLocalPath)) {
  let envContent = fs.readFileSync(envLocalPath, 'utf8');
  
  // NODE_ENV를 development로 고정
  if (!envContent.includes('NODE_ENV=')) {
    envContent += '\nNODE_ENV=development\n';
  } else {
    envContent = envContent.replace(/NODE_ENV=.*/g, 'NODE_ENV=development');
  }
  
  fs.writeFileSync(envLocalPath, envContent);
  console.log('   ✅ 환경 변수 설정 완료');
}

console.log('\n✨ 수정 완료!');
console.log('\n서버 실행 방법:');
console.log('1. 기본 모드: npm run dev');
console.log('2. 테스트 모드: APP_ENV=test npm run dev');
console.log('\n주의: NODE_ENV는 항상 development로 설정됩니다.');