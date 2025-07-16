#!/bin/bash

echo "🔧 Tailwind CSS 완전 재설치"
echo "=========================="

# 1. 서버 중지하라고 안내
echo "⚠️  먼저 개발 서버를 중지하세요 (Ctrl+C)"
echo "계속하려면 Enter를 누르세요..."
read

# 2. 캐시 및 임시 파일 삭제
echo "📦 캐시 정리 중..."
rm -rf .next
rm -rf node_modules/.cache
rm -f src/app/styles.css
rm -f src/app/global.css

# 3. Tailwind 관련 패키지 제거
echo "🗑️  기존 패키지 제거 중..."
npm uninstall tailwindcss postcss autoprefixer tailwindcss-animate

# 4. 패키지 재설치
echo "📥 패키지 재설치 중..."
npm install -D tailwindcss@latest postcss@latest autoprefixer@latest
npm install -D tailwindcss-animate

# 5. Tailwind 초기화
echo "🔄 Tailwind 재초기화..."
npx tailwindcss init -p

echo ""
echo "✅ 재설치 완료!"
echo ""
echo "다음 단계:"
echo "1. tailwind.config.js 파일을 열어서 content 배열 수정:"
echo "   content: ["
echo "     './src/pages/**/*.{js,ts,jsx,tsx,mdx}',"
echo "     './src/components/**/*.{js,ts,jsx,tsx,mdx}',"
echo "     './src/app/**/*.{js,ts,jsx,tsx,mdx}',"
echo "   ]"
echo ""
echo "2. npm run dev 실행"