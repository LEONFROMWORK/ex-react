# AI Model Management System Migration Guide

## Overview
AI 모델 관리 시스템이 아키텍처 가이드라인에 맞게 전면 리팩토링되었습니다. 싱글톤 패턴을 제거하고 수직 슬라이스 아키텍처와 의존성 주입을 적용했습니다.

## 주요 변경사항

### 1. 싱글톤 패턴 제거
**이전:**
```typescript
const manager = AIModelManager.getInstance()
await manager.initialize()
```

**현재:**
```typescript
const handler = container.getSelectModelHandler()
const result = await handler.handle(request)
```

### 2. 기능별 핸들러 분리
기존의 거대한 `AIModelManager` 클래스가 작은 기능별 핸들러로 분해되었습니다:

- `ConfigureModelHandler`: 모델 설정 관리
- `SelectModelHandler`: 모델 선택 로직
- `ValidateModelHandler`: 모델 검증
- `GetActiveModelsHandler`: 활성 모델 조회
- `LogUsageHandler`: 사용량 로깅
- `GetUsageStatsHandler`: 사용 통계 조회

### 3. Result 패턴 일관적 적용
모든 핸들러는 이제 `Result<T>` 패턴을 사용합니다:

```typescript
const result = await handler.handle(request)
if (result.isFailure) {
  // 에러 처리
  console.error(result.error!.message)
} else {
  // 성공 처리
  const value = result.value!
}
```

### 4. AI Chat 리팩토링
채팅 시스템도 기능별로 분리되었습니다:

- `SendMessageHandler`: 메시지 전송 조정
- `ClassifyIntentHandler`: 의도 분류
- `GenerateResponseHandler`: AI 응답 생성
- `ManageConversationHandler`: 대화 관리

## 마이그레이션 단계

### 1. 의존성 주입 설정
```typescript
// src/Infrastructure/DependencyInjection/Container.ts
import { container } from '@/Infrastructure/DependencyInjection/Container'

// 핸들러 가져오기
const configureModelHandler = container.getConfigureModelHandler()
const selectModelHandler = container.getSelectModelHandler()
```

### 2. API 라우트 업데이트

**모델 설정 API:**
```typescript
// src/app/api/admin/ai-models/route.ts
const handler = container.getConfigureModelHandler()
const result = await handler.handle({
  provider: 'openai',
  modelName: 'gpt-4',
  apiKey: 'your-api-key',
  // ... 기타 설정
})
```

**채팅 API:**
```typescript
// src/app/api/ai/chat/route.ts
const handler = container.getSendMessageHandler()
const result = await handler.handle({
  userId: session.user.id,
  message: body.message,
  context: body.context,
  preferredModel: body.preferredModel,
  tenantId: session.user.tenantId
})
```

### 3. 기존 코드 마이그레이션

**이전 코드:**
```typescript
const manager = AIModelManager.getInstance()
await manager.initialize()
const { provider, config } = await manager.selectModel({
  taskType: 'ANALYZE',
  complexity: 'COMPLEX'
})
const response = await manager.chat(prompt, criteria, options)
```

**새 코드:**
```typescript
// 모델 선택
const selectHandler = container.getSelectModelHandler()
const selectResult = await selectHandler.handle({
  taskType: 'ANALYZE',
  complexity: 'COMPLEX'
})

if (selectResult.isSuccess) {
  const model = selectResult.value!
  
  // 응답 생성
  const generateHandler = container.getGenerateResponseHandler()
  const responseResult = await generateHandler.handle({
    message: prompt,
    modelId: model.modelId,
    provider: model.provider,
    modelName: model.modelName,
    maxTokens: model.maxTokens,
    temperature: model.temperature,
    intent: { taskType: 'ANALYZE', complexity: 'COMPLEX' }
  })
}
```

### 4. 에러 처리

모든 에러는 이제 `AIModelErrors`를 통해 표준화되었습니다:

```typescript
import { AIModelErrors } from '@/Common/Errors'

if (result.isFailure) {
  switch (result.error!.code) {
    case AIModelErrors.NoModelsConfigured.code:
      // 모델이 설정되지 않음
      break
    case AIModelErrors.AllModelsFailed.code:
      // 모든 모델 실패
      break
    // ... 기타 에러 처리
  }
}
```

## 새로운 기능

### 1. 테넌트 인식
모든 핸들러는 이제 `tenantId`를 지원합니다:

```typescript
await handler.handle({
  // ... 기타 파라미터
  tenantId: 'tenant-123'
})
```

### 2. 파이프라인 패턴
크로스 커팅 관심사는 파이프라인을 통해 처리됩니다:
- 로깅
- 검증
- 캐싱
- 모니터링

### 3. 향상된 모니터링
```typescript
const statsHandler = container.getGetUsageStatsHandler()
const stats = await statsHandler.handle({
  startDate: new Date('2024-01-01'),
  endDate: new Date(),
  modelConfigId: 'model-123'
})
```

## 주의사항

1. **초기화 불필요**: 더 이상 `initialize()` 메서드를 호출할 필요가 없습니다.
2. **상태 관리**: 핸들러는 상태를 유지하지 않습니다. 모든 상태는 데이터베이스에서 관리됩니다.
3. **비동기 처리**: 모든 핸들러 메서드는 비동기입니다.

## 테스트

새로운 구조는 테스트하기 쉽습니다:

```typescript
describe('ConfigureModelHandler', () => {
  it('should configure a new model', async () => {
    const handler = new ConfigureModelHandler()
    const result = await handler.handle({
      provider: 'openai',
      modelName: 'gpt-4',
      // ... 설정
    })
    
    expect(result.isSuccess).toBe(true)
    expect(result.value!.provider).toBe('openai')
  })
})
```

## 향후 계획

1. **캐싱 레이어 추가**: 자주 사용되는 모델 정보 캐싱
2. **메트릭 수집 향상**: Prometheus 통합
3. **자동 폴백 체인**: 더 지능적인 폴백 메커니즘
4. **A/B 테스팅**: 모델 성능 비교 기능

## 문제 해결

### Q: 기존 AIModelManager를 사용하는 코드가 있습니다.
A: 점진적으로 마이그레이션하세요. 임시로 wrapper를 만들 수 있습니다:

```typescript
class AIModelManagerWrapper {
  static async getInstance() {
    return {
      selectModel: async (criteria) => {
        const handler = container.getSelectModelHandler()
        const result = await handler.handle(criteria)
        if (result.isFailure) throw new Error(result.error!.message)
        return { provider: null, config: result.value! }
      },
      // ... 다른 메서드들
    }
  }
}
```

### Q: 의존성 주입이 작동하지 않습니다.
A: Container가 제대로 초기화되었는지 확인하세요:

```typescript
// app/layout.tsx 또는 적절한 초기화 위치에서
import { container } from '@/Infrastructure/DependencyInjection/Container'
// Container는 singleton이므로 import만 해도 초기화됩니다
```

## 참고 자료

- [Architecture.md](/Architecture.md): 전체 아키텍처 가이드라인
- [Features/README.md](/src/Features/README.md): 기능별 구조 설명
- [Common/Result.ts](/src/Common/Result.ts): Result 패턴 사용법