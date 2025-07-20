# PostgreSQL 데이터베이스 설정 가이드

## 개요
ExcelApp에서 PostgreSQL을 사용하기 위한 설정 가이드입니다.

## 옵션 1: Neon PostgreSQL (권장)

### 1. Neon 계정 생성 및 프로젝트 설정
1. [Neon](https://neon.tech) 방문하여 계정 생성
2. 새 프로젝트 생성 (excelapp 또는 원하는 이름)
3. 연결 문자열 복사

### 2. 환경 변수 설정
```bash
# .env 파일 업데이트
DATABASE_URL="postgresql://username:password@ep-xxx.region.neon.tech/neondb"
```

### 3. Prisma 마이그레이션 실행
```bash
npx prisma generate
npx prisma migrate deploy
```

## 옵션 2: Railway PostgreSQL

### 1. Railway 프로젝트 생성
1. [Railway](https://railway.app) 방문하여 계정 생성
2. 새 프로젝트 생성 후 PostgreSQL 추가
3. 연결 문자열 복사

### 2. 환경 변수 설정
```bash
# .env 파일 업데이트
DATABASE_URL="postgresql://postgres:password@host.railway.app:port/railway"
```

## 옵션 3: 로컬 PostgreSQL (개발용)

### 1. PostgreSQL 설치
```bash
# macOS (Homebrew)
brew install postgresql@15
brew services start postgresql@15

# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# Windows
# PostgreSQL 공식 사이트에서 인스톨러 다운로드
```

### 2. 데이터베이스 생성
```bash
# PostgreSQL 접속
psql postgres

# 데이터베이스 생성
CREATE DATABASE excelapp;
CREATE USER exceluser WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE excelapp TO exceluser;
```

### 3. 환경 변수 설정
```bash
# .env 파일 업데이트
DATABASE_URL="postgresql://exceluser:password@localhost:5432/excelapp"
```

## 마이그레이션 실행

데이터베이스 설정 완료 후:

```bash
# Prisma 클라이언트 생성
npx prisma generate

# 마이그레이션 실행
npx prisma migrate deploy

# (선택사항) 시드 데이터 추가
npm run db:seed
```

## 연결 확인

```bash
# 데이터베이스 연결 테스트
npx prisma studio
```

## 주의사항

1. **보안**: 프로덕션에서는 강력한 비밀번호 사용
2. **백업**: 정기적인 데이터베이스 백업 설정
3. **모니터링**: 데이터베이스 성능 모니터링 도구 설정
4. **환경 분리**: 개발/스테이징/프로덕션 환경별 별도 데이터베이스 사용

## 트러블슈팅

### 연결 오류
- 네트워크 연결 상태 확인
- 방화벽 설정 확인
- DATABASE_URL 형식 검증

### 마이그레이션 오류
```bash
# 마이그레이션 상태 확인
npx prisma migrate status

# 마이그레이션 재설정 (주의: 데이터 손실)
npx prisma migrate reset
```