# Git 워크플로우 가이드

## 기본 원칙

1. **Git에는 배포 버전 유지**: 커밋되는 코드는 항상 배포 가능한 상태
2. **로컬에서는 테스트 환경 사용**: 개발과 테스트는 테스트 환경에서 진행
3. **테스트 → 배포 반영**: 테스트에서 발견된 버그나 개선사항만 배포 버전에 적용

## 일일 워크플로우

### 1. 작업 시작 (테스트 환경)
```bash
# 이미 테스트 환경이 기본으로 설정되어 있음
npm run dev:test
```

### 2. 개발 및 테스트
- 테스트 환경에서 자유롭게 개발
- Mock 서비스들이 자동으로 사용됨
- 실제 API 키나 외부 서비스 없이 작업 가능

### 3. 커밋 준비
```bash
# 배포 버전으로 전환하여 커밋 준비
npm run git:prepare

# Git 상태 확인
git status

# 변경사항 확인
git diff

# 스테이징
git add .

# 커밋
git commit -m "feat: 새로운 기능 추가"
```

### 4. 푸시
```bash
git push origin main
```

### 5. 테스트 환경으로 복귀
```bash
# 자동으로 테스트 환경 복원
npm run env:restore-test
```

## 버그 수정 워크플로우

### 테스트에서 버그 발견 시
1. 테스트 환경에서 버그 재현 및 수정
2. 수정사항이 배포 환경에 영향이 없는지 확인
3. 배포 버전에 적용 가능한 수정만 분리

### 배포 버전에 적용 시 주의사항
- ❌ 테스트 전용 Mock 서비스 참조 금지
- ❌ 테스트 환경 전용 설정 하드코딩 금지  
- ✅ 환경 변수 기반 조건부 처리 사용
- ✅ config 모듈을 통한 환경 감지

## 환경별 파일 관리

### Git에 포함되는 파일 (배포 버전)
- `src/**/*.ts` - 모든 소스 코드
- `.env.example` - 환경 변수 템플릿
- `.env.production` - 프로덕션 템플릿 (실제 키 제외)
- `.env.test` - 테스트 환경 설정

### Git에서 제외되는 파일
- `.env.local` - 현재 활성 환경 설정
- `test.db` - 테스트 데이터베이스
- `uploads/test/` - 테스트 업로드 파일
- `.env.local.backup` - 환경 백업

## 코드 작성 가이드

### 환경별 분기 처리
```typescript
// ✅ 올바른 예 - config 모듈 사용
import { config } from '@/config'

if (config.cache.provider === 'redis') {
  // Redis 사용
} else {
  // Memory 캐시 사용
}
```

```typescript
// ❌ 잘못된 예 - 환경 하드코딩
if (process.env.APP_ENV === 'test') {
  // 테스트 전용 코드
}
```

### Mock 서비스 사용
```typescript
// ✅ Container를 통한 자동 주입
const aiService = container.get('openai')
// 환경에 따라 MockAIService 또는 실제 OpenAI 자동 선택
```

## 유용한 명령어

### 환경 관리
```bash
# 현재 환경 확인
npm run env:check

# 환경 전환 (대화형)
npm run env:switch

# 테스트 환경으로 빠른 전환
cp .env.test .env.local
```

### 배포 준비
```bash
# 배포 환경 검증
npm run validate:deploy

# 프로덕션 빌드 테스트
npm run build:prod
```

### 데이터베이스
```bash
# 테스트 DB 초기화
npm run db:init:test

# 프로덕션 마이그레이션 (실제 배포 시)
npm run db:migrate:prod
```

## 주의사항

1. **절대 하지 말아야 할 것**
   - 실제 API 키를 .env.production에 커밋
   - 테스트 전용 코드를 조건문 없이 배포 버전에 포함
   - .env.local 파일을 커밋

2. **항상 해야 할 것**
   - 커밋 전 `npm run git:prepare` 실행
   - 환경별 조건은 config 모듈 사용
   - 새로운 환경 변수는 모든 .env 파일에 추가

3. **배포 전 체크리스트**
   - [ ] `npm run validate:deploy` 통과
   - [ ] TypeScript 컴파일 오류 없음
   - [ ] 테스트 환경에서 모든 기능 검증
   - [ ] 환경 변수 문서화

## 문제 해결

### 실수로 테스트 환경을 커밋한 경우
```bash
# 커밋 취소
git reset HEAD~1

# 올바른 환경으로 재설정
npm run git:prepare

# 다시 커밋
git add .
git commit -m "메시지"
```

### 환경 파일이 꼬인 경우
```bash
# 모든 환경 파일 확인
npm run env:check

# 수동으로 재설정
cp .env.test .env.local
```