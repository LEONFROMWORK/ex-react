#📋 프로젝트 개요

목표: 엑셀 오류 자동 수정, 기능 개발, 데이터 분석 SaaS
규모: 동시접속 최대 100명
특징: 실시간 협업 ❌ / AI 오류 수정 ✅

#🛠️ 최종 기술 스택
##프론트엔드
javascript✅ Remix + TypeScript      // 서버 렌더링, 빠른 성능
✅ Zustand                 // 상태 관리 (4KB)
✅ Tailwind CSS + shadcn UI Component   // 스타일링
✅ React Query            // 서버 상태 관리

##스프레드시트

간단한 HTML 테이블 + SheetJS    // MVP

##백엔드
javascript✅ Express.js + TypeScript  // 간단, 검증됨
✅ Prisma + PostgreSQL     // ORM + DB
✅ Redis (선택사항)        // 세션/캐싱
✅ ExcelJS                 // 엑셀 파일 처리
✅ hyperformula           // 엑셀 파일 수식 처리

#인프라
javascript✅ Render.com     // 올인원 호스팅
✅ AWS S3                  // 파일 저장 (50GB 이상 시)
✅ OpenAI API             // AI 기능

🏗️ 최소 기능 아키텍처
┌─────────────────────────────────┐
│      Remix (프론트엔드)          │
│   파일 업로드 UI + 결과 표시      │
└────────────┬────────────────────┘
             │ REST API
┌────────────▼────────────────────┐
│    Express.js (백엔드)          │
│  파일 처리 + AI 분석 + DB 저장   │
└────────────┬────────────────────┘
             │
┌────────────▼────────────────────┐
│   PostgreSQL    │   OpenAI API   │
│   (Render)      │   (외부)       │
└─────────────────┴───────────────┘

## 📝 핵심 코드 구조 - 참조용도 (아래의 모든 Typescript는 반드시 똑같이 구현해야 하는것이 아니다. 단지, 참고용일 뿐이다.)
1. 백엔드 API (server.js)
javascriptimport express from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import * as XLSX from 'xlsx';
import OpenAI from 'openai';

const app = express();
const prisma = new PrismaClient();
const upload = multer({ dest: 'uploads/' });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 엑셀 업로드 및 분석
app.post('/api/analyze', upload.single('file'), async (req, res) => {
  // 1. 엑셀 파일 읽기
  const workbook = XLSX.readFile(req.file.path);
  const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
  
  // 2. 기본 오류 감지
  const errors = detectBasicErrors(data);
  
  // 3. AI 분석 (복잡한 오류)
  const aiAnalysis = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{
      role: "system",
      content: "엑셀 오류를 찾고 수정 방법을 제안하세요."
    }, {
      role: "user",
      content: JSON.stringify({ data: data.slice(0, 100), errors })
    }]
  });
  
  // 4. 결과 저장
  const result = await prisma.analysis.create({
    data: {
      fileName: req.file.originalname,
      errors: errors,
      suggestions: aiAnalysis.choices[0].message.content,
      userId: req.user?.id
    }
  });
  
  res.json(result);
});

// 수정된 파일 다운로드
app.get('/api/download/:id', async (req, res) => {
  const analysis = await prisma.analysis.findUnique({
    where: { id: req.params.id }
  });
  
  // 엑셀 생성 및 다운로드
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(analysis.correctedData);
  XLSX.utils.book_append_sheet(wb, ws, "Corrected");
  
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.send(buffer);
});
2. 프론트엔드 (app/routes/index.tsx)
typescriptimport { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

export default function Index() {
  const [file, setFile] = useState<File | null>(null);
  
  const analyzeMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData
      });
      
      return response.json();
    }
  });
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">엑셀 오류 분석기</h1>
      
      <div className="border-2 border-dashed p-8 text-center">
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="mb-4"
        />
        
        <button
          onClick={() => file && analyzeMutation.mutate(file)}
          disabled={!file || analyzeMutation.isPending}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          {analyzeMutation.isPending ? '분석 중...' : '분석 시작'}
        </button>
      </div>
      
      {analyzeMutation.data && (
        <div className="mt-8 p-4 bg-gray-100 rounded">
          <h2 className="font-bold">분석 결과</h2>
          <p>발견된 오류: {analyzeMutation.data.errors.length}개</p>
          <pre className="mt-4 p-2 bg-white rounded text-sm">
            {analyzeMutation.data.suggestions}
          </pre>
          <button className="mt-4 bg-green-500 text-white px-4 py-2 rounded">
            수정된 파일 다운로드
          </button>
        </div>
      )}
    </div>
  );
}








