# ExcelApp (Exhell) - AI Excel Analysis Platform

AI 기반 엑셀 오류 분석 및 자동화 SaaS 플랫폼

## 🚀 주요 기능

- **AI 기반 오류 감지**: OpenRouter API를 통한 지능형 엑셀 오류 분석
- **다중 파일 분석**: 여러 엑셀 파일 동시 분석 지원
- **실시간 진행 상황**: WebSocket을 통한 실시간 분석 진행률 표시
- **관리자 전용 시스템**: OAuth 로그인 및 관리자 이메일 제한

## 🛠 기술 스택

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **AI**: OpenRouter (GPT-4, Claude 등 통합)
- **Authentication**: NextAuth.js (Google, Kakao OAuth)
- **Deployment**: Railway

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
