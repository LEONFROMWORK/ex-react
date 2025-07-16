# Excel App 빠른 시작 가이드

## 🚀 서버 시작

```bash
npm run dev
```

## 🧪 테스트 실행

서버가 시작되면 다음 URL 중 하나를 열어보세요:

### 1. 인터랙티브 테스트 페이지
http://localhost:3000/test

### 2. 자동 테스트 러너
http://localhost:3000/test-runner.html

## ✅ 확인 사항

- ✅ Redis 연결 오류 해결 (메모리 캐시 사용)
- ✅ Prisma SQLite 설정 완료
- ✅ Mock AI 서비스 활성화
- ✅ 인증 우회 모드 (테스트용)

## 🔍 API 엔드포인트

- Health Check: http://localhost:3000/api/health
- Cache Stats: http://localhost:3000/api/cache/stats
- Excel Generate: http://localhost:3000/api/excel/generate

## 🛠️ 문제 해결

### Prisma 오류 시
```bash
npx prisma generate
npx prisma db push
```

### 포트 충돌 시
```bash
lsof -i :3000
kill -9 [PID]
```

## 📌 현재 상태

모든 서비스가 로컬 환경에서 실행되도록 구성되었습니다:
- 데이터베이스: SQLite (파일 기반)
- 캐시: 메모리 (Redis 불필요)
- AI: Mock 서비스 (API 키 불필요)
- 파일 저장소: 로컬 디렉토리