#Product Requirements Document (PRD)
ExcelAI - 지능형 엑셀 자동화 플랫폼
1. 제품 개요
1.1 제품명
Exhell - AI 기반 엑셀 오류 수정 및 자동화 SaaS
1.2 제품 비전
엑셀 작업의 오류를 자동으로 감지하고 수정하며, AI를 통해 최적화된 엑셀 문서를 생성하는 웹 기반 플랫폼
1.3 목표 사용자

엑셀을 자주 사용하는 직장인
데이터 분석가
중소기업 사무직 종사자
엑셀 초보자

1.4 핵심 가치 제안

엑셀 오류 90% 자동 감지 및 수정
AI 기반 엑셀 문서 자동 생성
시간 절약 및 생산성 향상





# 2. 기능 요구사항
2.1 인증 시스템
2.1.1 회원가입
설명: 이메일 기반 회원가입 시스템
기능 명세:
typescriptinterface SignupData {
  email: string;
  password: string;
  name: string;
  referralCode?: string; // 추천인 코드
}
요구사항:

이메일 중복 확인
비밀번호 강도 검증 (최소 8자, 대소문자, 숫자, 특수문자)
이메일 인증 링크 발송
추천인 코드 검증
회원가입 시 무료 토큰 100개 지급

API 엔드포인트:
POST /api/auth/signup
POST /api/auth/verify-email
POST /api/auth/check-email
2.1.2 로그인
설명: JWT 기반 인증 시스템
기능 명세:

이메일/비밀번호 로그인
로그인 유지 옵션 (Remember me)
비밀번호 찾기/재설정
소셜 로그인 (Google, 추후 확장)

API 엔드포인트:
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
POST /api/auth/forgot-password
POST /api/auth/reset-password

2.2 엑셀 파일 업로드
2.2.1 파일 업로드 인터페이스
설명: 드래그 앤 드롭 방식의 파일 업로드
기능 명세:
typescriptinterface FileUpload {
  maxSize: 50; // MB
  allowedTypes: ['.xlsx', '.xls', '.csv'];
  multipleFiles: false; // 단일 파일만
}
요구사항:

파일 크기 제한 체크
파일 형식 검증
업로드 진행률 표시
업로드 취소 기능

UI/UX:
┌─────────────────────────────────┐
│   📁 파일을 드래그하여 놓으세요   │
│         또는 클릭하여 선택         │
│                                 │
│   지원 형식: XLSX, XLS, CSV      │
│   최대 크기: 50MB               │
└─────────────────────────────────┘

