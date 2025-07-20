# OAuth 설정 가이드

## 개요
ExcelApp은 구글과 카카오 OAuth를 통한 소셜 로그인을 지원합니다. 이 문서는 각 OAuth 제공자의 설정 방법을 안내합니다.

## 1. Google OAuth 설정

### Google Cloud Console 설정
1. [Google Cloud Console](https://console.cloud.google.com/)에 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. "API 및 서비스" > "사용자 인증 정보" 이동
4. "사용자 인증 정보 만들기" > "OAuth 클라이언트 ID" 선택

### OAuth 클라이언트 설정
1. 애플리케이션 유형: "웹 애플리케이션" 선택
2. 이름: "ExcelApp" (또는 원하는 이름)
3. 승인된 JavaScript 원본:
   - `http://localhost:3000` (개발)
   - `https://your-domain.com` (프로덕션)
4. 승인된 리디렉션 URI:
   - `http://localhost:3000/api/auth/callback/google` (개발)
   - `https://your-domain.com/api/auth/callback/google` (프로덕션)

### 환경 변수 설정
```bash
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

## 2. Kakao OAuth 설정

### Kakao Developers 설정
1. [Kakao Developers](https://developers.kakao.com/)에 접속
2. "내 애플리케이션" > "애플리케이션 추가하기"
3. 앱 이름: "ExcelApp" (또는 원하는 이름)
4. 사업자명: 회사명 또는 개인 이름

### 앱 설정
1. "앱 설정" > "플랫폼" > "Web 플랫폼 등록"
   - 사이트 도메인:
     - `http://localhost:3000` (개발)
     - `https://your-domain.com` (프로덕션)

2. "카카오 로그인" 활성화
   - Redirect URI 등록:
     - `http://localhost:3000/api/auth/callback/kakao` (개발)
     - `https://your-domain.com/api/auth/callback/kakao` (프로덕션)

3. "동의항목" 설정
   - 개인정보 > 닉네임 (필수)
   - 개인정보 > 카카오계정(이메일) (필수)

### 환경 변수 설정
```bash
KAKAO_CLIENT_ID="your-kakao-rest-api-key"
KAKAO_CLIENT_SECRET="your-kakao-client-secret"
```

## 3. NextAuth 설정 확인

### 필수 환경 변수
```bash
# NextAuth
NEXTAUTH_URL="http://localhost:3000" # 프로덕션에서는 실제 도메인으로 변경
NEXTAUTH_SECRET="your-secret-key" # openssl rand -base64 32로 생성

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Kakao OAuth
KAKAO_CLIENT_ID="your-kakao-client-id"
KAKAO_CLIENT_SECRET="your-kakao-client-secret"
```

## 4. 데이터베이스 마이그레이션

OAuth 로그인을 위해 User 테이블에 필드가 추가되었습니다:
```bash
npm run db:push
# 또는
npm run db:migrate
```

## 5. 테스트

### 개발 환경
1. `.env` 파일에 OAuth 키 설정
2. `npm run dev` 실행
3. `http://localhost:3000/auth/login` 접속
4. 구글/카카오 로그인 버튼 클릭하여 테스트

### 주의사항
- 개발 환경에서는 `http://localhost:3000` 사용
- 프로덕션 환경에서는 HTTPS 필수
- Redirect URI는 정확히 일치해야 함

## 6. 문제 해결

### "Invalid redirect_uri" 오류
- OAuth 제공자 콘솔에서 Redirect URI 확인
- `NEXTAUTH_URL` 환경 변수 확인

### "Client authentication failed" 오류
- Client ID와 Secret이 올바른지 확인
- 환경 변수가 제대로 로드되는지 확인

### 로그인 후 리다이렉트 실패
- NextAuth 콜백 설정 확인
- 세션 쿠키 설정 확인

## 7. 보안 주의사항

1. **API 키 관리**
   - 절대 코드에 직접 API 키를 포함하지 마세요
   - `.env` 파일은 `.gitignore`에 포함되어야 합니다

2. **프로덕션 설정**
   - HTTPS 사용 필수
   - `NEXTAUTH_SECRET`은 안전한 랜덤 문자열 사용
   - CORS 설정 확인

3. **사용자 데이터**
   - 최소한의 필수 정보만 요청
   - 개인정보 처리방침 명시
   - GDPR 등 규정 준수