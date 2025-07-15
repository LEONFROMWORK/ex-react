# Exhell - AI 기반 엑셀 오류 수정 플랫폼

엑셀 파일의 오류를 자동으로 감지하고 수정하는 AI 기반 SaaS 플랫폼입니다.

## 주요 기능

- 📊 **자동 오류 감지**: 수식 오류, 데이터 형식 오류, 참조 오류 등을 자동으로 감지
- 🤖 **2단계 AI 시스템**: 비용 효율적인 AI 분석 (GPT-3.5 → GPT-4 자동 전환)
- 🔧 **자동 수정**: AI가 제안하는 수정 사항을 자동으로 적용
- 📈 **상세 리포트**: 오류 분석 및 수정 내역에 대한 상세 보고서
- 💾 **안전한 파일 처리**: 암호화된 파일 저장 및 처리

## 기술 스택

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Prisma, PostgreSQL
- **AI**: OpenAI API (GPT-3.5-turbo, GPT-4)
- **File Processing**: xlsx library
- **Authentication**: NextAuth.js

## 시작하기

### 사전 요구사항

- Node.js 18.0.0 이상
- PostgreSQL 데이터베이스
- OpenAI API 키

### 설치

1. 저장소 클론
```bash
git clone https://github.com/yourusername/exhell.git
cd exhell
```

2. 의존성 설치
```bash
npm install
```

3. 환경 변수 설정
```bash
cp .env.example .env
```

`.env` 파일을 열어 필요한 환경 변수를 설정하세요:
- `DATABASE_URL`: PostgreSQL 연결 문자열
- `NEXTAUTH_SECRET`: NextAuth 시크릿 키
- `OPENAI_API_KEY`: OpenAI API 키

4. 데이터베이스 설정
```bash
npx prisma db push
```

5. 개발 서버 실행
```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 프로젝트 구조

```
src/
├── app/                    # Next.js 14 App Router
│   ├── api/               # API 라우트
│   ├── auth/              # 인증 페이지
│   └── dashboard/         # 대시보드 페이지
├── components/            # React 컴포넌트
│   └── ui/               # shadcn/ui 컴포넌트
├── lib/                   # 유틸리티 및 라이브러리
│   ├── ai/               # AI 분석 로직
│   └── excel/            # Excel 파일 처리
├── types/                 # TypeScript 타입 정의
└── features/              # 기능별 모듈 (Vertical Slice)
```

## 개발 가이드

### 커밋 규칙

- `feat`: 새로운 기능 추가
- `fix`: 버그 수정
- `docs`: 문서 수정
- `style`: 코드 포맷팅
- `refactor`: 코드 리팩토링
- `test`: 테스트 추가
- `chore`: 빌드 작업 수정

### 브랜치 전략

- `main`: 프로덕션 브랜치
- `develop`: 개발 브랜치
- `feature/*`: 기능 개발 브랜치
- `hotfix/*`: 긴급 수정 브랜치

## 라이선스

이 프로젝트는 MIT 라이선스 하에 있습니다.