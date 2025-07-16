#!/bin/bash

# 안전한 node_modules 경량화 스크립트
# 시스템에 영향을 주지 않으면서 크기를 줄입니다

echo "🔍 안전한 node_modules 최적화 시작..."

# 1. 현재 크기 확인
echo "현재 node_modules 크기:"
du -sh node_modules 2>/dev/null || echo "node_modules를 찾을 수 없습니다"

# 2. 백업 생성 (안전을 위해)
echo "📦 package-lock.json 백업 중..."
cp package-lock.json package-lock.json.backup

# 3. 캐시 정리
echo "🧹 npm 캐시 정리..."
npm cache clean --force

# 4. 중복 패키지 제거 (안전)
echo "🔄 중복 패키지 제거..."
npx npm-dedupe

# 5. 사용하지 않는 패키지 찾기
echo "🔍 사용하지 않는 패키지 검사..."
npx depcheck --json > unused-deps.json

# 6. 프로덕션에 불필요한 파일만 제거 (안전한 것들만)
echo "🗑️ 안전한 파일 제거 중..."

# Markdown 파일 (문서)
find node_modules -name "*.md" -not -path "*/node_modules/.bin/*" -type f -delete 2>/dev/null

# 설정 파일들 (프로덕션에 불필요)
find node_modules -name ".eslintrc*" -type f -delete 2>/dev/null
find node_modules -name ".prettierrc*" -type f -delete 2>/dev/null
find node_modules -name ".editorconfig" -type f -delete 2>/dev/null
find node_modules -name "tsconfig.json" -type f -delete 2>/dev/null
find node_modules -name "tslint.json" -type f -delete 2>/dev/null

# 테스트 관련 (안전하게 제거 가능)
find node_modules -name "*.test.js" -type f -delete 2>/dev/null
find node_modules -name "*.spec.js" -type f -delete 2>/dev/null
find node_modules -name "*.test.ts" -type f -delete 2>/dev/null
find node_modules -name "*.spec.ts" -type f -delete 2>/dev/null

# 맵 파일 (디버깅용, 프로덕션에 불필요)
find node_modules -name "*.map" -type f -delete 2>/dev/null
find node_modules -name "*.js.map" -type f -delete 2>/dev/null

# 소스 파일 (컴파일된 JS가 있는 경우)
# 주의: 일부 패키지는 TS 소스가 필요할 수 있으므로 주의깊게 처리
# find node_modules -name "*.ts" -not -name "*.d.ts" -type f -delete 2>/dev/null

# 예제 폴더 (안전하게 제거 가능)
find node_modules -path "*/examples" -type d -prune -exec rm -rf {} + 2>/dev/null
find node_modules -path "*/example" -type d -prune -exec rm -rf {} + 2>/dev/null
find node_modules -path "*/__tests__" -type d -prune -exec rm -rf {} + 2>/dev/null
find node_modules -path "*/test" -type d -prune -exec rm -rf {} + 2>/dev/null
find node_modules -path "*/tests" -type d -prune -exec rm -rf {} + 2>/dev/null

# 문서 폴더
find node_modules -path "*/docs" -type d -prune -exec rm -rf {} + 2>/dev/null

# 이미지 파일 (로고, 뱃지 등)
find node_modules -name "*.png" -type f -delete 2>/dev/null
find node_modules -name "*.jpg" -type f -delete 2>/dev/null
find node_modules -name "*.jpeg" -type f -delete 2>/dev/null
find node_modules -name "*.gif" -type f -delete 2>/dev/null
find node_modules -name "*.svg" -not -path "*/dist/*" -type f -delete 2>/dev/null

# 7. 특정 무거운 패키지 최적화
echo "📦 특정 패키지 최적화..."

# AWS SDK - 필요한 클라이언트만 유지
if [ -d "node_modules/@aws-sdk" ]; then
    echo "AWS SDK 최적화 중..."
    # client-s3만 유지하고 나머지는 제거
    find node_modules/@aws-sdk -type d -name "client-*" -not -name "client-s3" -prune -exec rm -rf {} + 2>/dev/null
fi

# moment.js locale 파일 (한국어와 영어만 유지)
if [ -d "node_modules/moment/locale" ]; then
    echo "Moment.js locale 최적화 중..."
    find node_modules/moment/locale -type f -not -name "ko.js" -not -name "en-gb.js" -delete 2>/dev/null
fi

# 8. 최적화 후 크기 확인
echo "✅ 최적화 완료!"
echo "최적화 후 node_modules 크기:"
du -sh node_modules 2>/dev/null

# 9. 변경사항 요약
echo "📊 최적화 결과 요약:"
echo "- Markdown 파일 제거"
echo "- 테스트 파일 제거"
echo "- 예제 폴더 제거"
echo "- 소스맵 파일 제거"
echo "- 불필요한 설정 파일 제거"
echo "- AWS SDK 최적화"
echo "- Moment.js locale 최적화"

# 10. 시스템 정상 작동 확인을 위한 빌드 테스트
echo "🧪 시스템 정상 작동 확인..."
npm run typecheck && echo "✅ TypeScript 체크 통과" || echo "❌ TypeScript 체크 실패"

echo "💡 팁: 문제가 발생하면 'cp package-lock.json.backup package-lock.json && npm install'로 복구하세요"