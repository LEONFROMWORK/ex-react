# ExcelApp (Next.js) 상세 코딩 로드맵 및 개발 방향

## 🎯 현재 상태 냉정한 평가

### 📊 프로젝트 현실 인식
**ExcelApp은 현재 기획 단계의 greenfield 프로젝트**입니다. CLAUDE.md와 아키텍처 문서들은 완성되어 있지만, **실제 구현된 코드는 거의 없는 상태**입니다.

**현실적 상황:**
- ✅ **완성된 설계**: 아키텍처, AI 시스템, 비즈니스 로직 설계
- ❌ **미구현 코드**: src/ 또는 app/ 폴더의 실제 구현체 없음
- ❌ **미설정 인프라**: package.json, Next.js 설정, 데이터베이스 스키마
- ❌ **미구현 AI 통합**: 3-tier 시스템의 실제 코드 없음

### 🔍 ExcelApp-Rails과의 비교
- **ExcelApp-Rails**: 95% 완성된 프로덕션 레디 애플리케이션
- **ExcelApp (Next.js)**: 0% 구현된 기획 단계 프로젝트
- **권장사항**: ExcelApp-Rails에 집중하는 것이 합리적

---

## 🛣️ 개발 원칙 및 방향성

### 1. 핵심 개발 원칙

#### **A. "Rails-First, Next.js-Second" 전략**
ExcelApp-Rails가 이미 95% 완성된 상황에서 Next.js 버전을 새로 만드는 것보다, **Rails 버전을 완성하고 필요시 Next.js 프론트엔드를 추가**하는 전략이 합리적입니다.

#### **B. Incremental Development (점진적 개발)**
```typescript
// 권장 개발 순서
1. ExcelApp-Rails 완성도 100% 달성 (1-2주)
2. API-First Backend로 Rails 전환 (1주)
3. Next.js Frontend를 API 클라이언트로 개발 (2-3주)
4. 하이브리드 아키텍처 완성 (1주)
```

#### **C. API-First Architecture**
Rails를 API 백엔드로, Next.js를 프론트엔드로 분리하여 **마이크로서비스 아키텍처**로 발전시킵니다.

### 2. 기술적 의사결정 원칙

#### **A. Proven Technology First**
- ✅ **검증된 기술**: 이미 ExcelApp-Rails에서 검증된 기술 스택 우선
- ✅ **성능 검증**: 집단지성 검증을 통해 확인된 기술만 사용
- ❌ **신기술 지양**: 불필요한 복잡성 추가 지양

#### **B. Performance Over Complexity**
```typescript
// 성능 우선 기술 선택
const techStack = {
  // 검증된 성능 기술
  excel: 'HyperFormula + ExcelJS (하이브리드)',
  ai: '3-Tier System (검증된 85% 비용 절감)',
  infra: 'Railway + Neon (검증된 성능 향상)',
  
  // 복잡성 최소화
  state: 'Zustand (4KB)',
  styling: 'Tailwind CSS',
  forms: 'React Hook Form'
}
```

#### **C. Business Value First**
모든 개발 결정은 **비즈니스 가치 창출**을 최우선으로 합니다.

---

## 🏗️ 단계별 구현 로드맵

### Phase 1: Foundation Setup (1주)

#### **1.1 프로젝트 초기화**
```bash
# Next.js 13+ App Router 설정
npx create-next-app@latest excelapp --typescript --tailwind --app
cd excelapp

# 필수 패키지 설치
npm install zustand @tanstack/react-query react-dropzone
npm install @radix-ui/react-components class-variance-authority
npm install lucide-react date-fns clsx

# Excel 처리 라이브러리
npm install exceljs hyperformula
npm install @types/exceljs

# AI 통합
npm install openai anthropic-sdk
```

