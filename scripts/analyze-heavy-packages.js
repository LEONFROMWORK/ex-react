#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 무거운 패키지 분석 스크립트
console.log('📊 무거운 패키지 분석 시작...\n');

function getDirectorySize(dirPath) {
  let totalSize = 0;
  
  try {
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        totalSize += getDirectorySize(filePath);
      } else {
        totalSize += stats.size;
      }
    }
  } catch (error) {
    // 접근 불가능한 디렉토리 무시
  }
  
  return totalSize;
}

function formatSize(bytes) {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

function analyzeNodeModules() {
  const nodeModulesPath = path.join(process.cwd(), 'node_modules');
  
  if (!fs.existsSync(nodeModulesPath)) {
    console.error('❌ node_modules 디렉토리를 찾을 수 없습니다.');
    return;
  }
  
  const packages = [];
  const directories = fs.readdirSync(nodeModulesPath);
  
  console.log('패키지 크기 분석 중...');
  
  for (const dir of directories) {
    if (dir.startsWith('.')) continue;
    
    const packagePath = path.join(nodeModulesPath, dir);
    const stats = fs.statSync(packagePath);
    
    if (stats.isDirectory()) {
      const size = getDirectorySize(packagePath);
      packages.push({ name: dir, size });
    }
  }
  
  // 크기순으로 정렬
  packages.sort((a, b) => b.size - a.size);
  
  // 상위 20개 출력
  console.log('\n🏆 가장 무거운 패키지 TOP 20:\n');
  console.log('순위\t크기\t\t패키지명');
  console.log('----\t----\t\t--------');
  
  let totalSize = 0;
  packages.slice(0, 20).forEach((pkg, index) => {
    console.log(`${index + 1}.\t${formatSize(pkg.size)}\t\t${pkg.name}`);
    totalSize += pkg.size;
  });
  
  const allTotalSize = packages.reduce((sum, pkg) => sum + pkg.size, 0);
  
  console.log('\n📈 통계:');
  console.log(`- 전체 node_modules 크기: ${formatSize(allTotalSize)}`);
  console.log(`- 상위 20개 패키지 크기: ${formatSize(totalSize)}`);
  console.log(`- 상위 20개가 차지하는 비율: ${Math.round(totalSize / allTotalSize * 100)}%`);
  
  // 최적화 제안
  console.log('\n💡 최적화 제안:');
  
  // AWS SDK 체크
  const awsPackages = packages.filter(p => p.name.includes('aws-sdk') || p.name === '@aws-sdk');
  if (awsPackages.length > 0) {
    const awsSize = awsPackages.reduce((sum, pkg) => sum + pkg.size, 0);
    console.log(`- AWS SDK가 ${formatSize(awsSize)}를 차지합니다. 필요한 클라이언트만 설치하세요.`);
  }
  
  // 중복 가능성 있는 패키지
  const excelPackages = packages.filter(p => 
    p.name.includes('excel') || 
    p.name.includes('xlsx') || 
    p.name.includes('sheet')
  );
  if (excelPackages.length > 1) {
    console.log(`- Excel 관련 패키지가 ${excelPackages.length}개 있습니다. 통합을 고려하세요.`);
  }
  
  // 개발 의존성 체크
  const devPackages = ['@types', 'eslint', 'jest', 'webpack', 'babel'];
  const foundDevPackages = packages.filter(p => 
    devPackages.some(dev => p.name.includes(dev))
  );
  if (foundDevPackages.length > 0) {
    const devSize = foundDevPackages.reduce((sum, pkg) => sum + pkg.size, 0);
    console.log(`- 개발 도구가 ${formatSize(devSize)}를 차지합니다. 프로덕션에서는 제거하세요.`);
  }
  
  // 대안 제시
  console.log('\n🔄 패키지 대안:');
  const alternatives = {
    'moment': 'date-fns 또는 dayjs (더 가벼움)',
    'lodash': '필요한 함수만 개별 import',
    'axios': 'native fetch API 사용 고려',
    'uuid': 'crypto.randomUUID() 사용 (Node 14.17+)'
  };
  
  for (const [pkg, alt] of Object.entries(alternatives)) {
    const found = packages.find(p => p.name === pkg);
    if (found) {
      console.log(`- ${pkg} (${formatSize(found.size)}) → ${alt}`);
    }
  }
}

// 실행
analyzeNodeModules();