# 🔍 사용하지 않는 기능 심층 분석

## 1. 🚨 즉시 제거 가능한 패키지 (100% 미사용)

```bash
# 확실히 사용하지 않는 패키지들
npm uninstall \
  @radix-ui/react-radio-group \
  @radix-ui/react-separator \
  @radix-ui/react-slider \
  @radix-ui/react-menubar \
  @radix-ui/react-navigation-menu \
  @radix-ui/react-context-menu \
  @radix-ui/react-alert-dialog \
  @radix-ui/react-popover \
  @radix-ui/react-tooltip \
  @radix-ui/react-progress \
  @radix-ui/react-select \
  @radix-ui/react-switch \
  @radix-ui/react-scroll-area \
  @uploadthing/react \
  uploadthing \
  jose \
  cmdk \
  react-day-picker \
  @tanstack/react-table \
  @tosspayments/tosspayments-sdk
```

## 2. 📊 중복 라이브러리 분석

### Excel 처리 (3개 → 1개)
```
현재:
- exceljs (4.4MB) - 메인 사용
- xlsx (2.8MB) - ExcelCorrection에서만 사용
- hyperformula (5.2MB) - formula-engine.ts에서만 사용

권장: exceljs만 유지 (12MB → 4.4MB 절감)
```

### AI SDK (3개 → 1개)
```
현재:
- @anthropic-ai/sdk - 실제 사용
- @google/generative-ai - 미사용
- openai - 미사용 (이미 package.json에서 제거됨)

권장: @anthropic-ai/sdk만 유지
```

### 클라우드 스토리지 (2개 → 1개)
```
현재:
- @aws-sdk/client-s3 - S3FileStorage.ts
- @azure/storage-blob - AzureBlobStorage.ts

권장: 실제 사용하는 것 하나만 유지
```

## 3. 🗂️ 미사용 기능별 파일

### Payment 기능 (사용 안함?)
```
src/Features/Payment/ - 전체 디렉토리
src/app/api/payments/ - API 라우트
src/app/api/webhooks/toss/ - Toss 웹훅
@tosspayments/tosspayments-sdk - 패키지
```

### Referral 기능 (사용 안함?)
```
src/Features/Referral/ - 전체 디렉토리
src/app/api/referrals/ - API 라우트
```

### Admin 기능 중 일부
```
src/Features/Admin/FineTuning/ - 파인튜닝 (복잡도 높음)
src/app/admin/fine-tuning/ - 관련 페이지
```

## 4. 📁 테스트 파일 (src에서 제거 필요)

```
src/ 내 테스트 파일들:
- src/Features/AIChat/SendChatMessage.test.ts
- src/Features/Admin/AdminDashboard.test.ts
- src/Features/ErrorPatterns/SaveErrorPattern.test.ts
- src/Features/ExcelCorrection/CorrectWithAI.test.ts
- src/Features/ExcelUpload/UploadExcel.test.ts
- src/Features/Payment/*.test.ts
- src/Features/Referral/*.test.ts
- src/modules/intelligent-qa/__tests__/
```

## 5. 🔧 중복 설정 파일

```
루트 디렉토리:
- Dockerfile (3개 버전)
- next.config.mjs (2개 버전)
- 다수의 .md 파일 (20개+)
- scripts/ 내 중복 스크립트
```

## 6. 💾 예상 절감 효과

### 패키지 제거
```
Radix UI 미사용: ~5MB
Upload 라이브러리: ~3MB
Excel 중복: ~8MB
결제 라이브러리: ~2MB
기타: ~4MB

총 예상 절감: ~22MB
```

### 코드 정리
```
Payment 기능: ~500KB
Referral 기능: ~300KB
테스트 파일: ~1MB
중복 파일: ~200KB

총 예상 절감: ~2MB
```

## 7. 🛡️ 안전한 제거 순서

### Phase 1 (즉시 안전)
```bash
# 1. 미사용 UI 라이브러리
npm uninstall @radix-ui/react-radio-group @radix-ui/react-separator @radix-ui/react-slider @radix-ui/react-menubar @radix-ui/react-navigation-menu @radix-ui/react-context-menu @radix-ui/react-alert-dialog @radix-ui/react-popover @radix-ui/react-tooltip @radix-ui/react-progress @radix-ui/react-select @radix-ui/react-switch @radix-ui/react-scroll-area

# 2. 미사용 기능
npm uninstall @uploadthing/react uploadthing jose cmdk react-day-picker
```

### Phase 2 (확인 후)
```bash
# Payment 사용 안하면
npm uninstall @tosspayments/tosspayments-sdk

# Table 사용 안하면
npm uninstall @tanstack/react-table

# Excel 통합
npm uninstall xlsx hyperformula
```

### Phase 3 (코드 정리)
```bash
# 테스트 파일 이동
mkdir -p __tests__
find src -name "*.test.ts" -o -name "*.test.tsx" | xargs -I {} mv {} __tests__/

# 문서 정리
mkdir -p docs
mv *.md docs/ (README.md 제외)
```

## 8. 🎯 실행 명령

```bash
# 안전한 정리 스크립트 실행
chmod +x scripts/deep-cleanup.sh
./scripts/deep-cleanup.sh
```

이렇게 하면 실제로 사용하지 않는 기능들을 안전하게 제거하여 상당한 용량을 절감할 수 있습니다.