#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 스마트 트리 쉐이킹: 실제로 사용되는 모듈만 유지

console.log('🌳 스마트 트리 쉐이킹 분석 시작...\n');

// 프로젝트에서 실제 import되는 패키지 찾기
function findImportsInFile(filePath) {
  const imports = new Set();
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // ES6 imports
    const es6Imports = content.match(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/g) || [];
    es6Imports.forEach(imp => {
      const match = imp.match(/from\s+['"]([^'"]+)['"]/);
      if (match && match[1]) {
        const pkgName = match[1].split('/')[0];
        if (!pkgName.startsWith('.') && !pkgName.startsWith('@/')) {
          imports.add(pkgName);
        }
      }
    });
    
    // CommonJS requires
    const cjsRequires = content.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/g) || [];
    cjsRequires.forEach(req => {
      const match = req.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/);
      if (match && match[1]) {
        const pkgName = match[1].split('/')[0];
        if (!pkgName.startsWith('.') && !pkgName.startsWith('@/')) {
          imports.add(pkgName);
        }
      }
    });
    
    // Dynamic imports
    const dynamicImports = content.match(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/g) || [];
    dynamicImports.forEach(imp => {
      const match = imp.match(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/);
      if (match && match[1]) {
        const pkgName = match[1].split('/')[0];
        if (!pkgName.startsWith('.') && !pkgName.startsWith('@/')) {
          imports.add(pkgName);
        }
      }
    });
    
  } catch (error) {
    // 파일 읽기 실패 무시
  }
  
  return imports;
}

// 디렉토리 재귀 탐색
function findAllImports(dir, filePattern = /\.(js|jsx|ts|tsx)$/) {
  const allImports = new Set();
  
  function walk(currentDir) {
    try {
      const files = fs.readdirSync(currentDir);
      
      for (const file of files) {
        const filePath = path.join(currentDir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          // node_modules, .git, .next 등 제외
          if (!file.startsWith('.') && file !== 'node_modules' && file !== 'dist' && file !== 'build') {
            walk(filePath);
          }
        } else if (filePattern.test(file)) {
          const imports = findImportsInFile(filePath);
          imports.forEach(imp => allImports.add(imp));
        }
      }
    } catch (error) {
      // 디렉토리 접근 실패 무시
    }
  }
  
  walk(dir);
  return allImports;
}

// package.json 분석
function analyzePackageJson() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const dependencies = Object.keys(packageJson.dependencies || {});
    const devDependencies = Object.keys(packageJson.devDependencies || {});
    
    return { dependencies, devDependencies, packageJson };
  } catch (error) {
    console.error('❌ package.json을 읽을 수 없습니다.');
    return { dependencies: [], devDependencies: [], packageJson: {} };
  }
}

// 메인 분석 함수
function analyze() {
  console.log('1️⃣ 프로젝트 파일에서 import 분석 중...');
  const srcImports = findAllImports(path.join(process.cwd(), 'src'));
  const appImports = findAllImports(path.join(process.cwd(), 'app'));
  const allImports = new Set([...srcImports, ...appImports]);
  
  console.log(`   발견된 import: ${allImports.size}개\n`);
  
  console.log('2️⃣ package.json 분석 중...');
  const { dependencies, devDependencies, packageJson } = analyzePackageJson();
  console.log(`   dependencies: ${dependencies.length}개`);
  console.log(`   devDependencies: ${devDependencies.length}개\n`);
  
  // 사용되지 않는 패키지 찾기
  const unusedDeps = dependencies.filter(dep => !allImports.has(dep));
  const usedDevDeps = devDependencies.filter(dep => allImports.has(dep));
  
  console.log('3️⃣ 분석 결과:\n');
  
  if (unusedDeps.length > 0) {
    console.log('🗑️  사용되지 않는 dependencies:');
    unusedDeps.forEach(dep => {
      console.log(`   - ${dep}`);
    });
    console.log('');
  }
  
  if (usedDevDeps.length > 0) {
    console.log('⚠️  dependencies로 이동 필요한 devDependencies:');
    usedDevDeps.forEach(dep => {
      console.log(`   - ${dep}`);
    });
    console.log('');
  }
  
  // 특별 처리가 필요한 패키지
  console.log('4️⃣ 특별 최적화 제안:\n');
  
  // Next.js 관련
  if (dependencies.includes('next')) {
    console.log('📦 Next.js 최적화:');
    console.log('   - next.config.mjs에서 output: "standalone" 설정 확인');
    console.log('   - 불필요한 폴리필 제거 고려\n');
  }
  
  // Excel 라이브러리
  const excelLibs = dependencies.filter(d => d.includes('excel') || d === 'xlsx' || d === 'sheetjs');
  if (excelLibs.length > 1) {
    console.log('📊 Excel 라이브러리 중복:');
    console.log(`   현재 설치: ${excelLibs.join(', ')}`);
    console.log('   권장: 하나의 라이브러리만 사용\n');
  }
  
  // 무거운 라이브러리 대안
  const heavyLibs = {
    'moment': { alt: 'date-fns', size: '~2.5MB → ~200KB' },
    'lodash': { alt: 'lodash-es + tree shaking', size: '~550KB → ~50KB' },
    '@aws-sdk/client-s3': { alt: '필요한 명령만 import', size: '~25MB → ~5MB' }
  };
  
  const foundHeavy = dependencies.filter(d => Object.keys(heavyLibs).includes(d));
  if (foundHeavy.length > 0) {
    console.log('💡 경량 대안 제안:');
    foundHeavy.forEach(lib => {
      const info = heavyLibs[lib];
      console.log(`   ${lib} → ${info.alt} (${info.size})`);
    });
    console.log('');
  }
  
  // 최적화 스크립트 생성
  console.log('5️⃣ 최적화 명령어:\n');
  
  if (unusedDeps.length > 0) {
    console.log('# 사용하지 않는 패키지 제거:');
    console.log(`npm uninstall ${unusedDeps.join(' ')}\n`);
  }
  
  if (usedDevDeps.length > 0) {
    console.log('# devDependencies에서 dependencies로 이동:');
    console.log(`npm uninstall --save-dev ${usedDevDeps.join(' ')}`);
    console.log(`npm install ${usedDevDeps.join(' ')}\n`);
  }
  
  // 추가 최적화 팁
  console.log('6️⃣ 추가 최적화 팁:\n');
  console.log('- npm prune --production : 프로덕션 배포 시 devDependencies 제거');
  console.log('- npm dedupe : 중복 패키지 제거');
  console.log('- npm audit fix : 보안 취약점 수정');
  console.log('- .npmrc에 "omit=dev" 추가 : 프로덕션 설치 시 dev 패키지 제외');
}

// 실행
analyze();