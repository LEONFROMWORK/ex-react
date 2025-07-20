# Excel + 이미지 비교 분석 테스트 가이드

## 테스트 환경 설정

1. 서버 실행
```bash
npm run dev
```

2. 테스트 페이지 접속
```
http://localhost:3003/test-multi-file
```

## 테스트 시나리오

### 시나리오 1: Excel 오류 분석

1. **파일 준비**
   - Excel 파일: `/public/test-excel-with-errors.csv`
   - 스크린샷: `/public/excel-error-screenshot.svg` 또는 자체 캡처

2. **테스트 단계**
   - Excel 파일을 드래그 앤 드롭
   - 이미지 파일을 드래그 앤 드롭
   - 분석 요청: "이부분의 숫자가 왜 오류가 나고 있는지 궁금해 그리고 여기에는 이런 데이터가 나오면 좋겠어"
   - '파일 업로드 및 분석 시작' 클릭

3. **예상 결과**
   - #DIV/0!, #REF!, #VALUE! 오류 감지
   - 각 오류에 대한 원인 분석
   - IFERROR 함수 등 구체적인 해결 방안 제시

### 시나리오 2: 기능 개선 요청

1. **파일 준비**
   - Excel 파일: `/public/normal-sales-data.csv`
   - 스크린샷: `/public/chart-request-screenshot.svg`

2. **테스트 단계**
   - Excel 파일을 드래그 앤 드롭
   - 이미지 파일을 드래그 앤 드롭
   - 분석 요청: "이부분의 기능을 차트로 변경하고 또 여기에는 이런게 나왔으면 좋겠어"
   - '파일 업로드 및 분석 시작' 클릭

3. **예상 결과**
   - 차트 시각화 제안 (선 그래프, 막대 그래프, 파이 차트)
   - 구현 방법 안내
   - 추가 개선 사항 제안

## 데모 모드 특징

- OpenAI API 키 없이도 테스트 가능
- Mock 응답으로 실제 분석과 유사한 결과 제공
- Excel 오류 자동 감지 및 해결 방안 제시

## 파일 구조

```
/app/test-multi-file/page.tsx         # 테스트 페이지
/components/ai/MultiFileAnalyzer.tsx   # 파일 업로드 UI
/components/ai/AnalysisResultView.tsx  # 분석 결과 표시
/lib/ai/enhanced-analysis-service.ts   # AI 분석 서비스
/src/Features/ExcelAnalysis/          # Excel 처리 기능
```

## 주의사항

1. 파일 크기 제한
   - Excel: 50MB
   - 이미지: 각 10MB, 최대 5개

2. 지원 파일 형식
   - Excel: .xlsx, .xls, .csv
   - 이미지: .png, .jpg, .jpeg, .gif, .webp

3. 데모 모드에서는 실제 이미지 분석이 아닌 Excel 데이터 기반 분석 수행