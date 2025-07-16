# Excel App 테스트 가이드

## 🚀 테스트 전 준비사항

### 1. 환경 변수 설정
`.env.local` 파일에 다음 변수들이 설정되어 있는지 확인하세요:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/excelapp"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# AI Service (OpenAI 또는 다른 LLM)
OPENAI_API_KEY=your-api-key

# Storage
STORAGE_TYPE=local
STORAGE_PATH=./uploads

# WebSocket
SOCKET_PORT=3001
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001

# Python
PYTHON_PATH=python3
```

### 2. 의존성 설치

```bash
# Node.js 패키지
npm install

# Python 패키지 (VBA 추출용)
pip install oletools

# Redis 서버 시작 (Mac)
brew services start redis

# PostgreSQL 시작 (Mac)
brew services start postgresql
```

### 3. 데이터베이스 설정

```bash
# Prisma 마이그레이션
npx prisma migrate dev
npx prisma generate
```

## 📋 테스트 시나리오

### 시나리오 1: Excel 생성 (AI 프롬프트)

1. **페이지 접속**: http://localhost:3000/excel/dashboard

2. **테스트 프롬프트 입력**:
   ```
   "2024년 월별 매출 데이터를 만들어줘. 
   제품별(A, B, C) 매출액과 전월 대비 성장률을 포함해줘."
   ```

3. **기대 결과**:
   - 실시간 진행률 표시
   - Excel 파일 생성 완료
   - 미리보기에서 데이터 확인

### 시나리오 2: 템플릿 기반 생성

1. **템플릿 선택**: "월간 재무 보고서"

2. **데이터 입력**:
   ```json
   {
     "year": 2024,
     "month": "1월",
     "revenue": 5000000,
     "expenses": 3000000
   }
   ```

3. **기대 결과**:
   - 템플릿에 데이터 채워짐
   - 자동 계산 수식 적용

### 시나리오 3: VBA 코드 추출

1. **페이지 접속**: http://localhost:3000/vba/extract

2. **테스트 파일**: VBA가 포함된 .xlsm 파일 업로드

3. **기대 결과**:
   - VBA 모듈 목록 표시
   - 코드 하이라이팅
   - 보안 스캔 결과

### 시나리오 4: 캐시 성능 확인

1. **관리자 페이지**: http://localhost:3000/admin/cache

2. **캐시 워밍 실행**:
   - "캐시 워밍 시작" 버튼 클릭
   - 진행률 모니터링

3. **동일 요청 재실행**:
   - 시나리오 1의 프롬프트 재입력
   - 캐시 히트율 확인

### 시나리오 5: 스트리밍 처리

1. **대용량 데이터 생성**:
   ```
   "10000개 행의 거래 데이터를 생성해줘. 
   날짜, 거래ID, 금액, 상태를 포함해줘."
   ```

2. **기대 결과**:
   - 메모리 사용량 모니터링
   - 청크 단위 처리 진행률

### 시나리오 6: 오류 처리

1. **잘못된 프롬프트 테스트**:
   ```
   "aaa"  (너무 짧은 프롬프트)
   ```

2. **기대 결과**:
   - 사용자 친화적 오류 메시지
   - 권장 조치 안내

### 시나리오 7: Before/After 비교

1. **원본 Excel 업로드**

2. **수정 요청**:
   ```
   "이 데이터에 누적 합계와 평균을 추가해줘"
   ```

3. **기대 결과**:
   - 나란히 비교 뷰
   - 변경된 셀 하이라이트
   - 슬라이더로 비교

## 🧪 테스트 명령어

### 단위 테스트
```bash
# 모든 테스트 실행
npm test

# 특정 기능 테스트
npm test -- --testPathPattern=ExcelGeneration
npm test -- --testPathPattern=VBAProcessing
```

### E2E 테스트
```bash
# Cypress 실행
npm run cypress:open

# Headless 모드
npm run cypress:run
```

### 성능 테스트
```bash
# 부하 테스트 (k6 사용)
k6 run tests/load/excel-generation.js

# 메모리 프로파일링
node --inspect npm run dev
# Chrome DevTools에서 Memory 탭 확인
```

## 🐛 디버깅 팁

### 1. 로그 확인
```bash
# 서버 로그
tail -f logs/server.log

# Redis 모니터링
redis-cli monitor

# WebSocket 이벤트
# 브라우저 콘솔에서: localStorage.debug = 'socket.io-client:socket'
```

### 2. 일반적인 문제 해결

**Redis 연결 실패**
```bash
# Redis 상태 확인
redis-cli ping

# Redis 재시작
brew services restart redis
```

**Python/oletools 오류**
```bash
# Python 경로 확인
which python3

# oletools 재설치
pip uninstall oletools
pip install oletools
```

**WebSocket 연결 안됨**
```bash
# Socket 서버 별도 실행
node socket-server.js

# 포트 확인
lsof -i :3001
```

## 📊 테스트 체크리스트

- [ ] Excel 생성 (프롬프트)
- [ ] Excel 생성 (템플릿)
- [ ] VBA 추출
- [ ] VBA 분석
- [ ] 캐시 히트/미스
- [ ] 캐시 워밍
- [ ] 스트리밍 처리
- [ ] WebSocket 실시간 업데이트
- [ ] 오류 처리
- [ ] Before/After 비교
- [ ] 메모리 누수 체크
- [ ] 동시 요청 처리

## 🎯 성능 목표

- Excel 생성: < 5초 (1000행 기준)
- VBA 추출: < 3초 (10MB 파일)
- 캐시 히트율: > 80%
- 메모리 사용: < 500MB
- 동시 사용자: 100명 이상

## 💡 테스트 데이터

`/tests/fixtures/` 폴더에 테스트용 파일들이 있습니다:
- `sample.xlsx` - 기본 Excel 파일
- `sample-vba.xlsm` - VBA 포함 파일
- `large-data.csv` - 대용량 데이터
- `test-prompts.json` - 테스트 프롬프트 모음