2.3 오류 검증 및 수정 (AI 2단계 시스템)
2.3.1 자동 오류 검증
설명: 업로드된 파일의 오류를 자동으로 감지
검증 항목:
typescriptinterface ErrorTypes {
  formulaErrors: {
    type: 'FORMULA_ERROR';
    errors: ['#REF!', '#VALUE!', '#DIV/0!', '#NAME?', '#NULL!'];
  };
  dataErrors: {
    type: 'DATA_ERROR';
    errors: ['missing_values', 'type_mismatch', 'duplicates'];
  };
  formatErrors: {
    type: 'FORMAT_ERROR';
    errors: ['date_format', 'number_format', 'inconsistent_format'];
  };
}
2.3.2 AI 2단계 분석 시스템 (신규)
설명: API 토큰 절약 및 할루시네이션 방지를 위한 계층적 AI 시스템
시스템 구조:
typescriptinterface AIAnalysisSystem {
  tier1: {
    model: 'gpt-3.5-turbo'; // 또는 Claude Haiku
    costPerToken: 0.0005;
    capabilities: [
      'basic_error_detection',
      'simple_formula_correction',
      'format_standardization',
      'basic_data_validation'
    ];
    confidenceThreshold: 0.85; // 85% 이상 확신도일 때만 결과 사용
  };
  tier2: {
    model: 'gpt-4' | 'claude-3.5-sonnet'; // 또는 Claude Opus
    costPerToken: 0.03;
    capabilities: [
      'complex_formula_analysis',
      'business_logic_validation',
      'advanced_optimization',
      'custom_solution_generation'
    ];
    triggerConditions: [
      'low_confidence', // Tier 1 확신도 < 85%
      'complex_error', // 복잡한 오류 패턴
      'user_request', // 사용자 명시적 요청
      'critical_data' // 중요 데이터 처리
    ];
  };
}
분석 프로세스:
typescriptinterface AnalysisFlow {
  step1_ruleBasedCheck: {
    // 1단계: AI 없이 규칙 기반 검사
    process: 'local';
    checks: [
      'syntax_validation',
      'reference_check',
      'basic_format_check'
    ];
    cost: 0; // 무료
  };
  
  step2_tier1AI: {
    // 2단계: 저비용 AI 분석
    process: 'api';
    model: 'gpt-3.5-turbo';
    prompt: 'structured_simple_analysis';
    maxTokens: 500;
    temperature: 0.1; // 할루시네이션 방지를 위한 낮은 온도
  };
  
  step3_confidenceCheck: {
    // 3단계: 신뢰도 평가
    evaluations: [
      'consistency_check', // 응답 일관성
      'validation_rules', // 검증 규칙 통과
      'confidence_score' // AI 자체 신뢰도
    ];
  };
  
  step4_tier2AI: {
    // 4단계: 필요시 고급 AI 분석
    conditions: {
      confidence: '< 0.85',
      errorComplexity: 'high',
      userPreference: 'premium'
    };
    model: 'gpt-4';
    enhancedPrompt: 'detailed_analysis_with_context';
    maxTokens: 2000;
  };
}
2.3.3 할루시네이션 방지 전략
설명: AI 응답의 정확성을 보장하기 위한 다층 검증 시스템
검증 메커니즘:
typescriptinterface HallucinationPrevention {
  promptEngineering: {
    // 구조화된 프롬프트 사용
    format: 'JSON_SCHEMA';
    constraints: [
      'only_analyze_provided_data',
      'no_external_assumptions',
      'explicit_uncertainty_declaration'
    ];
    exampleResponses: true; // Few-shot learning
  };
  
  responseValidation: {
    // 응답 검증 레이어
    schemaValidation: true; // JSON 스키마 검증
    rangeChecks: true; // 값 범위 검증
    formulaSyntaxCheck: true; // 수식 문법 검증
    crossReference: true; // 원본 데이터와 교차 검증
  };
  
  fallbackMechanism: {
    // 불확실한 경우 대체 전략
    uncertainResponse: {
      action: 'flag_for_review',
      message: '이 부분은 수동 검토가 필요합니다',
      alternativeSuggestions: true
    };
  };
}
2.3.4 오류 수정 제안
설명: 감지된 오류에 대한 수정 방안 제시
UI 예시:
┌─────────────────────────────────────┐
│ 🔍 분석 결과                         │
├─────────────────────────────────────┤
│ ⚠️ 발견된 오류: 15개                 │
│                                     │
│ 🟢 AI 분석 모드: 기본 (비용 효율)    │
│ 신뢰도: 92%                         │
│                                     │
│ 1. A15 셀: #DIV/0! 오류             │
│    → 제안: IF문으로 0 체크 추가      │
│    신뢰도: 🟢 95%                   │
│    [자동 수정] [건너뛰기]            │
│                                     │
│ 2. 복잡한 수식 오류 (F25:F30)       │
│    → 고급 AI 분석이 필요합니다       │
│    예상 토큰: 1,500                 │
│    [🔷 고급 분석 요청] [건너뛰기]    │
└─────────────────────────────────────┘

