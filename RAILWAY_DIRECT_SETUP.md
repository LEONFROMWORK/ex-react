# Railway 직접 설정 가이드

## 1. Railway 대시보드 접속
https://railway.app/project/a35b2fd3-c70b-487d-b8e2-fe38a966f0d1

## 2. 서비스 찾기
- 왼쪽 사이드바에서 서비스 아이콘 클릭
- 만약 서비스가 없다면 "New Service" → "GitHub Repo" 선택

## 3. Settings 탭으로 이동
- 서비스를 클릭한 후 상단의 "Settings" 탭 클릭

## 4. Build & Deploy 섹션에서 설정
다음 항목들을 찾아서 설정:

### Build Command (Override 필요)
```bash
npm install --legacy-peer-deps && npx prisma generate && npm run build
```

### Start Command
```bash
npm start
```

### Root Directory
```
/
```

### Watch Paths
```
package.json
package-lock.json
```

## 5. Variables 탭으로 이동
다음 환경 변수들을 추가 (Raw Editor 사용 가능):

```env
# 빌드 설정 (필수)
NIXPACKS_NODE_VERSION=18
NIXPACKS_PYTHON_VERSION=3.10
NODE_ENV=production

# 데이터베이스 (PostgreSQL 추가 시 자동)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# NextAuth (필수)
NEXTAUTH_URL=https://your-app.railway.app
NEXTAUTH_SECRET=your-secret-key-here

# 관리자 설정 (필수)
ADMIN_EMAIL=leonfromwork@gmail.com

# AI (필수 - 최소 하나)
OPENROUTER_API_KEY=sk-or-v1-your-key

# OAuth (필수)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-secret
KAKAO_CLIENT_ID=your-kakao-rest-api-key
KAKAO_CLIENT_SECRET=your-kakao-secret

# 기능 플래그
ENABLE_PAYMENT_FEATURES=false
SKIP_EMAIL_VERIFICATION=true
NEXT_PUBLIC_DEMO_MODE=true
```

## 6. PostgreSQL 추가 (아직 없다면)
1. 메인 프로젝트 페이지로 돌아가기
2. "New" 버튼 클릭
3. "Database" → "Add PostgreSQL" 선택
4. DATABASE_URL이 자동으로 연결됨

## 7. 재배포
1. Deployments 탭으로 이동
2. 최신 배포 옆의 세 점(...) 클릭
3. "Redeploy" 선택

## 8. 로그 확인
- Deployments 탭에서 진행 중인 배포 클릭
- 실시간 로그 확인
- "Build Logs" 탭에서 빌드 과정 확인

## 문제 해결

### Python 오류가 계속 발생하는 경우:
Settings → General에서:
- "Override Build Command" 체크
- 위의 Build Command 입력

### npm ci 오류가 발생하는 경우:
Build Command를 다음으로 변경:
```bash
rm -rf node_modules package-lock.json && npm install --legacy-peer-deps && npx prisma generate && npm run build
```

### 환경 변수 오류:
- 모든 필수 환경 변수가 설정되었는지 확인
- 특히 NEXTAUTH_SECRET과 OAuth 키들

## 배포 성공 후
1. 제공된 도메인으로 접속
2. `/api/health` 엔드포인트 확인
3. OAuth 로그인 테스트