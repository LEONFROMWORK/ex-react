#!/bin/bash

echo "🔧 완전한 환경 재설정 스크립트"
echo "================================"

# 1. 모든 프로세스 종료
echo -e "\n1. 프로세스 종료..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

# 2. 캐시 및 node_modules 삭제
echo -e "\n2. 완전 초기화..."
rm -rf node_modules
rm -rf .next
rm -rf .turbo
rm -rf package-lock.json
rm -rf tsconfig.tsbuildinfo
rm -rf next-env.d.ts

# 3. npm 캐시 정리
echo -e "\n3. npm 캐시 정리..."
npm cache clean --force

# 4. 패키지 재설치
echo -e "\n4. 패키지 설치 (시간이 걸립니다)..."
npm install

# 5. 추가 패키지 설치
echo -e "\n5. 누락된 패키지 설치..."
npm install --save-dev autoprefixer

# 6. Prisma 재생성
echo -e "\n6. Prisma 생성..."
npx prisma generate

# 7. 중복 페이지 제거
echo -e "\n7. 중복 페이지 제거..."
if [ -f "src/app/pricing/page.tsx" ] && [ -f "src/app/(dashboard)/pricing/page.tsx" ]; then
    echo "   중복된 pricing 페이지 발견. (dashboard) 버전 제거..."
    rm -rf "src/app/(dashboard)/pricing"
fi

echo -e "\n✨ 재설정 완료!"
echo "서버 실행: npm run dev"