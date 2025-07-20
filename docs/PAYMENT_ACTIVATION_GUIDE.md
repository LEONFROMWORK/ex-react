# 결제 기능 활성화 가이드

## 개요
이 문서는 ExcelApp에서 토스페이먼츠와 유료 플랜 기능을 활성화하는 방법을 설명합니다.

## 활성화 단계

### 1. 환경 변수 설정
`.env` 파일에서 다음 값을 설정합니다:

```bash
# 결제 기능 활성화
ENABLE_PAYMENT_FEATURES=true

# 토스페이먼츠 설정 (실제 키로 교체)
TOSS_CLIENT_KEY=test_ck_your-toss-client-key
TOSS_SECRET_KEY=test_sk_your-toss-secret-key
TOSS_WIDGET_CLIENT_KEY=test_gck_your-widget-key

# Stripe 설정 (선택사항, 해외 결제용)
STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
```

### 2. 지역별 결제 설정 (선택사항)
```bash
# 지역별 자동 라우팅 활성화
ENABLE_REGIONAL_ROUTING=true
KR_PAYMENT_GATEWAY=TOSS
GLOBAL_PAYMENT_GATEWAY=STRIPE
```

### 3. 서버 재시작
환경 변수 변경 후 개발 서버를 재시작합니다:
```bash
npm run dev
```

## 비활성화된 기능 목록

`ENABLE_PAYMENT_FEATURES=false` 설정 시 다음 기능들이 자동으로 숨겨집니다:

### UI 컴포넌트
- **PaymentButton**: 결제 버튼이 렌더링되지 않음
- **PaymentWidget**: "결제 기능이 준비중입니다" 메시지 표시
- **ConfidenceBasedPricing**: 유료 플랜 버튼이 "준비중"으로 표시되고 비활성화됨

### 네비게이션
- 대시보드 메뉴에서 "요금제" 항목이 숨겨짐
- 크레딧/토큰 뱃지가 클릭 불가능한 상태로 변경됨

### API 엔드포인트
- `/api/payment/create-intent`: 503 에러 반환
- `/api/payments/create-intent`: 503 에러 반환  
- `/api/payments/webhook`: 요청은 받지만 처리하지 않음

## 테스트 방법

### 1. 결제 기능 비활성화 상태 확인
```bash
ENABLE_PAYMENT_FEATURES=false
```
- 요금제 메뉴가 보이지 않는지 확인
- 결제 버튼이 표시되지 않는지 확인
- API 호출 시 503 에러가 반환되는지 확인

### 2. 결제 기능 활성화 상태 확인
```bash
ENABLE_PAYMENT_FEATURES=true
```
- 모든 결제 관련 UI가 정상적으로 표시되는지 확인
- API 엔드포인트가 정상 작동하는지 확인

## 주의사항

1. **환경 변수 관리**: Production 환경에서는 환경 변수를 안전하게 관리해야 합니다.
2. **API 키 보안**: 실제 API 키는 절대 코드에 직접 포함하지 마세요.
3. **웹훅 설정**: 결제 제공자의 웹훅 URL을 올바르게 설정해야 합니다.

## 문제 해결

### 결제 기능이 활성화되지 않는 경우
1. 환경 변수가 올바르게 설정되었는지 확인
2. 서버를 재시작했는지 확인
3. 브라우저 캐시를 클리어하고 새로고침

### API 키 관련 오류
1. 토스페이먼츠/Stripe 대시보드에서 올바른 키를 복사했는지 확인
2. 테스트 키와 프로덕션 키를 구분하여 사용

## 관련 파일

- `/lib/config/features.ts`: 기능 플래그 설정
- `/.env.example`: 환경 변수 예시
- 각 결제 관련 컴포넌트 및 API 라우트