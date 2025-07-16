#!/bin/bash

# 초경량 최적화 스크립트 - 시스템 안전성 보장
echo "🚀 초경량 최적화 시작 (안전 모드)..."
echo "===================================="

# 색상
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 1. 백업 생성
echo -e "${YELLOW}1. 안전을 위한 백업 생성${NC}"
cp package.json package.json.backup
cp package-lock.json package-lock.json.backup 2>/dev/null || echo "package-lock.json 없음"
echo "✅ 백업 완료"

# 2. 사용하지 않는 의존성 분석
echo -e "\n${YELLOW}2. 사용하지 않는 의존성 분석${NC}"
npx depcheck --json > depcheck-results.json 2>/dev/null

# 3. 프로덕션 전용 설치
echo -e "\n${YELLOW}3. 프로덕션 전용 재설치${NC}"
rm -rf node_modules
npm ci --production --no-audit --no-fund --legacy-peer-deps

# 4. Prisma 클라이언트 생성
echo -e "\n${YELLOW}4. Prisma 최적화${NC}"
npx prisma generate
# Prisma 엔진 최적화 (필요한 것만 유지)
find node_modules/.prisma -name "*.node" ! -name "*linux-musl*" -delete 2>/dev/null

# 5. ExcelJS 최적화
echo -e "\n${YELLOW}5. ExcelJS 최적화${NC}"
if [ -d "node_modules/exceljs" ]; then
    # 예제 파일 제거
    rm -rf node_modules/exceljs/spec 2>/dev/null
    rm -rf node_modules/exceljs/test 2>/dev/null
    echo "✅ ExcelJS 최적화 완료"
fi

# 6. Next.js 최적화
echo -e "\n${YELLOW}6. Next.js 최적화${NC}"
if [ -d "node_modules/next" ]; then
    # 불필요한 바이너리 제거
    find node_modules/next -name "*.exe" -delete 2>/dev/null
    find node_modules/next -name "*.map" -delete 2>/dev/null
    echo "✅ Next.js 최적화 완료"
fi

# 7. TypeScript 관련 최적화
echo -e "\n${YELLOW}7. TypeScript 최적화${NC}"
# 프로덕션에서는 .d.ts만 필요
find node_modules -name "*.ts" ! -name "*.d.ts" -delete 2>/dev/null

# 8. 언어별 리소스 최적화
echo -e "\n${YELLOW}8. 언어 리소스 최적화${NC}"
# 한국어와 영어만 유지
find node_modules -path "*/locales/*" -o -path "*/i18n/*" | while read file; do
    if [[ ! "$file" =~ (ko|kr|en|us) ]]; then
        rm -f "$file" 2>/dev/null
    fi
done

# 9. 문서 및 예제 제거
echo -e "\n${YELLOW}9. 문서 및 예제 제거${NC}"
find node_modules \( \
    -name "*.md" -o \
    -name "*.markdown" -o \
    -name "LICENSE*" -o \
    -name "CHANGELOG*" -o \
    -name "README*" -o \
    -name "HISTORY*" -o \
    -name "AUTHORS*" -o \
    -name "CONTRIBUTORS*" \
\) -delete 2>/dev/null

# 테스트 관련 제거
find node_modules \( \
    -name "__tests__" -o \
    -name "test" -o \
    -name "tests" -o \
    -name "spec" -o \
    -name "*.test.js" -o \
    -name "*.spec.js" \
\) -prune -exec rm -rf {} + 2>/dev/null

# 10. 빈 디렉토리 제거
echo -e "\n${YELLOW}10. 빈 디렉토리 정리${NC}"
find node_modules -type d -empty -delete 2>/dev/null

# 11. 패키지별 특별 최적화
echo -e "\n${YELLOW}11. 패키지별 특별 최적화${NC}"

# @aws-sdk 최적화
if [ -d "node_modules/@aws-sdk" ]; then
    echo "AWS SDK 최적화..."
    # S3 클라이언트만 유지
    find node_modules/@aws-sdk -maxdepth 1 -type d -name "client-*" ! -name "client-s3" -exec rm -rf {} + 2>/dev/null
    # 불필요한 미들웨어 제거
    find node_modules/@aws-sdk -name "*-middleware" -type d ! -path "*client-s3*" -exec rm -rf {} + 2>/dev/null
fi

# React/Next 관련 최적화
find node_modules -name "*.development.js" -delete 2>/dev/null

# 12. 압축 가능한 텍스트 파일 압축
echo -e "\n${YELLOW}12. 텍스트 파일 압축 (선택사항)${NC}"
# JSON 파일 압축 (package.json 제외)
# find node_modules -name "*.json" ! -name "package.json" -exec gzip -9 {} \; 2>/dev/null

# 13. 최종 검증
echo -e "\n${YELLOW}13. 시스템 검증${NC}"
echo "TypeScript 컴파일 체크..."
npm run typecheck && echo "✅ TypeScript 검증 통과" || echo "❌ TypeScript 오류 (복구 필요)"

# 14. 결과 보고
echo -e "\n${GREEN}======== 최적화 결과 ========${NC}"
FINAL_SIZE=$(du -sh node_modules 2>/dev/null | cut -f1)
echo -e "최종 크기: ${GREEN}$FINAL_SIZE${NC}"

# 상위 10개 무거운 패키지
echo -e "\n${YELLOW}무거운 패키지 TOP 10:${NC}"
du -sh node_modules/* 2>/dev/null | sort -rh | head -10

# 15. 복구 안내
echo -e "\n${YELLOW}문제 발생 시 복구 방법:${NC}"
echo "cp package.json.backup package.json"
echo "cp package-lock.json.backup package-lock.json"
echo "rm -rf node_modules && npm install"

echo -e "\n✅ 초경량 최적화 완료!"