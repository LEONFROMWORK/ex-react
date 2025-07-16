#!/bin/bash

# 극한의 최적화 스크립트 - 실제 경량화
echo "🔥 극한의 최적화 시작..."
echo "================================"

# 색상
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 백업
echo -e "${YELLOW}1. 백업 생성${NC}"
cp package.json package.json.backup
cp package-lock.json package-lock.json.backup 2>/dev/null

# 현재 크기
INITIAL_SIZE=$(du -sh node_modules 2>/dev/null | cut -f1 || echo "0")
echo "현재 node_modules: $INITIAL_SIZE"

# 2. 중복 패키지 제거
echo -e "\n${YELLOW}2. 중복 패키지 제거${NC}"

# Excel 라이브러리 통합 (exceljs만 사용)
npm uninstall xlsx hyperformula 2>/dev/null

# AI SDK 통합 (anthropic만 사용)
npm uninstall @google/generative-ai openai 2>/dev/null

# HTTP 클라이언트 제거 (fetch 사용)
npm uninstall axios 2>/dev/null

# 중복 기능 제거
npm uninstall moment 2>/dev/null  # date-fns 사용

echo "✅ 중복 패키지 제거 완료"

# 3. 프로덕션 최적화
echo -e "\n${YELLOW}3. 프로덕션 전용 재설치${NC}"
rm -rf node_modules
NODE_ENV=production npm ci --production --no-audit --no-fund --legacy-peer-deps

# 4. Prisma 최적화
echo -e "\n${YELLOW}4. Prisma 엔진 최적화${NC}"
npx prisma generate

# 필요한 엔진만 유지
cd node_modules/.prisma/client
find . -name "*.node" | while read engine; do
    if [[ ! "$engine" =~ "linux-musl-openssl" ]] && [[ ! "$engine" =~ "darwin" ]]; then
        rm -f "$engine"
    fi
done
cd ../../../../

# 5. Next.js 최적화
echo -e "\n${YELLOW}5. Next.js 최적화${NC}"
if [ -d "node_modules/next" ]; then
    # SWC 바이너리 최적화
    cd node_modules/@next/swc-*
    find . -name "*.node" | while read binary; do
        PLATFORM=$(node -p "process.platform")
        ARCH=$(node -p "process.arch")
        if [[ ! "$binary" =~ "$PLATFORM" ]] || [[ ! "$binary" =~ "$ARCH" ]]; then
            rm -f "$binary"
        fi
    done
    cd ../../../..
fi

# 6. 패키지별 최적화
echo -e "\n${YELLOW}6. 패키지별 최적화${NC}"

# @radix-ui 최적화 (사용하는 것만 유지)
USED_RADIX=$(grep -r "@radix-ui" src/ --include="*.tsx" --include="*.ts" | grep -o "@radix-ui/[^\"']*" | sort -u)
cd node_modules/@radix-ui
for package in */; do
    PKG_NAME="@radix-ui/${package%/}"
    if ! echo "$USED_RADIX" | grep -q "$PKG_NAME"; then
        rm -rf "$package"
    fi
done
cd ../..

# AWS SDK 최적화
if [ -d "node_modules/@aws-sdk" ]; then
    echo "AWS SDK 최적화..."
    cd node_modules/@aws-sdk
    # client-s3만 유지
    find . -maxdepth 1 -type d -name "client-*" ! -name "client-s3" -exec rm -rf {} +
    # 공통 모듈 정리
    find . -name "*-browser" -type d -exec rm -rf {} + 2>/dev/null
    cd ../..
fi

# 7. 소스 파일 제거
echo -e "\n${YELLOW}7. 불필요한 파일 제거${NC}"

# TypeScript 소스 (d.ts는 유지)
find node_modules -name "*.ts" ! -name "*.d.ts" -delete 2>/dev/null

# 소스맵
find node_modules -name "*.map" -delete 2>/dev/null

# 문서
find node_modules \( -name "*.md" -o -name "LICENSE*" -o -name "CHANGELOG*" \) -delete 2>/dev/null

# 테스트
find node_modules \( -name "__tests__" -o -name "test" -o -name "tests" \) -type d -prune -exec rm -rf {} + 2>/dev/null

# 예제
find node_modules \( -name "example" -o -name "examples" -o -name "demo" \) -type d -prune -exec rm -rf {} + 2>/dev/null

# 설정 파일
find node_modules -name ".eslintrc*" -delete 2>/dev/null
find node_modules -name ".prettierrc*" -delete 2>/dev/null
find node_modules -name "tsconfig.json" -delete 2>/dev/null

# 8. 바이너리 최적화
echo -e "\n${YELLOW}8. 바이너리 최적화${NC}"
PLATFORM=$(node -p "process.platform")
ARCH=$(node -p "process.arch")

find node_modules -name "*.node" -o -name "*.exe" -o -name "*.dll" | while read binary; do
    # 현재 플랫폼이 아닌 바이너리 제거
    if [[ ! "$binary" =~ "$PLATFORM" ]] && [[ ! "$binary" =~ "$ARCH" ]]; then
        rm -f "$binary" 2>/dev/null
    fi
done

# 9. 캐시 정리
echo -e "\n${YELLOW}9. 캐시 및 임시 파일 정리${NC}"
find node_modules -name ".cache" -type d -exec rm -rf {} + 2>/dev/null
find node_modules -name "*.cache" -delete 2>/dev/null
find node_modules -name ".yarn-*" -delete 2>/dev/null
find node_modules -name ".npm-*" -delete 2>/dev/null

# 10. 빈 디렉토리 제거
echo -e "\n${YELLOW}10. 빈 디렉토리 정리${NC}"
find node_modules -type d -empty -delete 2>/dev/null

# 11. 패키지 정리
echo -e "\n${YELLOW}11. 패키지 정리${NC}"
npm prune --production
npm dedupe

# 12. 최종 결과
echo -e "\n${GREEN}========= 최적화 결과 =========${NC}"
FINAL_SIZE=$(du -sh node_modules 2>/dev/null | cut -f1)
echo -e "이전 크기: ${RED}$INITIAL_SIZE${NC}"
echo -e "최종 크기: ${GREEN}$FINAL_SIZE${NC}"

# 무거운 패키지 확인
echo -e "\n${YELLOW}남은 무거운 패키지:${NC}"
du -sh node_modules/* 2>/dev/null | sort -rh | head -10

# 13. 검증
echo -e "\n${YELLOW}시스템 검증${NC}"
npm run typecheck 2>/dev/null && echo "✅ TypeScript 검증 통과" || echo "❌ TypeScript 오류"

echo -e "\n✅ 극한의 최적화 완료!"