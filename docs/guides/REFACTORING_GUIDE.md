# ExcelApp Refactoring Guide - 중복 코드 제거 및 시스템 최적화

## 1. 시스템 전체 Context 분석

### 1.1 현재 아키텍처 구조
- **Frontend**: Next.js 14 with App Router
- **Backend**: Next.js API Routes + Prisma ORM
- **Database**: PostgreSQL (via Prisma)
- **Authentication**: NextAuth + Custom Session Management
- **File Storage**: Local/S3/Azure (다중 provider 지원)
- **AI Integration**: OpenAI, Claude, Gemini, Llama (다중 provider)
- **Payment**: TossPayments SDK
- **Caching**: Redis (optional)

### 1.2 주요 의존성 관계
```
API Routes → Features → Infrastructure
     ↓           ↓            ↓
  Middleware   Common      External Services
     ↓           ↓            ↓
   Auth      Validation    Storage/AI
```

## 2. 안전한 리팩토링 전략

### 2.1 타입 정의 통합 (Phase 1 - Low Risk)

**변경 전**: 여러 파일에 중복된 interface 정의
**변경 후**: `/src/types/shared.ts`에 통합

```typescript
// 1. 모든 중복 타입을 shared.ts로 이동
// 2. 기존 파일에서는 import만 변경
import { AnalysisResult, IFileStorage, ITenantContext } from '@/types/shared'
```

**마이그레이션 순서**:
1. shared.ts 파일 생성 (완료)
2. 각 파일에서 import 경로만 변경
3. 기존 중복 정의 제거
4. 테스트 실행으로 검증

### 2.2 API Route 패턴 통합 (Phase 2 - Medium Risk)

**변경 전**: 각 API route에서 반복되는 auth/error 처리
**변경 후**: common-patterns.ts의 헬퍼 함수 사용

```typescript
// Before
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    // ... logic
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// After
import { withAuth, handleApiError } from '@/lib/utils/common-patterns'

export const GET = withAuth(async (req, session) => {
  // ... logic (session already validated)
})
```

### 2.3 파일 스토리지 인터페이스 통합 (Phase 3 - High Risk)

**현재 문제**: LocalFileStorage와 S3FileStorage가 다른 메서드명 사용
- LocalFileStorage: `uploadAsync`, `downloadAsync`
- S3FileStorage: `save`, `get`

**해결 방안**:
1. Adapter 패턴으로 기존 코드 유지하면서 새 인터페이스 도입
2. 점진적으로 마이그레이션

```typescript
// storage-adapter.ts
export class FileStorageAdapter implements IFileStorage {
  constructor(private storage: LocalFileStorage | S3FileStorage) {}
  
  async save(file: Buffer, key: string): Promise<string> {
    if ('uploadAsync' in this.storage) {
      // LocalFileStorage
      const result = await this.storage.uploadAsync(file, key)
      return result.isSuccess ? result.value : throw result.error
    }
    // S3FileStorage
    return this.storage.save(file, key)
  }
}
```

## 3. Node Modules 최적화 전략

### 3.1 의존성 분석
```bash
# 현재 주요 무거운 패키지들:
- @radix-ui/* (38개 패키지) - UI 컴포넌트
- AI SDKs (OpenAI, Anthropic, Google) - 각 10-20MB
- exceljs + hyperformula - Excel 처리
- @aws-sdk/client-s3 - AWS 연동
```

### 3.2 최적화 방법

#### A. Next.js Standalone 빌드 (완료)
```javascript
// next.config.mjs
output: 'standalone' // 자동으로 필요한 파일만 포함
```

#### B. 동적 임포트로 번들 크기 감소
```typescript
// AI Provider를 동적으로 로드
const loadAIProvider = async (provider: string) => {
  switch (provider) {
    case 'openai':
      const { OpenAIProvider } = await import('./providers/openai')
      return new OpenAIProvider()
    case 'claude':
      const { ClaudeProvider } = await import('./providers/claude')
      return new ClaudeProvider()
    // ...
  }
}
```

#### C. 프로덕션 전용 Dockerfile 최적화
```dockerfile
# Multi-stage build with production dependencies only
FROM node:18-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

## 4. 안전한 마이그레이션 체크리스트

### 4.1 변경 전 확인사항
- [ ] 모든 테스트 통과 확인
- [ ] 현재 배포 버전 백업
- [ ] 데이터베이스 백업
- [ ] 환경변수 확인

### 4.2 단계별 진행
1. **Phase 1**: 타입 정의 통합 (1-2일)
   - shared.ts 생성 ✓
   - import 경로 변경
   - 중복 제거
   - 테스트

2. **Phase 2**: 공통 패턴 적용 (3-5일)
   - common-patterns.ts 생성 ✓
   - API routes 하나씩 마이그레이션
   - 각 변경마다 테스트

3. **Phase 3**: 스토리지 인터페이스 통합 (1주일)
   - Adapter 생성
   - 기존 코드 유지하며 점진적 전환
   - 통합 테스트

### 4.3 위험 완화 전략
1. **Feature Flag 사용**
```typescript
const USE_NEW_STORAGE = process.env.USE_NEW_STORAGE === 'true'

const storage = USE_NEW_STORAGE 
  ? new FileStorageAdapter(oldStorage)
  : oldStorage
```

2. **점진적 롤아웃**
- 개발 환경에서 먼저 테스트
- 스테이징에서 1주일 운영
- 프로덕션은 부분적으로 적용

3. **모니터링 강화**
- 에러 로깅 강화
- 성능 메트릭 수집
- 사용자 피드백 채널 운영

## 5. 예상 효과

### 5.1 코드 품질 개선
- 중복 코드 70% 감소
- 유지보수성 향상
- 타입 안정성 강화

### 5.2 배포 최적화
- Docker 이미지 크기 50% 감소 (예상)
- 빌드 시간 30% 단축
- 메모리 사용량 감소

### 5.3 개발 생산성
- 새 기능 추가 시간 단축
- 버그 발생률 감소
- 온보딩 시간 단축

## 6. 롤백 계획

각 단계마다 롤백 가능하도록:
1. Git 태그로 버전 관리
2. 환경변수로 기능 토글
3. 데이터베이스 마이그레이션 롤백 스크립트 준비

```bash
# 롤백 명령어
git checkout v1.0.0-before-refactoring
npm install
npm run build
npm run deploy:production
```

## 7. 다음 단계

1. 이 가이드를 팀과 공유하고 피드백 수집
2. Phase 1부터 시작하여 단계적으로 진행
3. 각 단계 완료 후 성과 측정 및 문서화