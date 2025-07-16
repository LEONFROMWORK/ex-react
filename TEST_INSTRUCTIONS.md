# Excel App 테스트 실행 가이드

## 🚀 빠른 시작

### 1. 서버 시작
```bash
npm run dev
```

### 2. 테스트 페이지 접속
다음 중 하나를 선택하세요:

#### 옵션 A: 인터랙티브 테스트 페이지
- 브라우저에서 열기: http://localhost:3000/test
- 버튼을 클릭하여 각 기능을 테스트

#### 옵션 B: 자동 테스트 러너
- 브라우저에서 열기: http://localhost:3000/test-runner.html
- 페이지가 자동으로 모든 테스트를 실행

## 📋 테스트 항목

### 1. 서버 상태 확인
- **엔드포인트**: `/api/health`
- **확인사항**: 
  - Database 연결 상태
  - Redis 연결 상태 (비활성화 시 메모리 캐시 사용)
  - 전반적인 서비스 상태

### 2. Excel 생성 (AI 프롬프트)
- **엔드포인트**: `/api/excel/generate`
- **기능**: AI를 사용하여 프롬프트 기반 Excel 파일 생성
- **참고**: Mock AI 모드에서는 샘플 데이터 생성

### 3. 템플릿 목록 조회
- **엔드포인트**: `/api/templates`
- **기능**: 사용 가능한 Excel 템플릿 목록 조회

### 4. 캐시 통계
- **엔드포인트**: `/api/cache/stats`
- **기능**: 캐시 히트/미스 통계 확인

## 🔧 문제 해결

### Prisma 오류 발생 시
```bash
# Prisma 클라이언트 재생성
npx prisma generate

# 데이터베이스 생성 (처음 실행 시)
npx prisma db push
```

### 포트 충돌 시
```bash
# 3000번 포트 사용 중인 프로세스 확인
lsof -i :3000

# 프로세스 종료
kill -9 [PID]
```

### 환경 변수 확인
`.env.local` 파일이 다음 설정을 포함하는지 확인:
```
DATABASE_URL="file:./dev.db"
USE_MOCK_AI="true"
DISABLE_REDIS="true"
MOCK_AUTH_ENABLED="true"
```

## 📊 현재 상태

- ✅ SQLite 데이터베이스 (PostgreSQL 대체)
- ✅ 메모리 캐시 (Redis 대체)
- ✅ Mock AI 서비스 (API 키 불필요)
- ✅ 인증 우회 모드 (테스트용)

## 🎯 다음 단계

1. 서버가 정상 작동하면 `/test` 페이지에서 각 기능 테스트
2. 실제 데이터로 Excel 생성 테스트
3. VBA 추출 기능 테스트
4. 실시간 진행률 업데이트 확인