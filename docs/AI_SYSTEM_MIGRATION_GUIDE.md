# AI 시스템 마이그레이션 가이드

## 개요
ExcelApp-Rails에서 영감을 받은 새로운 AI 시스템으로의 마이그레이션 가이드입니다.

## 주요 변경사항

### 1. 모델 선택 방식
**이전:**
```typescript
const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
const response = await openai.chat.completions.create({
  model,
  messages: [{ role: 'user', content: prompt }]
});
```

**현재:**
```typescript
import { aiHelpers } from '@/lib/ai';

const result = await aiHelpers.analyzeExcel({
  type: 'text',
  content: prompt,
  userId: user.id,
  userTier: user.tier || 'TIER1'
});
```

### 2. 멀티모달 지원
**이전:**
```typescript
// 텍스트만 지원
const analysis = await analyzeText(content);
```

**현재:**
```typescript
// 텍스트와 이미지 모두 지원
const analysis = await aiHelpers.analyzeExcel({
  type: 'image', // 또는 'text'
  content: imageBuffer, // 또는 텍스트
  userId: user.id,
  userTier: user.tier
});
```

### 3. 비용 최적화
자동으로 적용되는 최적화:
- 프롬프트 토큰 감소
- 지능적 캐싱
- 사용자 티어별 모델 선택
- 예산 관리

### 4. A/B 테스팅
자동으로 실험에 참여:
```typescript
// 결과에 실험 정보 포함
const result = await aiHelpers.analyzeExcel({...});
// result.metadata.experimentId
// result.metadata.variantId
```

## 마이그레이션 단계

### 1단계: 환경 변수 업데이트
`.env` 파일에 추가:
```env
# 기존 OpenAI 키는 유지
OPENAI_API_KEY=your-key

# OpenRouter 추가 (필수)
OPENROUTER_API_KEY=sk-or-v1-xxxxx

# A/B 테스팅 활성화 (선택)
ENABLE_AB_TESTING=true
```

### 2단계: 데이터베이스 업데이트
```bash
# Prisma 클라이언트 생성
npx prisma generate

# 데이터베이스 스키마 업데이트
npx prisma db push
```

### 3단계: 기존 코드 업데이트

#### API 라우트 예제
**이전 (`app/api/analyze/route.ts`):**
```typescript
export async function POST(request: Request) {
  const { content } = await request.json();
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content }]
  });
  
  return Response.json({
    analysis: completion.choices[0].message.content
  });
}
```

**현재:**
```typescript
import { aiHelpers } from '@/lib/ai';
import { getServerSession } from 'next-auth';

export async function POST(request: Request) {
  const session = await getServerSession();
  const { content, type = 'text' } = await request.json();
  
  const result = await aiHelpers.analyzeExcel({
    type,
    content,
    userId: session?.user?.id || 'anonymous',
    userTier: session?.user?.tier || 'TIER1'
  });
  
  return Response.json({
    analysis: result.content,
    confidence: result.confidence,
    metadata: result.metadata
  });
}
```

#### React 컴포넌트 예제
**이전:**
```typescript
const handleAnalyze = async () => {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    body: JSON.stringify({ content: text })
  });
  const data = await response.json();
  setResult(data.analysis);
};
```

**현재:**
```typescript
const handleAnalyze = async () => {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    body: JSON.stringify({ 
      content: text,
      type: 'text' // 또는 'image'
    })
  });
  const data = await response.json();
  
  setResult(data.analysis);
  setConfidence(data.confidence);
  
  // 선택적: 피드백 제출
  if (data.metadata?.sessionId) {
    setSessionId(data.metadata.sessionId);
  }
};
```

### 4단계: 피드백 수집 추가
```typescript
import { aiHelpers } from '@/lib/ai';

const handleFeedback = async (rating: number) => {
  await aiHelpers.submitFeedback({
    sessionId,
    rating,
    accuracy: accuracyScore,
    usefulness: usefulnessScore,
    comments: feedbackText
  });
};
```

### 5단계: 대시보드 통합 (관리자용)
```typescript
// app/admin/ai-dashboard/page.tsx
import { aiHelpers } from '@/lib/ai';

export default async function AIDashboard() {
  const dashboardData = await aiHelpers.getDashboardData();
  const costAnalysis = await aiHelpers.getCostAnalysis();
  
  return (
    <div>
      <h1>AI 시스템 대시보드</h1>
      {/* 메트릭 표시 */}
    </div>
  );
}
```

## 모니터링 및 디버깅

### 로그 확인
```typescript
// 모든 AI 요청은 자동으로 로깅됨
// prisma.aIUsageLog에서 확인 가능
```

### 성능 모니터링
```typescript
const dashboard = await aiHelpers.getDashboardData();
console.log('평균 응답 시간:', dashboard.overview.avgResponseTime);
console.log('성공률:', dashboard.overview.successRate);
```

### 비용 모니터링
```typescript
const costReport = await aiHelpers.getCostAnalysis();
console.log('이번 달 지출:', costReport.currentMonthSpend);
console.log('예상 월간 지출:', costReport.projectedMonthlySpend);
```

## 주의사항

1. **API 키 보안**: OpenRouter API 키를 환경 변수로 관리
2. **비용 관리**: 티어별 예산 설정 확인
3. **캐싱**: 민감한 데이터는 캐싱에서 제외
4. **에러 처리**: 폴백 모델이 자동으로 작동하지만 에러 로깅 필수

## 문제 해결

### 데이터베이스 연결 오류
```bash
# PostgreSQL 연결 확인
psql -U postgres -d excelapp

# 권한 부여
GRANT ALL PRIVILEGES ON DATABASE excelapp TO user;
```

### 모델 선택 오류
```typescript
// 수동으로 모델 지정 가능
const result = await aiHelpers.analyzeExcel({
  // ...
  options: {
    preferredModel: 'openai/gpt-4-turbo'
  }
});
```

### 캐시 초기화
```sql
-- 캐시 테이블 비우기
TRUNCATE TABLE "AIResponseCache";
```

## 다음 단계

1. 테스트 환경에서 통합 테스트 실행
2. 점진적으로 기존 코드 마이그레이션
3. A/B 테스트 결과 모니터링
4. 비용 및 성능 최적화 조정