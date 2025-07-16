# 회원가입 500 오류 최종 해결 방법

## 문제 원인
데이터베이스가 존재하지 않아서 Prisma 쿼리가 실패하고 있습니다.

## 즉시 해결 방법

### 1. 데이터베이스 초기화 (터미널에서 실행)
```bash
node init-db.js
```

이 명령어가 다음 작업을 수행합니다:
- Prisma 클라이언트 생성
- SQLite 데이터베이스 파일 생성 (prisma/dev.db)
- 스키마 적용

### 2. 서버 재시작
```bash
npm run dev
```

### 3. 회원가입 테스트
1. http://localhost:3000/auth/signup 접속
2. 테스트 정보 입력
3. 회원가입 버튼 클릭

## 성공 확인 방법

서버 콘솔에서 다음과 같은 메시지를 확인:
```
Signup API called
Request body: { name: '...', email: '...', password: '...', referralCode: '' }
Validation passed
Password hashed
User created successfully: [user-id]
📧 이메일 발송 완료
📧 Mock Email Service
To: [이름] <[이메일]>
Verification Token: [토큰]
Verification URL: http://localhost:3000/auth/verify-email?token=[토큰]
```

## 추가 확인사항

### 데이터베이스 파일 확인
```bash
ls -la prisma/dev.db
```

파일이 존재하고 크기가 0보다 커야 합니다.

### Prisma Studio로 데이터 확인 (선택사항)
```bash
npx prisma studio
```
브라우저에서 http://localhost:5555 접속하여 User 테이블 확인

## 문제가 지속될 경우

1. **완전 초기화**:
   ```bash
   rm -f prisma/dev.db prisma/dev.db-journal
   node init-db.js
   ```

2. **환경 변수 확인**:
   `.env.local` 파일에 다음 설정 확인:
   ```
   DATABASE_URL="file:./dev.db"
   ```

3. **서버 콘솔 오류 확인**:
   "Signup error details:" 메시지 아래의 상세 오류 확인