2.4 리포트 및 다운로드
2.4.1 수정 리포트
설명: 수정된 내용에 대한 상세 보고서
리포트 내용:
typescriptinterface CorrectionReport {
  summary: {
    totalErrors: number;
    correctedErrors: number;
    skippedErrors: number;
    processingTime: number; // seconds
    aiAnalysis: {
      tier1Used: boolean;
      tier2Used: boolean;
      tokensConsumed: number;
      estimatedCost: number;
      confidenceScore: number;
    };
  };
  details: Array<{
    location: string; // "A15", "B:B"
    errorType: string;
    originalValue: any;
    correctedValue: any;
    suggestion: string;
    status: 'corrected' | 'skipped' | 'needs_review';
    aiTier: 'rule_based' | 'tier1' | 'tier2';
    confidence: number;
  }>;
  aiInsights: string; // AI가 제공하는 추가 인사이트
}
2.4.2 파일 다운로드
설명: 수정된 파일 다운로드
다운로드 옵션:

수정된 파일만
원본 + 수정본 비교 파일
수정 리포트 (PDF)
전체 패키지 (ZIP)


2.5 AI 파일 최적화
2.5.1 파일 분석 및 최적화
설명: AI가 파일을 분석하여 성능, 편의성, 확장성을 고려한 최적화 제안
분석 항목:
typescriptinterface OptimizationAnalysis {
  performance: {
    formulaComplexity: number;
    volatileFunctions: string[];
    arrayFormulas: number;
    suggestions: string[];
  };
  usability: {
    namingConsistency: boolean;
    dataValidation: boolean;
    protectedCells: boolean;
    suggestions: string[];
  };
  scalability: {
    dataStructure: 'normalized' | 'denormalized';
    growthPotential: 'low' | 'medium' | 'high';
    suggestions: string[];
  };
}
제안 예시:
📊 AI 최적화 제안

1. 성능 개선
   - VLOOKUP을 INDEX/MATCH로 변경 (30% 속도 향상)
   - 휘발성 함수 제거 (NOW, TODAY)

2. 편의성 향상
   - 데이터 유효성 검사 추가
   - 명명된 범위 사용 권장

3. 확장성 개선
   - 테이블 형식으로 변환
   - 동적 범위 수식 적용

2.6 AI 챗 인터페이스
2.6.1 자연어 요청 처리 (2단계 AI 적용)
설명: 채팅으로 엑셀 문서 생성 요청
대화 처리 시스템:
typescriptinterface ChatAISystem {
  intentClassification: {
    // 의도 분류는 Tier 1 AI 사용
    model: 'gpt-3.5-turbo';
    categories: [
      'simple_template', // 간단한 템플릿
      'complex_request', // 복잡한 요청
      'clarification_needed' // 추가 정보 필요
    ];
  };
  
  responseGeneration: {
    simple: {
      model: 'gpt-3.5-turbo';
      templates: 'predefined'; // 사전 정의 템플릿 사용
      customization: 'minimal';
    };
    complex: {
      model: 'gpt-4';
      templates: 'dynamic';
      customization: 'full';
      requiresApproval: true; // 사용자 승인 필요
    };
  };
}
대화 예시:
User: 월별 매출 관리 엑셀 파일을 만들어줘

AI: [🟢 기본 AI 모드] 월별 매출 관리 템플릿을 만들어드리겠습니다.
    
    제공 가능한 옵션:
    1. 📊 기본 템플릿 (즉시 생성)
       - 12개월 시트
       - 기본 집계 수식
       - 간단한 차트
    
    2. 🔷 맞춤형 템플릿 (고급 AI 필요)
       - 사용자 요구사항 반영
       - 복잡한 분석 기능
       - 예상 토큰: 2,000
    
    어떤 옵션을 선택하시겠습니까?

User: 기본 템플릿으로 해줘

AI: 기본 매출 관리 템플릿을 생성했습니다:
    
    ✅ 12개월 시트
    ✅ 자동 합계 수식
    ✅ 월별 비교 차트
    ✅ 데이터 유효성 검사
    
    [📥 다운로드] [✏️ 수정 요청]
2.6.2 대화 기록 저장
설명: 사용자별 대화 기록 저장 및 조회
데이터 구조:
typescriptinterface ChatHistory {
  id: string;
  userId: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    aiModel: 'tier1' | 'tier2'; // 사용된 AI 모델
    tokensUsed: number;
    attachments?: string[]; // 생성된 파일 ID
  }>;
  totalTokensUsed: number;
  estimatedCost: number;
  createdAt: Date;
  title: string; // 자동 생성된 대화 제목
}