#### **1.2 프로젝트 구조 설정**
```typescript
// 권장 폴더 구조
src/
├── app/                    # Next.js 13 App Router
│   ├── api/               # API Routes (Rails 연동)
│   ├── dashboard/         # 대시보드 페이지
│   ├── analysis/          # 분석 페이지
│   └── globals.css
├── features/              # Vertical Slice Architecture
│   ├── excel-upload/
│   ├── excel-analysis/
│   ├── ai-integration/
│   └── user-management/
├── shared/                # 공통 컴포넌트
│   ├── components/
│   ├── hooks/
│   └── utils/
└── lib/                   # 라이브러리 설정
```

#### **1.3 TypeScript 설정 강화**
```typescript
// tsconfig.json - 엄격한 타입 체크
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### Phase 2: Core Business Logic (1-2주)

#### **2.1 Excel 처리 엔진 구현**
```typescript
// features/excel-processing/services/ExcelProcessor.ts
export class AdaptiveExcelProcessor {
  private hyperFormula: HyperFormula
  
  constructor() {
    this.hyperFormula = HyperFormula.buildEmpty({
      licenseKey: 'gpl-v3'
    })
  }
  
  async processFile(file: File): Promise<ProcessResult> {
    const fileSize = file.size
    const capabilities = await this.detectCapabilities()
    
    // 검증된 적응형 처리
    if (fileSize < 10_000_000) {
      return await this.processWithExcelJS(file)
    } else if (capabilities.webgpu && fileSize > 20_000_000) {
      return await this.processWithWebGPU(file)
    } else {
      return await this.processWithWASM(file)
    }
  }
  
  private async detectCapabilities(): Promise<ClientCapabilities> {
    return {
      webgpu: !!navigator.gpu,
      wasmSIMD: typeof WebAssembly.SIMD !== 'undefined',
      memorySize: (navigator as any).deviceMemory || 4
    }
  }
}
```

#### **2.2 AI 통합 시스템**
```typescript
// features/ai-integration/services/AIService.ts
export class ThreeTierAIService {
  private readonly TIER_CONFIG = {
    tier1: {
      model: 'mistralai/mistral-small-3.1',
      cost: 0.00015,
      threshold: 0.85
    },
    tier2: {
      model: 'meta-llama/llama-4-maverick',
      cost: 0.00039,
      threshold: 0.90
    },
    tier3: {
      model: 'openai/gpt-4.1-mini',
      cost: 0.0004,
      threshold: 0.95
    }
  }
  
