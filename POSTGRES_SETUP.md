# PostgreSQL 설정 가이드

## 🚀 빠른 시작

### macOS에서 PostgreSQL 설치

```bash
# Homebrew로 설치
brew install postgresql@15
brew services start postgresql@15

# 테스트 데이터베이스 생성
createdb exhell_test

# 마이그레이션 실행
npm run db:migrate:test
```

### 대안: Postgres.app 사용

1. https://postgresapp.com/ 에서 다운로드
2. 앱 실행 후 "Initialize" 클릭
3. 터미널에서 테스트 DB 생성:
   ```bash
   /Applications/Postgres.app/Contents/Versions/latest/bin/createdb exhell_test
   ```

### 서버 실행

```bash
# 테스트 환경으로 서버 실행
npm run dev:test
```

## 📋 환경 변수 설정

`.env.local` 파일에서 DATABASE_URL 확인:
```
DATABASE_URL="postgresql://kevin@localhost:5432/exhell_test"
```

## 🔍 문제 해결

### PostgreSQL이 설치되지 않은 경우
위의 설치 가이드를 따라 PostgreSQL을 먼저 설치하세요.

### 연결 오류가 발생하는 경우
1. PostgreSQL 서비스가 실행 중인지 확인:
   ```bash
   brew services list
   ```

2. 데이터베이스가 존재하는지 확인:
   ```bash
   psql -l
   ```

### 권한 오류가 발생하는 경우
현재 사용자명으로 DATABASE_URL 수정:
```
DATABASE_URL="postgresql://[사용자명]@localhost:5432/exhell_test"
```