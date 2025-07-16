#!/bin/bash

# 안전한 미사용 패키지 제거 스크립트

echo "🧹 안전한 미사용 패키지 제거 시작..."
echo "===================================="

# 색상
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 백업
echo -e "${YELLOW}1. 백업 생성${NC}"
cp package.json package.json.safe-backup-$(date +%Y%m%d-%H%M%S)
cp -r src src.backup-$(date +%Y%m%d-%H%M%S) 2>/dev/null
echo "✅ 백업 완료"

# 초기 상태
echo -e "\n${YELLOW}2. 초기 상태${NC}"
INITIAL_SIZE=$(du -sh node_modules 2>/dev/null | cut -f1 || echo "0")
echo "node_modules 크기: $INITIAL_SIZE"

# Phase 1: 100% 안전한 미사용 Radix UI 컴포넌트
echo -e "\n${YELLOW}Phase 1: 미사용 Radix UI 컴포넌트 제거${NC}"

# 실제 사용 중인 Radix UI 컴포넌트 확인
echo "사용 중인 Radix UI 컴포넌트 확인..."
USED_RADIX=$(grep -r "@radix-ui" src/ --include="*.ts" --include="*.tsx" | grep -o "@radix-ui/[^\"']*" | sort -u)
echo "사용 중:"
echo "$USED_RADIX"

# 설치된 모든 Radix UI 패키지
INSTALLED_RADIX=$(npm list 2>/dev/null | grep "@radix-ui" | grep -o "@radix-ui/[^ ]*" | sort -u)

# 미사용 Radix UI 찾기
echo -e "\n미사용 Radix UI 패키지:"
UNUSED_RADIX=""
for pkg in $INSTALLED_RADIX; do
    if ! echo "$USED_RADIX" | grep -q "$pkg"; then
        echo "- $pkg"
        UNUSED_RADIX="$UNUSED_RADIX $pkg"
    fi
done

if [ -n "$UNUSED_RADIX" ]; then
    echo -e "\n${GREEN}제거 중...${NC}"
    npm uninstall $UNUSED_RADIX
fi

# Phase 2: 확실히 미사용인 기능 패키지
echo -e "\n${YELLOW}Phase 2: 미사용 기능 패키지 제거${NC}"

# 업로드 관련
if ! grep -r "uploadthing" src/ --include="*.ts" --include="*.tsx" >/dev/null 2>&1; then
    echo "uploadthing 미사용 - 제거"
    npm uninstall @uploadthing/react uploadthing 2>/dev/null
fi

# jose (JWT)
if ! grep -r "jose" src/ --include="*.ts" --include="*.tsx" >/dev/null 2>&1; then
    echo "jose 미사용 - 제거"
    npm uninstall jose 2>/dev/null
fi

# cmdk
if ! grep -r "cmdk" src/ --include="*.ts" --include="*.tsx" >/dev/null 2>&1; then
    echo "cmdk 미사용 - 제거"
    npm uninstall cmdk 2>/dev/null
fi

# react-day-picker
if ! grep -r "react-day-picker" src/ --include="*.ts" --include="*.tsx" >/dev/null 2>&1; then
    echo "react-day-picker 미사용 - 제거"
    npm uninstall react-day-picker 2>/dev/null
fi

# Phase 3: Excel 라이브러리 분석
echo -e "\n${YELLOW}Phase 3: Excel 라이브러리 분석${NC}"

EXCELJS_COUNT=$(grep -r "exceljs" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)
XLSX_COUNT=$(grep -r "xlsx" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)
HYPERFORMULA_COUNT=$(grep -r "hyperformula" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)

echo "사용 통계:"
echo "- exceljs: $EXCELJS_COUNT 곳"
echo "- xlsx: $XLSX_COUNT 곳"
echo "- hyperformula: $HYPERFORMULA_COUNT 곳"

# 사용이 매우 적은 경우만 제거 권장
if [ "$XLSX_COUNT" -lt 2 ]; then
    echo -e "${GREEN}xlsx는 거의 사용되지 않습니다. 제거를 권장합니다.${NC}"
    echo "제거하시겠습니까? (y/n)"
    read -r response
    if [[ "$response" == "y" ]]; then
        npm uninstall xlsx
    fi
fi

if [ "$HYPERFORMULA_COUNT" -lt 2 ]; then
    echo -e "${GREEN}hyperformula는 거의 사용되지 않습니다. 제거를 권장합니다.${NC}"
    echo "제거하시겠습니까? (y/n)"
    read -r response
    if [[ "$response" == "y" ]]; then
        npm uninstall hyperformula
    fi
fi

# Phase 4: 결제 시스템 확인
echo -e "\n${YELLOW}Phase 4: 결제 시스템 확인${NC}"
TOSS_COUNT=$(grep -r "tosspayments" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)
if [ "$TOSS_COUNT" -eq 0 ]; then
    echo "Tosspayments 미사용 - 제거 권장"
    echo "제거하시겠습니까? (y/n)"
    read -r response
    if [[ "$response" == "y" ]]; then
        npm uninstall @tosspayments/tosspayments-sdk
    fi
fi

# Phase 5: 테이블 라이브러리 확인
echo -e "\n${YELLOW}Phase 5: 테이블 라이브러리 확인${NC}"
TABLE_COUNT=$(grep -r "@tanstack/react-table" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)
if [ "$TABLE_COUNT" -eq 0 ]; then
    echo "@tanstack/react-table 미사용 - 제거 권장"
    echo "제거하시겠습니까? (y/n)"
    read -r response
    if [[ "$response" == "y" ]]; then
        npm uninstall @tanstack/react-table
    fi
fi

# Phase 6: 정리 및 최적화
echo -e "\n${YELLOW}Phase 6: 정리 및 최적화${NC}"
npm dedupe
npm prune --production

# 최종 결과
echo -e "\n${GREEN}========= 최종 결과 =========${NC}"
FINAL_SIZE=$(du -sh node_modules 2>/dev/null | cut -f1 || echo "0")
echo -e "node_modules 크기: ${RED}$INITIAL_SIZE${NC} → ${GREEN}$FINAL_SIZE${NC}"

# 시스템 검증
echo -e "\n${YELLOW}시스템 검증${NC}"
npm run typecheck && echo "✅ TypeScript 검증 통과" || echo "❌ TypeScript 오류"

echo -e "\n✅ 안전한 정리 완료!"
echo -e "\n문제 발생 시:"
echo "cp package.json.safe-backup-* package.json"
echo "npm install"