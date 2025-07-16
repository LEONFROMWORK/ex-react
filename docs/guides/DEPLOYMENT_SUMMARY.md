# 배포 환경 수정 사항 요약

## 개요
테스트 환경과 배포 환경을 분리하여 코드 수정 없이 환경을 전환할 수 있도록 시스템을 구성했습니다.

## 주요 수정 사항

### 1. 환경별 설정 시스템
- **환경 설정 파일**: `.env.test`, `.env.production`, `.env.example`
- **중앙 설정 모듈**: `src/config/index.ts`
- **환경 전환 도구**: `npm run env:switch`

### 2. 배포 환경에서 발생할 수 있었던 오류 수정

#### Signup API 개선
- 추천인 코드 생성 로직 개선 (고유성 보장)
- 데이터베이스 연결 오류 처리 강화
- Prisma 에러 코드별 상세 처리

#### Prisma 스키마 환경별 설정
```prisma
datasource db {
  provider = env("DATABASE_PROVIDER")  // sqlite or postgresql
  url      = env("DATABASE_URL")
}
```

#### 데이터베이스 초기화 스크립트
- `scripts/init-db.js` - 환경별 데이터베이스 초기화
- SQLite/PostgreSQL 자동 감지
- 프로덕션/개발 환경별 마이그레이션 전략

#### CSP 헤더 정리
- Tailwind CDN 참조 제거
- 보안 헤더 추가 (X-Frame-Options, X-Content-Type-Options 등)

### 3. 환경별 서비스 설정 (Container.ts)
```typescript
// 환경에 따라 자동으로 서비스 선택
if (config.ai.useMock) {
  this.register("openai", () => new MockAIService())
} else {
  this.register("openai", () => new OpenAI({ apiKey: config.ai.providers.openai }))
}
```

### 4. 배포 검증 도구
- `npm run validate:deploy` - 배포 전 환경 검증
- 필수 파일, 환경 변수, 보안 이슈 확인

## 배포 프로세스

### 1. 환경 준비
```bash
# 프로덕션 환경 설정 복사 및 수정
cp .env.production .env.local
# 실제 API 키와 데이터베이스 정보 입력
```

### 2. 배포 검증
```bash
npm run validate:deploy
```

### 3. 데이터베이스 초기화
```bash
npm run db:init:prod
```

### 4. 프로덕션 빌드
```bash
npm run build:prod
```

### 5. 서버 실행
```bash
# 직접 실행
npm run start:prod

# 또는 Docker 사용
docker-compose -f docker-compose.prod.yml up
```

## Docker 배포

### 테스트 환경
```bash
docker-compose -f docker-compose.test.yml up
```

### 프로덕션 환경
```bash
docker-compose -f docker-compose.prod.yml up
```

## 환경 변수 설정

### 필수 환경 변수
- `DATABASE_PROVIDER`: postgresql
- `DATABASE_URL`: PostgreSQL 연결 문자열
- `AUTH_SECRET`: 보안 키 (openssl rand -base64 32)
- `NEXTAUTH_URL`: 실제 도메인 URL
- `OPENAI_API_KEY`: OpenAI API 키

### 선택적 환경 변수
- `REDIS_URL`: Redis 연결 URL
- `AWS_*`: S3 설정 (파일 저장용)
- `SENDGRID_API_KEY`: 이메일 발송
- `TOSS_*`: 결제 시스템

## 주의사항

1. **환경 파일 관리**
   - `.env.local`은 절대 커밋하지 마세요
   - 실제 API 키는 별도로 안전하게 관리

2. **데이터베이스**
   - 프로덕션은 반드시 PostgreSQL 사용
   - 마이그레이션은 `npm run db:migrate:prod` 사용

3. **보안**
   - AUTH_SECRET은 반드시 강력한 랜덤 값 사용
   - HTTPS 환경에서만 운영

4. **모니터링**
   - Sentry DSN 설정으로 에러 추적
   - 로그 레벨 적절히 설정

## 문제 해결

### 데이터베이스 연결 실패
```bash
# PostgreSQL 서버 상태 확인
# DATABASE_URL 형식 확인
# 방화벽 설정 확인
```

### 빌드 실패
```bash
# TypeScript 오류 확인
npm run typecheck

# 의존성 설치 확인
npm install
```

### 환경 변수 누락
```bash
# 환경 설정 확인
npm run env:check

# 배포 검증
npm run validate:deploy
```