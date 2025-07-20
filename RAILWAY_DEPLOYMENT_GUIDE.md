# Railway 배포 가이드 - ExcelApp

## 📋 배포 전 체크리스트

### 1. 로컬에서 확인
- [ ] 모든 코드가 Git에 커밋되었는지 확인
- [ ] `.env.example` 파일에 필요한 환경 변수가 모두 포함되어 있는지 확인
- [ ] 빌드가 성공적으로 실행되는지 확인: `npm run build`
- [ ] 타입 체크 통과: `npm run typecheck`

### 2. Railway 프로젝트 설정

#### Railway 계정 생성
1. [Railway.app](https://railway.app) 방문
2. GitHub 계정으로 로그인

#### 프로젝트 생성
1. Dashboard에서 "New Project" 클릭
2. "Deploy from GitHub repo" 선택
3. ExcelApp 리포지토리 선택

### 3. PostgreSQL 데이터베이스 추가
1. 프로젝트 대시보드에서 "New Service" 클릭
2. "Database" → "Add PostgreSQL" 선택
3. DATABASE_URL이 자동으로 설정됨

### 4. 환경 변수 설정

Railway 프로젝트 설정 → Variables에서 다음 환경 변수 추가:

```bash
# 자동 생성됨
DATABASE_URL=${{ Postgres.DATABASE_URL }}
NEXTAUTH_URL=${{ RAILWAY_PUBLIC_DOMAIN }}

# 필수 설정
NEXTAUTH_SECRET=your-32-character-secret-key-here
OPENROUTER_API_KEY=sk-or-v1-your-openrouter-api-key
NODE_ENV=production

# 선택 사항
NEXT_PUBLIC_DEMO_MODE=false
SKIP_EMAIL_VERIFICATION=false
SIGNUP_BONUS_TOKENS=100
```

#### NEXTAUTH_SECRET 생성 방법:
```bash
openssl rand -base64 32
```

### 5. 배포 실행

#### CLI를 통한 배포 (권장)
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

#### GitHub 자동 배포
1. main 브랜치에 푸시하면 자동 배포
2. PR 생성 시 Preview 환경 자동 생성

### 6. 배포 확인

#### 헬스체크
```bash
curl https://your-app.railway.app/api/health
```

예상 응답:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "production",
  "database": "connected",
  "env_vars": "configured",
  "version": "1.0.0"
}
```

#### 주요 기능 테스트
1. 홈페이지 접속 확인
2. 로그인/회원가입 테스트
3. Excel 파일 업로드 테스트
4. AI 분석 기능 테스트

### 7. 모니터링

#### Railway 대시보드
- 배포 상태 확인
- 실시간 로그 확인
- 리소스 사용량 모니터링

#### 로그 확인
```bash
railway logs
```

### 8. 트러블슈팅

#### 빌드 실패
- 환경 변수 확인
- package.json의 build 스크립트 확인
- Node.js 버전 확인 (18.x 이상)

#### 데이터베이스 연결 오류
- DATABASE_URL 환경 변수 확인
- Prisma 마이그레이션 상태 확인
- PostgreSQL 서비스 상태 확인

#### AI 서비스 오류
- OPENROUTER_API_KEY 확인
- API 키 권한 확인
- 사용량 한도 확인

### 9. 성능 최적화

#### 스케일링 설정 (railway.toml)
```toml
[scaling]
minReplicas = 1
maxReplicas = 10
targetCPUUtilization = 70
targetMemoryUtilization = 80
```

#### 리소스 제한 (railway.toml)
```toml
[runtime]
memoryLimit = "2GB"
cpuLimit = "2vCPU"
```

### 10. 보안 체크리스트

- [ ] 모든 시크릿이 환경 변수로 설정됨
- [ ] HTTPS가 활성화됨 (Railway 자동 제공)
- [ ] 프로덕션 모드로 실행 중
- [ ] 민감한 정보가 로그에 노출되지 않음

## 🚀 배포 명령어 요약

```bash
# 1. Railway CLI 설치
npm install -g @railway/cli

# 2. 로그인 및 프로젝트 연결
railway login
railway link

# 3. 환경 변수 설정 (Railway 웹 콘솔에서)

# 4. 배포
railway up

# 5. 로그 확인
railway logs

# 6. 앱 열기
railway open
```

## 📞 지원

문제가 발생하면:
1. Railway 공식 문서: https://docs.railway.app
2. Railway Discord: https://discord.gg/railway
3. ExcelApp 이슈 트래커: GitHub Issues