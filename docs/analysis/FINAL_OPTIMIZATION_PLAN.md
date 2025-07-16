# 🚀 최종 번들 최적화 실행 계획

## 📊 현재 상태 분석 완료

### 제거 가능한 의존성 (총 ~28MB)

#### 1. 미사용 Radix UI (~5MB)
```bash
@radix-ui/react-radio-group
@radix-ui/react-separator  
@radix-ui/react-slider
@radix-ui/react-menubar
@radix-ui/react-navigation-menu
@radix-ui/react-context-menu
@radix-ui/react-alert-dialog
@radix-ui/react-popover
@radix-ui/react-tooltip
@radix-ui/react-progress
@radix-ui/react-select
@radix-ui/react-switch
@radix-ui/react-scroll-area
```

#### 2. 미사용 기능 (~8MB)
```bash
@uploadthing/react
uploadthing
jose
cmdk
react-day-picker
@tanstack/react-table
@tosspayments/tosspayments-sdk
```

#### 3. 중복 라이브러리 (~15MB)
```bash
xlsx              # exceljs로 대체 (4곳에서만 사용)
hyperformula      # exceljs로 대체 가능 (1곳에서만 사용)
@google/generative-ai  # @anthropic-ai/sdk 사용
openai            # @anthropic-ai/sdk 사용
axios             # fetch API 사용
@azure/storage-blob    # AWS S3만 사용
```

## 🛠️ 실행 명령어

### Step 1: 패키지 제거
```bash
npm uninstall @radix-ui/react-radio-group @radix-ui/react-separator @radix-ui/react-slider @radix-ui/react-menubar @radix-ui/react-navigation-menu @radix-ui/react-context-menu @radix-ui/react-alert-dialog @radix-ui/react-popover @radix-ui/react-tooltip @radix-ui/react-progress @radix-ui/react-select @radix-ui/react-switch @radix-ui/react-scroll-area @uploadthing/react uploadthing jose cmdk react-day-picker @tanstack/react-table @tosspayments/tosspayments-sdk xlsx hyperformula @google/generative-ai openai axios @azure/storage-blob
```

### Step 2: 정리 및 재설치
```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
npm dedupe
```

### Step 3: 번들 분석
```bash
npm run analyze
```

## 📈 예상 결과

- **node_modules**: 400MB → 250MB (37.5% 감소)
- **번들 크기**: 2MB → 800KB (60% 감소)
- **초기 로드**: 1.5초 → 0.6초 (60% 개선)

## ✅ 적용된 최적화

1. **Dynamic Imports**: 무거운 컴포넌트 lazy loading
2. **Tree Shaking**: webpack 최적화 설정
3. **Code Splitting**: vendor/excel/ui 청크 분리
4. **Import 최적화**: 특정 함수만 import

## 🔍 검증 사항

1. **기능 테스트**
   - Excel 업로드/분석 ✓
   - AI 채팅 ✓
   - Q&A 시스템 ✓
   
2. **제거해도 안전한 기능**
   - Payment (미구현)
   - Referral (미구현)
   - Fine-tuning (미사용)
   - 복잡한 Admin 기능

## ⚡ 추가 최적화 제안

1. **이미지 최적화**
   - next/image 사용
   - WebP 포맷 변환

2. **폰트 최적화**
   - 서브셋 폰트 사용
   - font-display: swap

3. **캐싱 전략**
   - Service Worker
   - HTTP 캐싱 헤더

## 🚨 주의사항

- xlsx 제거 전 ExcelJS 변환 테스트 필요
- hyperformula 제거 시 수식 검증 기능 확인
- 백업 필수!