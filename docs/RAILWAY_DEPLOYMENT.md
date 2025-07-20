# Railway 배포 가이드

## 개요
ExcelApp을 Railway 플랫폼에 배포하기 위한 완전한 가이드입니다.

## 1. Railway 프로젝트 설정

### 1.1 Railway 계정 생성 및 프로젝트 생성
1. [Railway](https://railway.app) 방문하여 GitHub로 로그인
2. "New Project" 클릭
3. GitHub 리포지토리 연결 또는 "Empty Project" 선택

### 1.2 PostgreSQL 데이터베이스 추가
1. 프로젝트 대시보드에서 "Add Service" 클릭
2. "Database" → "PostgreSQL" 선택
3. 자동으로 DATABASE_URL 환경 변수가 생성됨

## 2. 환경 변수 설정

Railway 프로젝트 설정에서 다음 환경 변수들을 추가:

```bash
# 자동 생성됨
DATABASE_URL=${{ Postgres.DATABASE_URL }}
NEXTAUTH_URL=${{ RAILWAY_PUBLIC_DOMAIN }}

# 직접 설정 필요
NEXTAUTH_SECRET=your-nextauth-secret-key
OPENROUTER_API_KEY=your-openrouter-api-key
OPENAI_API_KEY=your-openai-api-key
NODE_ENV=production
```

### 2.1 시크릿 관리
민감한 정보는 Railway의 Variables 섹션에서 설정:
- `NEXTAUTH_SECRET`: 32자 이상의 랜덤 문자열
- `OPENROUTER_API_KEY`: OpenRouter API 키
- `OPENAI_API_KEY`: OpenAI API 키

## 3. 배포 설정

### 3.1 railway.toml 설정
이미 구성되어 있는 `railway.toml` 파일:

```toml
[build]
buildCommand = "npx prisma generate && npx prisma migrate deploy && npm run build"
watchPatterns = ["src/**", "package.json", "prisma/schema.prisma"]

[deploy]
startCommand = "npm start"
healthcheckPath = "/api/health"
healthcheckTimeout = 300
```

### 3.2 빌드 프로세스
1. Prisma 클라이언트 생성
2. 데이터베이스 마이그레이션 실행
3. Next.js 앱 빌드
4. 프로덕션 서버 시작

## 4. 배포 실행

### 4.1 Railway CLI를 통한 배포
```bash
# Railway CLI 설치
npm install -g @railway/cli

# 로그인
railway login

# 프로젝트 연결
railway link

# 배포
railway up
```

### 4.2 GitHub 연동 자동 배포
1. Railway 프로젝트에서 GitHub 리포지토리 연결
2. main 브랜치 푸시 시 자동 배포
3. PR 생성 시 자동 Preview 환경 생성

## 5. 데이터베이스 마이그레이션

### 5.1 초기 마이그레이션
```bash
# 로컬에서 마이그레이션 생성
npx prisma migrate dev --name init

# Railway에서 자동 실행됨 (railway.toml 설정)
npx prisma migrate deploy
```

### 5.2 스키마 변경 시
```bash
# 새 마이그레이션 생성
npx prisma migrate dev --name your-migration-name

# Git에 커밋 후 푸시 (자동 배포)
git add .
git commit -m "Add new migration"
git push origin main
```

## 6. 모니터링 및 로그

### 6.1 Railway 대시보드
- 서비스 상태 모니터링
- 실시간 로그 확인
- 메트릭 및 사용량 추적

### 6.2 헬스체크
- URL: `https://your-app.railway.app/api/health`
- 자동 모니터링 및 재시작 설정

## 7. 커스텀 도메인 설정

### 7.1 도메인 연결
1. Railway 프로젝트 설정에서 "Domains" 클릭
2. 커스텀 도메인 추가
3. DNS 설정 업데이트

### 7.2 HTTPS 설정
- Railway에서 자동으로 SSL 인증서 제공
- Let's Encrypt 자동 갱신

## 8. 성능 최적화

### 8.1 스케일링 설정
```toml
[scaling]
minReplicas = 1
maxReplicas = 10
targetCPUUtilization = 70
targetMemoryUtilization = 80
```

### 8.2 리소스 제한
```toml
[runtime]
memoryLimit = "2GB"
cpuLimit = "2vCPU"
```

## 9. 백업 및 복구

### 9.1 데이터베이스 백업
- Railway PostgreSQL은 자동 백업 제공
- 수동 백업: `pg_dump` 명령어 사용

### 9.2 롤백 프로세스
```bash
# 이전 배포로 롤백
railway rollback

# 특정 버전으로 롤백
railway rollback --version <version-id>
```

## 10. 비용 관리

### 10.1 요금제
- Developer 플랜: $5/월 (500시간 실행시간)
- Team 플랜: $20/월 (무제한 실행시간)

### 10.2 비용 최적화
- 불필요한 서비스 정리
- 스케일링 설정 최적화
- 데이터베이스 연결 풀 관리

## 트러블슈팅

### 자주 발생하는 문제
1. **빌드 실패**: 환경 변수 확인
2. **데이터베이스 연결 오류**: DATABASE_URL 확인
3. **메모리 부족**: 리소스 제한 증가

### 로그 확인
```bash
# Railway CLI로 로그 확인
railway logs
```

## 추가 리소스
- [Railway 공식 문서](https://docs.railway.app)
- [Next.js Railway 배포 가이드](https://docs.railway.app/deploy/nextjs)
- [PostgreSQL Railway 가이드](https://docs.railway.app/databases/postgresql)