2.7 추천인 제도
2.7.1 추천 시스템
설명: 추천인 코드를 통한 포인트 보상 시스템
기능 명세:
typescriptinterface ReferralSystem {
  referrerReward: 500; // 추천인 보상 포인트
  refereeReward: 200; // 피추천인 보상 포인트
  codeFormat: 'USER_ID_RANDOM'; // 예: JOHN_A3B2
  expirationDays: 30; // 코드 유효기간
}
추천 프로세스:

사용자가 자신의 추천 코드 생성/확인
신규 회원이 가입 시 추천 코드 입력
이메일 인증 완료 시 포인트 지급
추천 현황 대시보드에서 확인


2.8 이용 후기 시스템
2.8.1 후기 작성
설명: 서비스 이용 후기 작성 및 관리
후기 데이터:
typescriptinterface Review {
  id: string;
  userId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string;
  content: string;
  usageContext: string; // 사용 목적
  beforeAfter?: {
    timeSaved: number; // 시간 절약 (분)
    errorsFixed: number; // 수정된 오류 수
  };
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
}
2.8.2 후기 표시
설명: 승인된 후기를 홈페이지에 캐러셀로 표시
UI 예시:
┌─────────────────────────────────────┐
│        ← Testimonials →             │
├─────────────────────────────────────┤
│ ⭐⭐⭐⭐⭐                            │
│ "엑셀 오류 찾는 시간이 90% 줄었어요!" │
│                                     │
│ 김민수 / 데이터 분석가               │
│ 매달 2시간 → 10분으로 단축          │
│                                     │
│ ● ○ ○ ○                            │
└─────────────────────────────────────┘

2.9 사용자 프로필 및 과금
2.9.1 프로필 관리
설명: 사용자 정보 및 설정 관리
프로필 정보:
typescriptinterface UserProfile {
  basicInfo: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    position?: string;
  };
  preferences: {
    language: 'ko' | 'en';
    timezone: string;
    emailNotifications: boolean;
    aiTier: 'economy' | 'premium'; // AI 선호 모드
  };
  security: {
    twoFactorEnabled: boolean;
    lastPasswordChange: Date;
  };
}
2.9.2 이용 내역
설명: 서비스 사용 기록 조회
표시 항목:

파일 처리 내역
AI 대화 기록
다운로드 기록
포인트 사용 내역
AI 모델별 토큰 사용량

2.9.3 과금 시스템 (AI 티어 반영)
설명: 토큰 기반 과금 및 구독 시스템
과금 모델:
typescriptinterface BillingSystem {
  tokenPackages: [
    { tokens: 100, price: 5000, name: 'Starter' },
    { tokens: 500, price: 20000, name: 'Professional' },
    { tokens: 2000, price: 70000, name: 'Business' }
  ];
  subscriptions: [
    { 
      name: 'Basic',
      price: 9900,
      tokensPerMonth: 300,
      features: [
        '기본 오류 수정',
        'Tier 1 AI만 사용',
        '월 50회 분석'
      ]
    },
    {
      name: 'Pro',
      price: 29900,
      tokensPerMonth: 1000,
      features: [
        '모든 기능',
        'Tier 1 + Tier 2 AI',
        '무제한 분석',
        '우선 지원'
      ]
    }
  ];
  tokenUsage: {
    ruleBasedAnalysis: 0, // 무료
    tier1Analysis: 5, // 파일당
    tier2Analysis: 50, // 파일당
    aiOptimization: 20,
    aiGeneration: {
      simple: 10,
      complex: 50
    }
  };
}
과금 대시보드 UI:
┌─────────────────────────────────────┐
│ 💳 나의 구독 정보                    │
├─────────────────────────────────────┤
│ 현재 플랜: Pro                      │
│ 다음 결제일: 2024.02.15             │
│                                     │
│ 🪙 토큰 잔액: 750 / 1000            │
│ ████████░░ 75%                     │
│                                     │
│ 📊 AI 사용 내역                     │
│ ├─ 기본 AI: 450 토큰 (90%)         │
│ └─ 고급 AI: 50 토큰 (10%)          │
│                                     │
│ 💰 예상 절약액: ₩45,000             │
│   (고급 AI 자동 전환으로 절약)      │
│                                     │
│ [토큰 구매] [플랜 변경] [구독 취소]  │
└─────────────────────────────────────┘

