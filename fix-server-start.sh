#!/bin/bash

echo "🔧 서버 시작 문제 해결 중..."
echo "=========================="

# 1. NODE_ENV 환경 변수 제거
echo "1. NODE_ENV 설정 제거 완료 ✓"

# 2. 필요한 개발 의존성 설치
echo ""
echo "2. 개발 의존성 설치 중..."
npm install --save-dev @next/bundle-analyzer

# 3. node_modules 정리
echo ""
echo "3. node_modules 정리 중..."
npm dedupe

# 4. 캐시 정리
echo ""
echo "4. Next.js 캐시 정리 중..."
rm -rf .next

# 5. 서버 시작
echo ""
echo "5. 서버 시작..."
echo "=================================="
echo "🚀 http://localhost:3000 에서 실행됩니다"
echo ""

npm run dev