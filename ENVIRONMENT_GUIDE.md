# 환경 설정 가이드

## 개요
이 문서는 Excel 앱의 환경별 설정 시스템을 설명합니다. 이제 테스트와 프로덕션 환경 간에 코드를 수정하지 않고도 손쉽게 전환할 수 있습니다.

## 환경 구성

### 1. 개발 환경 (Development)
- **용도**: 일반적인 개발 작업
- **특징**: SQLite DB, 로컬 파일 저장, 실제 API 키 사용 가능
- **설정 파일**: `.env.example`를 `.env.local`로 복사

### 2. 테스트 환경 (Test)
- **용도**: 자동화된 테스트, 외부 의존성 없는 개발
- **특징**: 모든 외부 서비스 Mock 사용
- **설정 파일**: `.env.test`

### 3. 프로덕션 환경 (Production)
- **용도**: 실제 서비스 배포
- **특징**: PostgreSQL, Redis, S3, 실제 이메일 서비스 등
- **설정 파일**: `.env.production`

## 환경 전환 방법

### 방법 1: 환경 전환 스크립트 사용 (권장)
```bash
npm run env:switch
```
대화형 메뉴에서 원하는 환경을 선택합니다.

### 방법 2: 직접 명령어 사용
```bash
# 테스트 환경으로 전환
cp .env.test .env.local

# 프로덕션 환경으로 전환
cp .env.production .env.local
```

## 환경별 실행 명령어

### 테스트 환경
```bash
# 환경 전환
npm run env:switch  # 2번 (test) 선택

# 개발 서버 실행
npm run dev:test

# 전체 테스트 앱 실행
npm run test:app

# 테스트만 실행
npm test
```

### 프로덕션 환경
```bash
# 환경 전환
npm run env:switch  # 3번 (production) 선택

# 빌드
npm run build:prod

# 서버 실행
npm run start:prod

# Docker로 실행
npm run docker:compose:prod
```

## 환경 설정 확인
```bash
npm run env:check
```
현재 환경 설정과 각 환경별 주요 설정을 비교해서 보여줍니다.

## Docker 사용

### 테스트 환경
```bash
docker-compose -f docker-compose.test.yml up
```

### 프로덕션 환경
```bash
docker-compose -f docker-compose.prod.yml up
```

## 주요 환경 변수

| 변수명 | 테스트 | 프로덕션 | 설명 |
|--------|--------|----------|------|
| APP_ENV | test | production | 환경 구분 |
| DATABASE_URL | file:./test.db | postgresql://... | 데이터베이스 |
| CACHE_PROVIDER | memory | redis | 캐시 시스템 |
| STORAGE_PROVIDER | local | s3 | 파일 저장소 |
| USE_MOCK_AI | true | false | AI Mock 사용 |
| MOCK_AUTH_ENABLED | true | false | 인증 Mock 사용 |

## 서비스 설정 구조

```typescript
// src/config/index.ts
export const config = {
  env: 'test' | 'production',
  database: { ... },
  cache: { ... },
  ai: { ... },
  storage: { ... },
  // ...
}
```

Container.ts는 이 설정을 기반으로 자동으로 적절한 서비스를 등록합니다.

## 주의사항

1. **절대 .env.local을 커밋하지 마세요** - .gitignore에 포함되어 있습니다.
2. **프로덕션 환경 파일의 실제 키는 별도 관리** - .env.production은 템플릿입니다.
3. **환경 전환 후 서버 재시작 필요** - 환경 변수 변경사항 적용을 위해

## 문제 해결

### Redis 연결 오류
테스트 환경에서는 자동으로 메모리 캐시를 사용합니다.

### 파일 업로드 오류
테스트 환경에서는 ./uploads/test 디렉토리를 사용합니다.

### AI API 오류
테스트 환경에서는 MockAIService가 미리 정의된 응답을 반환합니다.