2.10 관리자 시스템
2.10.1 관리자 인증
설명: 별도 URL과 강화된 인증을 통한 관리자 접근
접근 제어:
typescriptinterface AdminAuth {
  url: '/admin'; // 별도 라우트
  authentication: {
    method: 'email + OTP';
    ipWhitelist: string[]; // 허용 IP 목록
    sessionTimeout: 30; // 분
  };
  roles: ['super_admin', 'admin', 'support'];
}
2.10.2 사용자 관리
설명: 전체 사용자 조회 및 관리
관리 기능:

사용자 검색/필터링
계정 상태 변경 (활성/비활성/정지)
포인트/토큰 수동 조정
사용 내역 조회
지원 티켓 관리
AI 사용 패턴 분석

2.10.3 통계 대시보드 (AI 분석 추가)
설명: 서비스 운영 현황 실시간 모니터링
대시보드 위젯:
typescriptinterface AdminDashboard {
  realtime: {
    activeUsers: number;
    processingFiles: number;
    apiCalls: number;
    aiTier1Calls: number;
    aiTier2Calls: number;
  };
  daily: {
    newUsers: number;
    revenue: number;
    fileProcessed: number;
    errors: number;
    tokensSaved: number; // 2단계 시스템으로 절약된 토큰
    aiCostOptimization: number; // 절약된 비용
  };
  charts: {
    userGrowth: 'line';
    revenueStream: 'area';
    featureUsage: 'bar';
    errorTypes: 'pie';
    aiTierUsage: 'stacked-bar'; // AI 티어별 사용량
    costEfficiency: 'line'; // 비용 효율성 추세
  };
}
2.10.4 AI 시스템 관리 (신규)
설명: AI 2단계 시스템 모니터링 및 조정
관리 기능:
typescriptinterface AISystemManagement {
  monitoring: {
    tier1Performance: {
      avgConfidence: number;
      successRate: number;
      avgResponseTime: number;
    };
    tier2Usage: {
      triggerReasons: Record<string, number>;
      costPerUser: number;
      roiMetrics: number;
    };
  };
  
  configuration: {
    confidenceThreshold: number; // 조정 가능
    tier2TriggerRules: Array<{
      condition: string;
      enabled: boolean;
      priority: number;
    }>;
    costLimits: {
      dailyLimit: number;
      userLimit: number;
      alertThreshold: number;
    };
  };
  
  optimization: {
    promptTemplates: {
      tier1: string[];
      tier2: string[];
      lastUpdated: Date;
    };
    cacheSettings: {
      enabled: boolean;
      ttl: number;
      hitRate: number;
    };
  };
}
2.10.5 콘텐츠 관리
설명: 사용자 생성 콘텐츠 관리
관리 항목:

이용 후기 승인/거부
AI 응답 품질 모니터링
시스템 공지사항 작성
FAQ 관리


3. 기술 사양
3.1 프론트엔드
typescript// 기술 스택
const frontend = {
  framework: 'Remix',
  language: 'TypeScript',
  styling: 'Tailwind CSS',
  stateManagement: 'Zustand',
  httpClient: 'Axios',
  charts: 'Recharts',
  fileHandling: 'react-dropzone'
};
3.2 백엔드
typescript// 기술 스택
const backend = {
  framework: 'Express.js',
  language: 'TypeScript',
  database: 'PostgreSQL',
  orm: 'Prisma',
  cache: 'Redis',
  fileProcessing: 'ExcelJS',
  ai: {
    tier1: 'OpenAI GPT-3.5 / Claude Haiku',
    tier2: 'OpenAI GPT-4 / Claude Sonnet',
    promptCache: 'Redis', // 프롬프트 캐싱
    responseCache: 'PostgreSQL' // 응답 캐싱
  },
  authentication: 'JWT + bcrypt',
  fileStorage: 'AWS S3'
};
3.3 인프라
typescript// 배포 환경
const infrastructure = {
  hosting: 'Render.com',
  cdn: 'Cloudflare',
  monitoring: 'Sentry',
  analytics: 'Posthog'
};

