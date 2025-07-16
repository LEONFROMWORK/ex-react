#!/bin/bash

echo "🔧 테스트 환경 정상화 스크립트"
echo "================================"

# 1. 모든 프로세스 종료
echo -e "\n1. 실행 중인 프로세스 종료..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
echo "   ✅ 프로세스 종료 완료"

# 2. 캐시 및 임시 파일 삭제
echo -e "\n2. 캐시 및 임시 파일 삭제..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .turbo
rm -rf tsconfig.tsbuildinfo
echo "   ✅ 캐시 삭제 완료"

# 3. TypeScript 설정 복원
echo -e "\n3. TypeScript 설정 복원..."
if [ -f "tsconfig.json.backup" ]; then
    cp tsconfig.json.backup tsconfig.json
    echo "   ✅ tsconfig.json 복원 완료"
else
    echo "   ⚠️  백업 파일이 없어 현재 설정 유지"
fi

# 4. node_modules 재설치
echo -e "\n4. 의존성 재설치 (시간이 걸릴 수 있습니다)..."
rm -rf node_modules package-lock.json
npm install
echo "   ✅ 의존성 설치 완료"

# 5. TypeScript 명시적 설치
echo -e "\n5. TypeScript 설정..."
npm install --save-dev typescript@5.4.3 @types/react@18.2.71 @types/node@20.11.30
echo "   ✅ TypeScript 설치 완료"

# 6. Prisma 재생성
echo -e "\n6. Prisma 클라이언트 생성..."
npx prisma generate
echo "   ✅ Prisma 생성 완료"

# 7. 환경 변수 확인
echo -e "\n7. 환경 변수 확인..."
if [ -f ".env.local" ]; then
    echo "   ✅ .env.local 파일 존재"
    echo "   현재 설정:"
    grep -E "^(APP_ENV|NODE_ENV|DATABASE_URL)" .env.local | sed 's/^/      /'
else
    echo "   ❌ .env.local 파일이 없습니다!"
fi

echo -e "\n✨ 테스트 환경 정상화 완료!"
echo "다음 명령으로 서버를 실행하세요:"
echo "   npm run dev:test"
echo ""
echo "문제가 계속되면:"
echo "   npm run dev  (기본 모드로 실행)"