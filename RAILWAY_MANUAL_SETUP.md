# Railway 수동 설정 가이드

Python 빌드 오류가 계속 발생하는 경우, Railway 대시보드에서 다음과 같이 수동으로 설정하세요:

## 1. Railway 대시보드 접속
https://railway.app/dashboard

## 2. 프로젝트 Settings 탭으로 이동

## 3. Build & Deploy 섹션에서 다음 설정:

### Build Command (Override):
```bash
npm install --legacy-peer-deps && npx prisma generate && npm run build
```

### Start Command (Override):
```bash
npm start
```

### Watch Paths:
```
package.json
package-lock.json
```

## 4. Environment Variables 탭에서 다음 추가:

```
NIXPACKS_NODE_VERSION=18
NIXPACKS_PROVIDERS=node
NODE_ENV=production

# 필수 환경 변수
DATABASE_URL=${{Postgres.DATABASE_URL}}
NEXTAUTH_URL=https://your-app.up.railway.app
NEXTAUTH_SECRET=your-generated-secret
ADMIN_EMAIL=leonfromwork@gmail.com
OPENROUTER_API_KEY=sk-or-v1-your-key

# OAuth
GOOGLE_CLIENT_ID=your-google-id
GOOGLE_CLIENT_SECRET=your-google-secret
KAKAO_CLIENT_ID=your-kakao-id
KAKAO_CLIENT_SECRET=your-kakao-secret

# 기능 플래그
ENABLE_PAYMENT_FEATURES=false
SKIP_EMAIL_VERIFICATION=true
NEXT_PUBLIC_DEMO_MODE=true
```

## 5. PostgreSQL 추가
- New → Database → Add PostgreSQL
- DATABASE_URL이 자동으로 연결됩니다

## 6. 재배포
- Deployments 탭에서 최신 커밋 선택
- "Redeploy" 클릭

## 7. 도메인 설정
- Settings → Networking
- Generate Domain 클릭
- NEXTAUTH_URL을 생성된 도메인으로 업데이트

이렇게 설정하면 Railway가 Node.js 프로젝트로 올바르게 인식하고 배포됩니다.