4. 데이터베이스 스키마 (AI 시스템 추가)
prisma// 주요 모델 정의

model User {
  id              String    @id @default(cuid())
  email           String    @unique
  password        String
  name            String
  emailVerified   Boolean   @default(false)
  role            Role      @default(USER)
  tokens          Int       @default(100)
  referralCode    String    @unique
  referredBy      String?
  aiPreference    AITier    @default(ECONOMY)
  createdAt       DateTime  @default(now())
  
  profile         Profile?
  files           File[]
  analyses        Analysis[]
  chats           Chat[]
  reviews         Review[]
  transactions    Transaction[]
  referrals       Referral[]
  aiUsageStats    AIUsageStats?
}

model Analysis {
  id              String    @id @default(cuid())
  fileId          String
  userId          String
  errors          Json
  corrections     Json
  report          Json
  
  // AI 분석 정보
  aiTier          AITier    @default(TIER1)
  confidence      Float?
  tokensUsed      Int
  promptTokens    Int
  completionTokens Int
  estimatedCost   Float
  processingPath  Json      // 분석 경로 기록
  
  createdAt       DateTime  @default(now())
  
  file            File      @relation(fields: [fileId], references: [id])
  user            User      @relation(fields: [userId], references: [id])
}

model AIUsageStats {
  id              String    @id @default(cuid())
  userId          String    @unique
  
  tier1Calls      Int       @default(0)
  tier1Tokens     Int       @default(0)
  tier1Cost       Float     @default(0)
  
  tier2Calls      Int       @default(0)
  tier2Tokens     Int       @default(0)
  tier2Cost       Float     @default(0)
  
  tokensSaved     Int       @default(0)
  costSaved       Float     @default(0)
  
  lastUpdated     DateTime  @updatedAt
  
  user            User      @relation(fields: [userId], references: [id])
}

model AIPromptCache {
  id              String    @id @default(cuid())
  promptHash      String    @unique
  model           String
  response        Json
  confidence      Float
  tokensUsed      Int
  createdAt       DateTime  @default(now())
  expiresAt       DateTime
  hitCount        Int       @default(0)
}

enum AITier {
  ECONOMY   // Tier 1 우선
  BALANCED  // 자동 전환
  PREMIUM   // Tier 2 우선
}

enum Role {
  USER
  ADMIN
  SUPER_ADMIN
}

5. API 명세 (AI 시스템 추가)
5.1 인증 API
typescript// 회원가입
POST /api/auth/signup
Body: {
  email: string;
  password: string;
  name: string;
  referralCode?: string;
}

// 로그인
POST /api/auth/login
Body: {
  email: string;
  password: string;
}

// 토큰 갱신
POST /api/auth/refresh
Headers: {
  Authorization: 'Bearer ${refreshToken}'
}
5.2 파일 처리 API
typescript// 파일 업로드
POST /api/files/upload
Headers: {
  'Content-Type': 'multipart/form-data'
}
Body: FormData

// 분석 시작 (AI 티어 옵션 추가)
POST /api/files/{fileId}/analyze
Body: {
  options: {
    autoCorrect: boolean;
    deepAnalysis: boolean;
    aiTier?: 'auto' | 'economy' | 'premium';
    maxCost?: number; // 최대 비용 제한
  }
}

// 분석 상태 확인
GET /api/files/{fileId}/analysis-status
Response: {
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  aiTier: 'tier1' | 'tier2';
  estimatedCost: number;
}

// 결과 다운로드
GET /api/files/{fileId}/download
Query: {
  type: 'corrected' | 'report' | 'package'
}
5.3 AI API
typescript// AI 최적화
POST /api/ai/optimize
Body: {
  fileId: string;
  optimizationLevel: 'basic' | 'advanced';
  costLimit?: number;
}

// AI 채팅
POST /api/ai/chat
Body: {
  message: string;
  context?: string;
  preferredTier?: 'economy' | 'premium';
}

