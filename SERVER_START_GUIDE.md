# 🚀 서버 실행 가이드

## 빠른 시작

터미널에서 다음 명령어를 실행하세요:

```bash
npm run dev
```

## 상세 실행 방법

### 1. 프로젝트 디렉토리로 이동
```bash
cd /Users/kevin/excelapp
```

### 2. 의존성 설치 (처음 실행 시)
```bash
npm install
```

### 3. 개발 서버 시작
```bash
npm run dev
```

서버가 시작되면 브라우저에서 http://localhost:3000 으로 접속할 수 있습니다.

## 환경 설정

`.env.local` 파일이 생성되었습니다. 필요한 경우 다음 값들을 업데이트하세요:

- `ANTHROPIC_API_KEY`: Anthropic API 키
- `DATABASE_URL`: PostgreSQL 연결 문자열
- `REDIS_URL`: Redis 연결 문자열

## 문제 해결

### 포트 3000이 이미 사용 중인 경우
```bash
# 다른 포트로 실행
PORT=3001 npm run dev
```

### node_modules 관련 오류
```bash
rm -rf node_modules package-lock.json
npm install
```

### TypeScript 오류
```bash
npm run typecheck
```

## 서버 중지

`Ctrl + C`를 눌러 서버를 중지할 수 있습니다.

## 프로덕션 빌드

```bash
npm run build
npm start
```