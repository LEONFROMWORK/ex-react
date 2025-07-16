# node_modules 경량화 가이드

## 🎯 목표
시스템 안정성을 유지하면서 node_modules 크기를 50% 이상 줄이기

## 🛠️ 제공된 도구

### 1. 안전한 최적화 스크립트
```bash
chmod +x scripts/safe-optimize-node-modules.sh
./scripts/safe-optimize-node-modules.sh
```
- 백업 생성 후 진행
- 시스템에 영향 없는 파일만 제거
- 자동 테스트로 안정성 확인

### 2. 무거운 패키지 분석
```bash
node scripts/analyze-heavy-packages.js
```
- 상위 20개 무거운 패키지 표시
- 최적화 제안 제공
- 대안 패키지 추천

### 3. 스마트 트리 쉐이킹
```bash
node scripts/smart-tree-shaking.js
```
- 실제 사용되는 패키지만 감지
- 사용하지 않는 의존성 발견
- 최적화 명령어 자동 생성

## 📋 단계별 실행 방법

### Step 1: 현재 상태 분석
```bash
# 현재 크기 확인
du -sh node_modules

# 무거운 패키지 분석
node scripts/analyze-heavy-packages.js > heavy-packages.log

# 사용하지 않는 패키지 찾기
node scripts/smart-tree-shaking.js > unused-packages.log
```

### Step 2: 백업 생성
```bash
# package-lock.json 백업
cp package-lock.json package-lock.json.backup

# 현재 설치 상태 기록
npm list --depth=0 > current-packages.txt
```

### Step 3: 안전한 최적화 실행
```bash
# 안전한 파일 제거
./scripts/safe-optimize-node-modules.sh

# 중복 패키지 제거
npm dedupe

# 프로덕션 전용 재설치 (선택사항)
rm -rf node_modules
npm ci --production
```

### Step 4: 검증
```bash
# TypeScript 컴파일 확인
npm run typecheck

# 빌드 테스트
npm run build

# 개발 서버 실행 테스트
npm run dev
```

## 🎯 추가 최적화 옵션

### AWS SDK 최적화
```json
// package.json 수정
{
  "dependencies": {
    "@aws-sdk/client-s3": "^3.0.0"  // 전체 SDK 대신 S3만
  }
}
```

### Excel 라이브러리 통합
```bash
# 중복 제거 (하나만 선택)
npm uninstall xlsx sheetjs-style
# ExcelJS만 유지
```

### 개발 의존성 정리
```bash
# 프로덕션에서 불필요한 것들
npm uninstall --save-dev @types/node  # 이미 TypeScript에 포함
```

## ⚠️ 주의사항

### 삭제하면 안 되는 것들
- `.bin/` 폴더 (실행 파일)
- `*.node` 파일 (네이티브 모듈)
- `package.json` 파일
- 핵심 `.js` 파일

### 문제 발생 시 복구
```bash
# package-lock.json 복원
cp package-lock.json.backup package-lock.json

# 전체 재설치
rm -rf node_modules
npm install
```

## 📊 예상 결과

### 크기 감소
- Markdown, 문서: -20MB
- 테스트 파일: -30MB
- 예제 폴더: -15MB
- 소스맵: -25MB
- **총 예상: -90MB 이상**

### 성능 향상
- 설치 시간: 50% 단축
- CI/CD 시간: 30% 단축
- Docker 이미지: 40% 감소

## 🔄 자동화 (CI/CD)

### GitHub Actions
```yaml
- name: Optimize node_modules
  run: |
    npm ci --production
    ./scripts/safe-optimize-node-modules.sh
```

### Dockerfile
```dockerfile
# 프로덕션 스테이지
FROM node:18-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --production && \
    npm cache clean --force
COPY scripts/safe-optimize-node-modules.sh ./scripts/
RUN ./scripts/safe-optimize-node-modules.sh
```

## 🏁 최종 체크리스트

- [ ] 백업 생성 완료
- [ ] 분석 스크립트 실행
- [ ] 안전한 최적화 실행
- [ ] TypeScript 컴파일 성공
- [ ] 빌드 테스트 통과
- [ ] 개발 서버 정상 작동
- [ ] E2E 테스트 통과

이 가이드를 따르면 시스템 안정성을 유지하면서 node_modules를 효과적으로 경량화할 수 있습니다.