  async analyzeErrors(errors: ExcelError[]): Promise<AIAnalysisResult> {
    // 검증된 에스컬레이션 로직 (85% 비용 절감)
    const complexity = this.analyzeComplexity(errors)
    
    if (complexity > 0.8) {
      return await this.tier3Analysis(errors)
    }
    
    const tier1Result = await this.tier1Analysis(errors)
    if (tier1Result.confidence >= this.TIER_CONFIG.tier1.threshold) {
      return tier1Result
    }
    
    const tier2Result = await this.tier2Analysis(errors, tier1Result.context)
    if (tier2Result.confidence >= this.TIER_CONFIG.tier2.threshold) {
      return tier2Result
    }
    
    return await this.tier3Analysis(errors, {
      tier1Context: tier1Result.context,
      tier2Context: tier2Result.context
    })
  }
}
```

#### **2.3 State Management**
```typescript
// shared/stores/useAppStore.ts
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface AppState {
  // File Processing
  currentFile: ExcelFile | null
  processingStatus: ProcessingStatus
  
  // AI Analysis
  analysisResult: AIAnalysisResult | null
  currentTier: AITier
  
  // User State
  user: User | null
  tokens: number
  
  // Actions
  setFile: (file: ExcelFile) => void
  updateProcessingStatus: (status: ProcessingStatus) => void
  setAnalysisResult: (result: AIAnalysisResult) => void
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // State
        currentFile: null,
        processingStatus: 'idle',
        analysisResult: null,
        currentTier: 'tier1',
        user: null,
        tokens: 0,
        
        // Actions
        setFile: (file) => set({ currentFile: file }),
        updateProcessingStatus: (status) => set({ processingStatus: status }),
        setAnalysisResult: (result) => set({ analysisResult: result }),
      }),
      {
        name: 'excelapp-storage',
        partialize: (state) => ({
          user: state.user,
          tokens: state.tokens
        })
      }
    )
  )
)
```

### Phase 3: UI Components (1주)

#### **3.1 Design System 구축**
```typescript
// shared/components/ui/Button.tsx
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input hover:bg-accent hover:text-accent-foreground',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
```

#### **3.2 핵심 UI 컴포넌트**
```typescript
// features/excel-upload/components/FileUpload.tsx
export const FileUpload: React.FC = () => {
  const { setFile, updateProcessingStatus } = useAppStore()
  const [isDragActive, setIsDragActive] = useState(false)
  
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return
    
    updateProcessingStatus('uploading')
    
    try {
      // 파일 검증
      const validation = await validateExcelFile(file)
      if (!validation.isValid) {
        throw new Error(validation.error)
      }
      
      // 파일 메타데이터 추출
      const metadata = await extractFileMetadata(file)
      
      setFile({
        file,
        metadata,
        uploadedAt: new Date()
      })
      
      updateProcessingStatus('ready')
    } catch (error) {
      updateProcessingStatus('error')
      toast.error(`파일 업로드 실패: ${error.message}`)
    }
  }, [setFile, updateProcessingStatus])
  
  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: false
  })
  
  return (
    <div
      {...getRootProps()}
      className={cn(
        'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
        isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
      )}
    >
      <input {...getInputProps()} />
      <FileIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
      <p className="text-lg font-medium">
        {isDragActive ? '파일을 여기에 놓으세요' : 'Excel 파일을 드래그하거나 클릭하여 업로드'}
      </p>
      <p className="text-sm text-muted-foreground mt-2">
        .xlsx, .xls, .csv 파일 지원 (최대 50MB)
      </p>
    </div>
  )
}
```

### Phase 4: Integration & Optimization (1주)

#### **4.1 API 통합**
```typescript
// lib/api/client.ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5분
      cacheTime: 10 * 60 * 1000, // 10분
      retry: 3,
      refetchOnWindowFocus: false
    }
  }
})

