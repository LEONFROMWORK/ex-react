#!/bin/bash

# 고급 node_modules 최적화 스크립트
# 블로그 참고 + 추가 최적화 기법

echo "🚀 고급 node_modules 최적화 시작..."
echo "====================================="

# 색상 설정
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 1. 초기 크기 측정
echo -e "${YELLOW}1. 초기 상태 분석${NC}"
INITIAL_SIZE=$(du -sh node_modules 2>/dev/null | cut -f1)
echo "현재 node_modules 크기: $INITIAL_SIZE"

# 패키지 수 계산
PACKAGE_COUNT=$(find node_modules -maxdepth 1 -type d | wc -l)
echo "설치된 패키지 수: $PACKAGE_COUNT"

# 2. package.json 최적화
echo -e "\n${YELLOW}2. package.json 분석${NC}"

# peerDependencies를 dependencies로 잘못 설치한 경우 찾기
echo "중복 가능성 있는 패키지 확인..."
npm ls --depth=0 2>&1 | grep "peer dep" || echo "✅ peer dependency 이슈 없음"

# 3. 프로덕션 전용 설치
echo -e "\n${YELLOW}3. 프로덕션 전용 재설치${NC}"
rm -rf node_modules package-lock.json
npm install --production --no-optional --no-audit --no-fund --legacy-peer-deps

# 4. 중복 패키지 제거
echo -e "\n${YELLOW}4. 중복 패키지 제거${NC}"
npx npm-dedupe

# 5. Tree Shaking을 위한 패키지 분석
echo -e "\n${YELLOW}5. Tree Shaking 가능 패키지 확인${NC}"

# lodash 최적화
if [ -d "node_modules/lodash" ]; then
    echo "⚠️  lodash 발견 - lodash-es로 교체 권장"
    LODASH_SIZE=$(du -sh node_modules/lodash 2>/dev/null | cut -f1)
    echo "   현재 크기: $LODASH_SIZE"
fi

# moment 최적화
if [ -d "node_modules/moment" ]; then
    echo "⚠️  moment 발견 - dayjs로 교체 권장"
    MOMENT_SIZE=$(du -sh node_modules/moment 2>/dev/null | cut -f1)
    echo "   현재 크기: $MOMENT_SIZE"
    
    # moment locale 최적화
    if [ -d "node_modules/moment/locale" ]; then
        echo "   locale 파일 최적화 중..."
        find node_modules/moment/locale -type f ! -name "ko.js" ! -name "en.js" -delete 2>/dev/null
        echo "   ✅ 한국어/영어 외 locale 제거"
    fi
fi

# 6. 플랫폼별 바이너리 제거
echo -e "\n${YELLOW}6. 불필요한 플랫폼 바이너리 제거${NC}"

# 현재 플랫폼 확인
PLATFORM=$(node -p "process.platform")
ARCH=$(node -p "process.arch")
echo "현재 플랫폼: $PLATFORM-$ARCH"

# 다른 플랫폼 바이너리 제거
find node_modules -name "*.node" -o -name "*.dll" -o -name "*.so" | while read binary; do
    if [[ ! "$binary" =~ "$PLATFORM" ]] && [[ ! "$binary" =~ "$ARCH" ]]; then
        rm -f "$binary" 2>/dev/null
    fi
done

# 7. 캐시 파일 제거
echo -e "\n${YELLOW}7. 캐시 및 임시 파일 제거${NC}"
find node_modules -name ".cache" -type d -exec rm -rf {} + 2>/dev/null
find node_modules -name "*.cache" -type f -delete 2>/dev/null
find node_modules -name ".yarn-integrity" -type f -delete 2>/dev/null

# 8. 소스맵과 타입 정의 최적화
echo -e "\n${YELLOW}8. 프로덕션 불필요 파일 제거${NC}"

# 소스맵 제거
find node_modules -name "*.map" -type f -delete 2>/dev/null
find node_modules -name "*.js.map" -type f -delete 2>/dev/null

# 개발용 타입 정의 제거 (주의: TypeScript 프로젝트에서는 필요할 수 있음)
# find node_modules/@types -type d -exec rm -rf {} + 2>/dev/null

# 9. 특정 패키지 최적화
echo -e "\n${YELLOW}9. 특정 패키지 최적화${NC}"

# AWS SDK v3 최적화
if [ -d "node_modules/@aws-sdk" ]; then
    echo "AWS SDK v3 최적화..."
    # 사용하지 않는 서비스 클라이언트 제거
    find node_modules/@aws-sdk -type d -name "client-*" ! -name "client-s3" -exec rm -rf {} + 2>/dev/null
    echo "✅ S3 클라이언트만 유지"
fi

# React Icons 최적화
if [ -d "node_modules/react-icons" ]; then
    echo "React Icons 최적화..."
    # 사용하지 않는 아이콘 세트 제거
    find node_modules/react-icons -type d -name "[a-z]*" ! -name "lib" ! -name "esm" -exec rm -rf {} + 2>/dev/null
fi

# 10. 빈 디렉토리 제거
echo -e "\n${YELLOW}10. 빈 디렉토리 정리${NC}"
find node_modules -type d -empty -delete 2>/dev/null

# 11. 최종 크기 확인
echo -e "\n${YELLOW}11. 최적화 결과${NC}"
FINAL_SIZE=$(du -sh node_modules 2>/dev/null | cut -f1)
FINAL_PACKAGE_COUNT=$(find node_modules -maxdepth 1 -type d | wc -l)

echo "====================================="
echo -e "초기 크기: ${RED}$INITIAL_SIZE${NC}"
echo -e "최종 크기: ${GREEN}$FINAL_SIZE${NC}"
echo -e "패키지 수: $PACKAGE_COUNT → $FINAL_PACKAGE_COUNT"

# 12. 검증
echo -e "\n${YELLOW}12. 시스템 검증${NC}"
echo "TypeScript 컴파일 테스트..."
npm run typecheck 2>/dev/null && echo "✅ TypeScript 검증 통과" || echo "❌ TypeScript 오류"

echo "빌드 테스트..."
npm run build 2>/dev/null && echo "✅ 빌드 성공" || echo "❌ 빌드 실패"

# 13. 권장사항
echo -e "\n${GREEN}💡 추가 권장사항:${NC}"
echo "1. package.json에서 사용하지 않는 의존성 제거"
echo "2. npm audit fix --production 실행"
echo "3. .npmrc에 production=true 설정"
echo "4. CI/CD에서 npm ci --production 사용"

echo -e "\n✅ 최적화 완료!"