#!/bin/bash

echo "🔧 Tailwind CSS 문제 해결 중..."
echo "============================="

# 1. 캐시 정리
echo "1. 캐시 정리..."
rm -rf .next
rm -rf node_modules/.cache

# 2. 오래된 CSS 파일 제거
echo "2. 오래된 CSS 파일 제거..."
rm -f src/app/global.css
rm -f src/app/globals.css

# 3. PostCSS 캐시 정리
echo "3. PostCSS 캐시 정리..."
rm -rf node_modules/.cache/postcss

# 4. Tailwind와 PostCSS 재설치
echo "4. Tailwind와 PostCSS 재설치..."
npm uninstall tailwindcss postcss autoprefixer
npm install -D tailwindcss postcss autoprefixer

# 5. 서버 재시작
echo ""
echo "✅ 정리 완료!"
echo ""
echo "이제 다음 명령어를 실행하세요:"
echo "npm run dev"