// API 클라이언트
export class APIClient {
  private baseURL: string
  
  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
  }
  
  async analyzeExcel(file: File, options: AnalysisOptions): Promise<AnalysisResult> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('options', JSON.stringify(options))
    
    const response = await fetch(`${this.baseURL}/api/v1/files/analyze`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      }
    })
    
    if (!response.ok) {
      throw new Error(`분석 실패: ${response.statusText}`)
    }
    
    return response.json()
  }
}
```

#### **4.2 실시간 통신**
```typescript
// lib/websocket/useRealTimeAnalysis.ts
export const useRealTimeAnalysis = (fileId: string) => {
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<AnalysisStatus>('idle')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  
  useEffect(() => {
    if (!fileId) return
    
    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/analysis/${fileId}`)
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      
      switch (data.type) {
        case 'progress':
          setProgress(data.progress)
          break
        case 'status':
          setStatus(data.status)
          break
        case 'result':
          setResult(data.result)
          setStatus('completed')
          break
        case 'error':
          setStatus('error')
          toast.error(data.error)
          break
      }
    }
    
    return () => {
      ws.close()
    }
  }, [fileId])
  
  return { progress, status, result }
}
```

---

## 🎯 개발 우선순위 및 중요도

### 🔥 Critical Priority (즉시 시작)

#### **1. ExcelApp-Rails 완성 우선**
ExcelApp-Rails가 95% 완성되어 있으므로, **남은 5%를 완성하는 것**이 최우선입니다.

```ruby
# ExcelApp-Rails 완성 작업 (1-2주)
1. Admin Dashboard 고도화
2. 성능 최적화 (대용량 파일)
3. 실시간 모니터링 강화
4. Referral System 완성
```

#### **2. API 분리 작업**
Rails를 API 백엔드로 전환하여 Next.js와 연동 준비:

```ruby
# Rails API 모드 전환
class ApplicationController < ActionController::API
  include ActionController::Cookies
  include DeviseTokenAuth::Concerns::SetUserByToken
end
```

### 🚀 High Priority (2-3주 후)

#### **1. Next.js 프론트엔드 개발**
Rails API가 준비된 후 Next.js 클라이언트 개발:

```typescript
// 권장 개발 순서
1. Core UI Components (1주)
2. Excel Processing Frontend (1주)  
3. Real-time Features (3일)
4. Payment Integration (2일)
```

#### **2. 성능 최적화**
검증된 기술들 적용:

```typescript
// 우선순위별 최적화
1. WebGPU 감지 및 적용 (GPU 가속)
2. WASM SIMD 활용 (CPU 최적화)
3. Railway + Neon 마이그레이션 (인프라)
```

### 📊 Medium Priority (장기)

#### **1. Advanced Features**
```typescript
// 고급 기능들
1. AI Chat Interface
2. Batch Processing
3. Custom Formulas
4. Advanced Analytics
```

#### **2. Enterprise Features**
```typescript
// 엔터프라이즈 기능
1. SSO Integration
2. Audit Logging
3. Advanced Security
4. Multi-tenant Support
```

---

## 🛡️ 품질 보증 및 테스트 전략

### 1. 테스트 피라미드
```typescript
// 테스트 전략 (상향식)
1. Unit Tests (70%): 비즈니스 로직
2. Integration Tests (20%): API 통합
3. E2E Tests (10%): 사용자 플로우
```

### 2. 성능 테스트
```typescript
// 성능 벤치마크
const performanceTargets = {
  fileUpload: '< 3초 (50MB)',
  analysis: '< 30초 (복잡한 파일)',
  apiResponse: '< 200ms (95th percentile)',
  uiResponse: '< 100ms (버튼 클릭)'
}
```

### 3. 품질 도구
```bash
# 필수 품질 도구
npm install --save-dev
  @typescript-eslint/eslint-plugin
  prettier
  husky
  lint-staged
  jest
  @testing-library/react
  cypress
```

---

## 📈 성공 지표 및 마일스톤

### 1. 기술적 마일스톤
```typescript
// 주차별 목표
Week 1: ExcelApp-Rails 100% 완성
Week 2: Rails API 분리 완성  
Week 3: Next.js Core Components 완성
Week 4: Excel Processing 통합 완성
Week 5: Real-time Features 완성
Week 6: Production Deployment
```

### 2. 성능 목표
```typescript
// 성능 KPI
const kpis = {
  responseTime: '< 200ms',
  availability: '> 99.9%',
  errorRate: '< 0.1%',
  userSatisfaction: '> 4.5/5'
}
```

### 3. 비즈니스 목표
```typescript
// 비즈니스 메트릭
const businessMetrics = {
  monthlyActiveUsers: '>1000',
  conversionRate: '>5%',
  revenueGrowth: '>20% MoM',
  customerRetention: '>90%'
}
```

---

## 🔥 핵심 권장사항

### 1. **ExcelApp-Rails 우선 완성**
현재 95% 완성된 Rails 버전을 100% 완성하는 것이 최우선입니다.

### 2. **점진적 개발**
모든 것을 한 번에 구현하려 하지 말고, 핵심 기능부터 차례대로 완성합니다.

### 3. **검증된 기술 사용**
집단지성 검증을 통해 확인된 기술만 사용하여 위험을 최소화합니다.

### 4. **성능 최우선**
모든 개발 결정에서 성능을 최우선으로 고려합니다.

### 5. **Business First**
기술적 완벽함보다 비즈니스 가치 창출을 우선합니다.

---

이 로드맵을 따라 개발하면 **ExcelApp-Rails의 장점을 활용하면서도 Next.js의 현대적 프론트엔드 경험**을 제공하는 하이브리드 시스템을 구축할 수 있습니다.

**현실적 권장사항: ExcelApp-Rails 완성에 집중하고, 필요시 Next.js 프론트엔드를 추가하는 전략이 가장 효율적입니다.**