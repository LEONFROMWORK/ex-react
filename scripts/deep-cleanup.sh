#!/bin/bash

# 심층 정리 스크립트 - 안전하게 사용하지 않는 기능 제거

echo "🔍 심층 정리 시작..."
echo "================================"

# 색상
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 백업
echo -e "${YELLOW}1. 백업 생성${NC}"
cp package.json package.json.deep-backup
echo "✅ package.json 백업 완료"

# 현재 상태
echo -e "\n${YELLOW}2. 현재 상태 분석${NC}"
INITIAL_NODE_SIZE=$(du -sh node_modules 2>/dev/null | cut -f1 || echo "0")
INITIAL_PKG_COUNT=$(npm list --depth=0 2>/dev/null | grep -c "├─" || echo "0")
echo "node_modules 크기: $INITIAL_NODE_SIZE"
echo "패키지 수: $INITIAL_PKG_COUNT"

# 3. 확실히 사용하지 않는 패키지 제거
echo -e "\n${YELLOW}3. 미사용 패키지 제거${NC}"

# Radix UI 미사용 컴포넌트
UNUSED_RADIX="@radix-ui/react-radio-group @radix-ui/react-separator"
echo "Radix UI 미사용 컴포넌트 제거..."
npm uninstall $UNUSED_RADIX 2>/dev/null

# 파일 업로드 미사용
UNUSED_UPLOAD="@uploadthing/react uploadthing"
echo "미사용 업로드 라이브러리 제거..."
npm uninstall $UNUSED_UPLOAD 2>/dev/null

# 미사용 인증
echo "미사용 인증 라이브러리 제거..."
npm uninstall jose 2>/dev/null

# 4. 중복 Excel 라이브러리 확인
echo -e "\n${YELLOW}4. Excel 라이브러리 통합${NC}"
echo "현재 설치된 Excel 라이브러리:"
npm list 2>/dev/null | grep -E "(exceljs|xlsx|hyperformula)" || echo "없음"

# ExcelJS 사용 여부 확인
EXCELJS_USAGE=$(grep -r "from 'exceljs'" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)
XLSX_USAGE=$(grep -r "from 'xlsx'" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)
HYPERFORMULA_USAGE=$(grep -r "from 'hyperformula'" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)

echo "사용 통계:"
echo "- exceljs: $EXCELJS_USAGE 곳에서 사용"
echo "- xlsx: $XLSX_USAGE 곳에서 사용"
echo "- hyperformula: $HYPERFORMULA_USAGE 곳에서 사용"

# 사용량이 적은 라이브러리 제거 제안
if [ "$XLSX_USAGE" -lt 3 ]; then
    echo -e "${GREEN}xlsx는 거의 사용되지 않습니다. 제거를 권장합니다.${NC}"
fi
if [ "$HYPERFORMULA_USAGE" -lt 3 ]; then
    echo -e "${GREEN}hyperformula는 거의 사용되지 않습니다. 제거를 권장합니다.${NC}"
fi

# 5. 클라우드 스토리지 확인
echo -e "\n${YELLOW}5. 클라우드 스토리지 통합${NC}"
AWS_USAGE=$(grep -r "@aws-sdk/client-s3" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)
AZURE_USAGE=$(grep -r "@azure/storage-blob" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)

echo "사용 통계:"
echo "- AWS S3: $AWS_USAGE 곳에서 사용"
echo "- Azure Blob: $AZURE_USAGE 곳에서 사용"

# 6. 테스트 파일 정리
echo -e "\n${YELLOW}6. 테스트 파일 이동${NC}"
TEST_FILES=$(find src/ -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts" 2>/dev/null | wc -l)
echo "src/ 내 테스트 파일: $TEST_FILES 개"

if [ "$TEST_FILES" -gt 0 ]; then
    echo "테스트 파일을 __tests__ 디렉토리로 이동하는 것을 권장합니다."
    mkdir -p __tests__
fi

# 7. 중복 파일 정리
echo -e "\n${YELLOW}7. 중복 파일 정리${NC}"
echo "중복 설정 파일:"
ls -la | grep -E "(next\.config\.|Dockerfile)" | grep -v "node_modules"

# 8. 사용하지 않는 스크립트 정리
echo -e "\n${YELLOW}8. 미사용 스크립트 정리${NC}"
echo "scripts/ 디렉토리 내용:"
ls -la scripts/ 2>/dev/null | tail -n +4 | wc -l && echo "개 파일"

# 9. 문서 파일 정리
echo -e "\n${YELLOW}9. 문서 파일 정리${NC}"
DOC_FILES=$(ls -1 *.md 2>/dev/null | wc -l)
echo "루트 디렉토리의 .md 파일: $DOC_FILES 개"

# 10. node_modules 최적화
echo -e "\n${YELLOW}10. node_modules 재설치 및 최적화${NC}"
echo "정리된 패키지로 재설치하시겠습니까? (y/n)"
read -r response
if [[ "$response" == "y" ]]; then
    rm -rf node_modules package-lock.json
    npm install --production --legacy-peer-deps
    npm dedupe
fi

# 11. 최종 결과
echo -e "\n${GREEN}========= 정리 결과 =========${NC}"
FINAL_NODE_SIZE=$(du -sh node_modules 2>/dev/null | cut -f1 || echo "0")
FINAL_PKG_COUNT=$(npm list --depth=0 2>/dev/null | grep -c "├─" || echo "0")

echo -e "node_modules 크기: ${RED}$INITIAL_NODE_SIZE${NC} → ${GREEN}$FINAL_NODE_SIZE${NC}"
echo -e "패키지 수: ${RED}$INITIAL_PKG_COUNT${NC} → ${GREEN}$FINAL_PKG_COUNT${NC}"

# 12. 추가 권장사항
echo -e "\n${YELLOW}추가 권장사항:${NC}"
echo "1. xlsx와 hyperformula 제거 고려 (exceljs로 통합)"
echo "2. AWS S3 또는 Azure Blob 중 하나만 사용"
echo "3. 테스트 파일을 src/ 밖으로 이동"
echo "4. 중복된 next.config 파일 정리"
echo "5. 미사용 스크립트 제거"
echo "6. 문서를 docs/ 폴더로 이동"

echo -e "\n✅ 심층 정리 완료!"