# 회원가입 500 오류 해결 가이드

## 오류 원인
회원가입 API에서 500 오류가 발생하는 주요 원인:
1. Prisma 데이터베이스가 제대로 초기화되지 않음
2. ReferralLog 관련 코드가 있지만 데이터베이스에 테이블이 없을 수 있음

## 해결 방법

### 1. 데이터베이스 초기화
```bash
# 데이터베이스 초기화 스크립트 실행
node reset-db.js
```

또는 수동으로:
```bash
# 1. 기존 데이터베이스 삭제
rm prisma/dev.db
rm prisma/dev.db-journal

# 2. Prisma 클라이언트 재생성
npx prisma generate

# 3. 데이터베이스 생성
npx prisma db push
```

### 2. 서버 재시작
```bash
npm run dev
```

### 3. 회원가입 테스트
1. http://localhost:3000/auth/signup 접속
2. 테스트 정보 입력:
   - 이름: 테스트
   - 이메일: test@example.com
   - 비밀번호: 123456
3. 회원가입 클릭

## 수정된 내용
- signup API 간소화 (ReferralLog 생성 제거)
- 에러 메시지 개선 (개발 환경에서 상세 오류 표시)
- 이메일 인증 토큰을 User 테이블에 직접 저장

## 성공 시 콘솔 출력
```
📧 이메일 발송 완료
📧 Mock Email Service
To: 테스트 <test@example.com>
Verification Token: [토큰]
Verification URL: http://localhost:3000/auth/verify-email?token=[토큰]
```

## 추가 디버깅
서버 콘솔에서 오류 메시지를 확인하세요. 
"Signup error details:" 로 시작하는 상세 오류가 표시됩니다.