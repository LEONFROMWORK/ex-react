#!/bin/bash

echo "🔧 Next.js 최종 수정 스크립트"
echo "==============================="

# 1. 모든 프로세스 종료
echo -e "\n1. 기존 프로세스 정리..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

# 2. 캐시 및 빌드 파일 완전 삭제
echo -e "\n2. 캐시 완전 삭제..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .turbo
rm -rf tsconfig.tsbuildinfo
rm -rf next-env.d.ts

# 3. Next.js를 안정 버전으로 다운그레이드
echo -e "\n3. Next.js 13.5.6 (안정 버전)으로 다운그레이드..."
npm uninstall next
npm install next@13.5.6

# 4. TypeScript 설정 재생성
echo -e "\n4. TypeScript 설정 재생성..."
cat > tsconfig.json << 'EOF'
{
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
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
EOF

# 5. next.config.js 생성
echo -e "\n5. next.config.js 생성..."
cat > next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
}

module.exports = nextConfig
EOF

# 6. TypeScript 재설치
echo -e "\n6. TypeScript 재설치..."
npm install --save-dev typescript@5.2.2 @types/react@18.2.45 @types/node@20.10.5

# 7. Prisma 재생성
echo -e "\n7. Prisma 클라이언트 재생성..."
npx prisma generate

echo -e "\n✨ 수정 완료!"
echo "서버 실행: npm run dev"