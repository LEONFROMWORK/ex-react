const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Next.js 오류 수정 스크립트');
console.log('==============================');

// 1. 캐시 및 임시 파일 제거
console.log('\n1. 캐시 및 임시 파일 제거 중...');
const dirsToRemove = ['.next', 'node_modules/.cache'];
dirsToRemove.forEach(dir => {
  if (fs.existsSync(dir)) {
    execSync(`rm -rf ${dir}`, { stdio: 'inherit' });
    console.log(`   ✅ ${dir} 삭제됨`);
  }
});

// 2. tsconfig.json 백업 및 수정
console.log('\n2. TypeScript 설정 수정 중...');
const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
const tsconfigBackupPath = path.join(process.cwd(), 'tsconfig.json.backup');

// 백업
fs.copyFileSync(tsconfigPath, tsconfigBackupPath);
console.log('   ✅ tsconfig.json 백업 완료');

// 수정된 tsconfig.json 작성
const newTsconfig = {
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
};

fs.writeFileSync(tsconfigPath, JSON.stringify(newTsconfig, null, 2));
console.log('   ✅ tsconfig.json 업데이트 완료');

// 3. Next.js 재설치
console.log('\n3. Next.js 재설치 중...');
try {
  execSync('npm uninstall next && npm install next@14.1.4', { stdio: 'inherit' });
  console.log('   ✅ Next.js 재설치 완료');
} catch (error) {
  console.error('   ❌ Next.js 재설치 실패:', error.message);
}

// 4. TypeScript 의존성 확인
console.log('\n4. TypeScript 의존성 확인 중...');
try {
  execSync('npm install --save-dev typescript@^5.4.3 @types/react@^18.2.71 @types/node@^20.11.30', { stdio: 'inherit' });
  console.log('   ✅ TypeScript 의존성 설치 완료');
} catch (error) {
  console.error('   ❌ TypeScript 의존성 설치 실패:', error.message);
}

console.log('\n✨ 수정 완료! 다음 명령으로 서버를 실행하세요:');
console.log('   npm run dev:test');