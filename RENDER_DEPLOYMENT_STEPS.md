# Render.com 배포 단계별 가이드

## 🚀 즉시 배포 가능!

GitHub 저장소가 준비되었습니다. 다음 단계를 따라 배포하세요:

## 1. Render.com 대시보드 접속
1. https://dashboard.render.com 로그인
2. "New +" 버튼 클릭
3. "Web Service" 선택

## 2. GitHub 저장소 연결
- Repository: `LEONFROMWORK/excelapp`
- Branch: `main`
- 자동으로 `render.yaml` 파일을 감지합니다

## 3. 서비스 이름 설정
- Name: `exhell-app` (또는 원하는 이름)
- 이 이름이 URL의 일부가 됩니다: `https://exhell-app.onrender.com`

## 4. 환경 변수 설정 (Dashboard에서 직접 입력)

### 필수 환경 변수:
```bash
# NextAuth (필수)
NEXTAUTH_URL=https://exhell-app.onrender.com
NEXTAUTH_SECRET=[32자 이상 랜덤 문자열 생성]

# OpenAI (필수)
OPENAI_API_KEY=[OpenAI API 키]

# 기타 설정
SKIP_EMAIL_VERIFICATION=true
SIGNUP_BONUS_TOKENS=100
```

### 선택적 환경 변수 (나중에 추가 가능):
```bash
# AWS S3 (파일 저장용)
AWS_ACCESS_KEY_ID=[AWS 액세스 키]
AWS_SECRET_ACCESS_KEY=[AWS 시크릿 키]
AWS_REGION=ap-northeast-2
AWS_S3_BUCKET=[S3 버킷 이름]

# Google OAuth (로그인용)
GOOGLE_CLIENT_ID=[Google OAuth 클라이언트 ID]
GOOGLE_CLIENT_SECRET=[Google OAuth 시크릿]
```

## 5. 배포 시작
1. "Create Web Service" 클릭
2. 첫 배포는 10-15분 소요됩니다
3. 빌드 로그를 실시간으로 확인할 수 있습니다

## 6. PostgreSQL 데이터베이스 생성
1. Render Dashboard → "New +" → "PostgreSQL"
2. Name: `exhell-db`
3. Region: Oregon (웹 서비스와 동일)
4. "Create Database" 클릭
5. 생성 후 연결 문자열이 자동으로 웹 서비스에 연결됩니다

## 7. 배포 확인
배포 완료 후:
1. https://exhell-app.onrender.com 접속
2. 회원가입/로그인 테스트
3. 기본 기능 확인

## ⚠️ 주의사항
- 무료 플랜은 15분 동안 활동이 없으면 슬립 모드로 전환됩니다
- 첫 요청 시 30초 정도 소요될 수 있습니다
- 프로덕션 사용 시 유료 플랜 업그레이드 권장

## 🔧 문제 해결
- 502 Bad Gateway: 환경 변수 확인
- 빌드 실패: 로그 확인 및 Node.js 버전 확인
- 데이터베이스 연결 실패: DATABASE_URL 자동 설정 확인

## 📞 다음 단계
1. 커스텀 도메인 연결
2. AWS S3 설정 (대용량 파일 처리)
3. Google OAuth 설정 (소셜 로그인)
4. 모니터링 설정 (Sentry, Analytics)

---
배포 URL: https://exhell-app.onrender.com
GitHub: https://github.com/LEONFROMWORK/excelapp