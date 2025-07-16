#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('🔧 NextAuth import 오류 수정 중...\n');

// 수정할 패턴들
const patterns = [
  {
    from: "import { getServerSession } from 'next-auth'",
    to: "import { getServerSession } from '@/lib/auth/session'"
  },
  {
    from: 'import { getServerSession } from "next-auth"',
    to: "import { getServerSession } from '@/lib/auth/session'"
  },
  {
    from: "getServerSession(authOptions)",
    to: "getServerSession()"
  }
];

// src 디렉토리의 모든 .ts, .tsx 파일 찾기
const files = glob.sync('src/**/*.{ts,tsx}', { 
  cwd: __dirname,
  absolute: true 
});

let modifiedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;
  
  patterns.forEach(pattern => {
    if (content.includes(pattern.from)) {
      content = content.replace(new RegExp(pattern.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), pattern.to);
      modified = true;
    }
  });
  
  // authOptions import 제거
  if (content.includes("import { authOptions }")) {
    content = content.replace(/import { authOptions } from ['"]@\/lib\/auth['"];?\n?/g, '');
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(file, content);
    console.log(`✓ ${path.relative(__dirname, file)}`);
    modifiedCount++;
  }
});

console.log(`\n✨ ${modifiedCount}개 파일이 수정되었습니다!`);

// glob 패키지가 없으면 기본 방법 사용
if (!glob.sync) {
  console.log('\n⚠️  glob 패키지가 없어 기본 방법을 사용합니다...');
  
  function findFiles(dir, pattern) {
    const results = [];
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        results.push(...findFiles(filePath, pattern));
      } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx'))) {
        results.push(filePath);
      }
    }
    
    return results;
  }
  
  const srcPath = path.join(__dirname, 'src');
  if (fs.existsSync(srcPath)) {
    const tsFiles = findFiles(srcPath, /\.(ts|tsx)$/);
    console.log(`찾은 파일: ${tsFiles.length}개`);
  }
}