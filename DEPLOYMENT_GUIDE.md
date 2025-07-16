# Exhell 배포 가이드 (Render.com)

## 🚀 빠른 시작

### 1. GitHub 저장소 연결
1. [Render.com](https://render.com) 로그인
2. "New" → "Web Service" 클릭
3. GitHub 저장소 연결 (LEONFROMWORK/excelapp)
4. 브랜치 선택: `main`

### 2. 서비스 설정
- **Name**: exhell-app
- **Region**: Oregon (미국 서부)
- **Branch**: main
- **Runtime**: Node
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

### 3. 환경 변수 설정

#### 필수 환경 변수:
```bash
# NextAuth
NEXTAUTH_URL=https://exhell-app.onrender.com
NEXTAUTH_SECRET=[32자 이상의 랜덤 문자열]

# OpenAI
OPENAI_API_KEY=[OpenAI API 키]

# 기타
NODE_ENV=production
APP_ENV=production
SKIP_EMAIL_VERIFICATION=true
SIGNUP_BONUS_TOKENS=100
```

### 4. PostgreSQL 데이터베이스 생성
1. "New" → "PostgreSQL" 클릭
2. Name: `exhell-db`
3. Region: Oregon
4. 생성 후 연결 문자열 복사

### 5. 데이터베이스 마이그레이션
로컬에서 실행:
```bash
# .env 파일에 프로덕션 DATABASE_URL 설정
DATABASE_URL="복사한_연결_문자열" npx prisma migrate deploy
```

## 📋 상세 설정

### AWS S3 설정 (파일 저장용)
1. AWS Console에서 S3 버킷 생성
2. 버킷 이름: `exhell-files-prod`
3. 리전: `ap-northeast-2` (서울)
4. IAM 사용자 생성 및 권한 부여
5. 환경 변수 추가:
   ```bash
   AWS_ACCESS_KEY_ID=[액세스 키]
   AWS_SECRET_ACCESS_KEY=[시크릿 키]
   AWS_REGION=ap-northeast-2
   AWS_S3_BUCKET=exhell-files-prod
   ```

### 커스텀 도메인 설정
1. Render Dashboard → Settings → Custom Domains
2. 도메인 추가 (예: exhell.com)
3. DNS 설정:
   - Type: CNAME
   - Name: @
   - Value: [제공된 Render URL]

### 성능 최적화
- 초기: Free 플랜으로 시작
- 트래픽 증가 시: Standard ($7/월) 또는 Pro ($25/월)로 업그레이드

## 🔍 배포 확인

### 1. 헬스 체크
```bash
curl https://exhell-app.onrender.com/api/health
```

### 2. 기능 테스트
- [ ] 회원가입/로그인
- [ ] 파일 업로드
- [ ] AI 분석
- [ ] 파일 다운로드

### 3. 로그 확인
Render Dashboard → Logs에서 실시간 로그 확인

## 🚨 문제 해결

### Build 실패
- Node.js 버전 확인 (18 이상)
- package-lock.json 삭제 후 재시도

### 502 Bad Gateway
- 환경 변수 확인
- 데이터베이스 연결 확인
- 빌드 로그 확인

### 파일 업로드 실패
- AWS S3 권한 확인
- CORS 설정 확인

## 📞 지원
- Render 상태: https://status.render.com
- 문서: https://render.com/docs