# Railway 배포 체크리스트 및 현황

## ✅ 프로젝트 현황 분석

### 1. **버전 요구사항**
- **Node.js**: 18.0.0+ ✅ (package.json에 명시)
- **npm**: 9.0.0+ ✅ (engines에 명시)
- **Next.js**: 14.2.30 ✅ (최신 버전)
- **React**: 18.2.0 ✅
- **Prisma**: 5.11.0 ✅

### 2. **Railway 공식 지원 사항**
- Next.js 14 지원 ✅
- Node.js 18-22 지원 ✅
- PostgreSQL 데이터베이스 ✅
- pgvector extension 지원 ✅

### 3. **현재 설정 파일**
- `railway.json` ✅
- `railway.toml` ✅ (nixpacksVersion 1.17.0 설정)
- `nixpacks.toml` ✅ (Python 3.10 명시)
- `package.json` engines 필드 ✅
- `.node-version` ✅
- `Procfile` ✅
- `app.json` ✅

### 4. **Python 오류 해결**
- Nixpacks Python 버전을 3.10으로 고정
- requirements.txt 추가 (빈 파일)
- nixpacks.toml에 providers = ["node"] 명시

## 🔧 Railway 환경 변수 설정 가이드

### 필수 환경 변수
```env
# 데이터베이스 (Railway PostgreSQL 추가 시 자동 설정)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# NextAuth
NEXTAUTH_URL=https://your-app.up.railway.app
NEXTAUTH_SECRET=your-secret-key  # openssl rand -base64 32

# 관리자 설정
ADMIN_EMAIL=leonfromwork@gmail.com

# AI (OpenRouter 권장)
OPENROUTER_API_KEY=sk-or-v1-your-key

# OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
KAKAO_CLIENT_ID=your-kakao-rest-api-key
KAKAO_CLIENT_SECRET=your-kakao-client-secret

# 빌드 설정
NIXPACKS_NODE_VERSION=18
NIXPACKS_PYTHON_VERSION=3.10
NODE_ENV=production

# 기능 플래그
ENABLE_PAYMENT_FEATURES=false
SKIP_EMAIL_VERIFICATION=true
NEXT_PUBLIC_DEMO_MODE=true
```

## 📋 배포 전 최종 체크리스트

### 1. **코드 준비**
- [x] TypeScript 오류 해결
- [x] 테스트 파일 제거
- [x] 빌드 테스트 통과
- [x] 환경 변수 문서화

### 2. **Railway 설정**
- [ ] PostgreSQL 서비스 추가
- [ ] 환경 변수 설정
- [ ] 도메인 생성
- [ ] pgvector extension 활성화

### 3. **OAuth 설정**
- [ ] Google Cloud Console에서 리다이렉트 URI 추가
  - `https://your-app.up.railway.app/api/auth/callback/google`
- [ ] Kakao Developers에서 리다이렉트 URI 추가
  - `https://your-app.up.railway.app/api/auth/callback/kakao`

### 4. **배포 후 확인**
- [ ] 헬스체크 엔드포인트 확인: `/api/health`
- [ ] OAuth 로그인 테스트
- [ ] 관리자 이메일로만 로그인 가능한지 확인

## 🚨 주의사항

1. **빌드 명령어 Override 필요 시**:
   ```bash
   npm install --legacy-peer-deps && npx prisma generate && npm run build
   ```

2. **pgvector 활성화**:
   Railway PostgreSQL 콘솔에서 실행:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

3. **첫 배포 후 마이그레이션**:
   ```bash
   railway run npx prisma migrate deploy
   ```

## 📊 의존성 분석

### 주요 의존성
- **AI**: OpenAI SDK, Anthropic SDK, Google Generative AI
- **Database**: Prisma + PostgreSQL
- **Auth**: NextAuth v5 (Beta)
- **UI**: Radix UI + Tailwind CSS
- **Excel**: ExcelJS + HyperFormula
- **Payment**: Stripe + TossPayments (비활성화됨)

### 잠재적 이슈
- `xlsx` 패키지가 CDN URL로 설치됨 (특수 케이스)
- NextAuth v5 베타 버전 사용 중
- 일부 패키지가 legacy peer deps 필요

## 🎯 배포 준비 완료

모든 설정이 완료되었습니다. Railway 대시보드에서:
1. 환경 변수 설정
2. PostgreSQL 추가
3. 필요 시 빌드 명령어 Override
4. 배포 시작

문제 발생 시 `/RAILWAY_MANUAL_SETUP.md` 참조