// AI 사용 통계
GET /api/ai/usage-stats
Response: {
  tier1: {
    calls: number;
    tokens: number;
    cost: number;
  };
  tier2: {
    calls: number;
    tokens: number;
    cost: number;
  };
  savings: {
    tokensSaved: number;
    costSaved: number;
    efficiencyRate: number;
  };
}

6. 보안 요구사항
6.1 인증 및 권한

JWT 기반 인증 (Access Token: 15분, Refresh Token: 7일)
비밀번호 암호화 (bcrypt, salt rounds: 10)
Rate limiting (IP당 분당 60회)
CORS 설정
XSS, CSRF 방어

6.2 데이터 보안

파일 암호화 저장 (AES-256)
HTTPS 전송
민감 정보 마스킹
정기적 보안 감사
AI 프롬프트 주입 공격 방지

6.3 AI 보안 (신규)
typescriptinterface AISecurity {
  promptSanitization: {
    removePersonalInfo: boolean;
    validateInput: boolean;
    maxPromptLength: 4000;
  };
  responseFiltering: {
    removeConfidentialInfo: boolean;
    validateOutput: boolean;
    contentModeration: boolean;
  };
  rateLimiting: {
    tier1: '100/hour/user';
    tier2: '10/hour/user';
    costLimit: '1000 tokens/hour/user';
  };
}

7. 성능 요구사항
7.1 응답 시간

API 응답: < 200ms (95 percentile)
파일 업로드: < 5초 (50MB 기준)
규칙 기반 분석: < 5초
Tier 1 AI 분석: < 15초
Tier 2 AI 분석: < 30초

7.2 확장성

동시 접속: 100명
일일 파일 처리: 1,000개
데이터베이스 커넥션 풀: 20
AI API 동시 호출: 10 (rate limit 고려)

7.3 캐싱 전략
typescriptinterface CachingStrategy {
  promptCache: {
    storage: 'Redis';
    ttl: 3600; // 1시간
    keyStrategy: 'prompt_hash + model';
  };
  resultCache: {
    storage: 'PostgreSQL';
    ttl: 86400; // 24시간
    keyStrategy: 'file_hash + analysis_type';
  };
  hitRateTarget: 0.3; // 30% 캐시 히트율 목표
}

8. 모니터링 및 분석
8.1 에러 추적

Sentry를 통한 실시간 에러 모니터링
에러 발생 시 Slack 알림
AI 할루시네이션 감지 및 로깅

8.2 사용자 분석

Posthog을 통한 사용자 행동 분석
주요 지표: DAU, 파일 처리량, 기능별 사용률
AI 티어별 사용 패턴 분석

8.3 AI 성능 모니터링
typescriptinterface AIMonitoring {
  metrics: {
    avgConfidenceScore: number;
    tier1SuccessRate: number;
    tier2TriggerRate: number;
    avgTokensPerRequest: number;
    costPerUser: number;
  };
  alerts: {
    lowConfidence: 'confidence < 0.7';
    highCost: 'hourly_cost > $10';
    highTier2Usage: 'tier2_rate > 0.3';
  };
}

9. 배포 계획
9.1 환경 구성

Development: 로컬 개발
Staging: Render.com 스테이징
Production: Render.com 프로덕션

9.2 CI/CD

GitHub Actions를 통한 자동 배포
테스트 자동화
롤백 전략


10. 마일스톤
Phase 1: MVP (4주)

 인증 시스템
 파일 업로드/다운로드
 기본 오류 검증
 규칙 기반 분석
 간단한 리포트

Phase 2: AI 통합 (4주)

 OpenAI API 연동
 2단계 AI 시스템 구현
 할루시네이션 방지 로직
 AI 최적화 기능
 프롬프트 캐싱

Phase 3: AI 채팅 및 고급 기능 (3주)

 AI 채팅 인터페이스
 응답 검증 시스템
 비용 최적화 로직
 사용자 AI 선호도 설정

Phase 4: 과금 시스템 (3주)

 토큰/구독 시스템
 AI 티어별 과금
 결제 연동
 사용량 추적 및 제한

Phase 5: 커뮤니티 기능 (3주)

 추천인 제도
 이용 후기
 관리자 시스템
 AI 성능 대시보드

