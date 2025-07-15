# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ExcelApp (Exhell)** - AI-powered Excel error correction and automation SaaS platform
- **Goal**: Automatically detect and fix Excel errors, generate optimized Excel files with AI
- **Scale**: Up to 100 concurrent users  
- **Tech Stack**: Remix + TypeScript (frontend), Express.js + TypeScript (backend), PostgreSQL + Prisma (database)

## Architecture Principles

This project follows **Vertical Slice Architecture** with SOLID principles:

1. **Feature-First Organization**: Each business function is a self-contained vertical slice
2. **2-Tier AI System**: Cost-efficient AI analysis using GPT-3.5-turbo (Tier 1) and GPT-4 (Tier 2)
3. **Progressive Enhancement**: Start simple, add complexity only when needed
4. **Result Pattern**: Business errors use Result<T>, system errors use exceptions

## Project Structure

```
src/
├── Features/                    # All features organized as vertical slices
│   ├── ExcelUpload/
│   │   ├── UploadExcel.cs      # Request, Response, Handler, Validator
│   │   ├── ExcelFileValidator.cs
│   │   └── UploadExcel.Tests.cs
│   ├── ExcelAnalysis/
│   │   ├── AnalyzeErrors/
│   │   └── GenerateReport/
│   └── ExcelCorrection/
├── Common/                      # Shared utilities only
│   ├── Result.cs
│   ├── Error.cs
│   └── Extensions/
├── Infrastructure/              # External dependencies
│   ├── Persistence/
│   ├── ExternalServices/
│   └── BackgroundJobs/
└── Host/                       # Application entry point
    ├── Program.cs
    └── PipelineBehaviors/
```

## Key Technologies

### Frontend
- **Remix + TypeScript**: Server-side rendering framework
- **Zustand**: State management (4KB, lightweight)
- **Tailwind CSS + shadcn UI**: Styling and components
- **React Query**: Server state management
- **react-dropzone**: File upload handling

### Backend  
- **Express.js + TypeScript**: API server
- **Prisma + PostgreSQL**: ORM and database
- **ExcelJS**: Excel file processing
- **Redis**: Caching and sessions (optional)
- **OpenAI API**: AI functionality with 2-tier system

### Infrastructure
- **Render.com**: Hosting platform
- **AWS S3**: File storage (for files >50GB)
- **Sentry**: Error monitoring
- **Posthog**: User analytics

## AI System Architecture

### 2-Tier AI Analysis
1. **Tier 1 (GPT-3.5-turbo)**: Basic error detection, cost-efficient
2. **Tier 2 (GPT-4)**: Complex analysis, triggered only when needed

### Confidence-Based Routing
- Tier 1 confidence >85% → Use result
- Tier 1 confidence <85% → Escalate to Tier 2
- Rule-based analysis → Always free

## Core Features

1. **Excel Upload**: Drag-and-drop interface with validation
2. **Error Detection**: Formula errors, data errors, format errors
3. **AI Analysis**: 2-tier system for cost optimization  
4. **Correction Suggestions**: Automated fixes with confidence scores
5. **File Download**: Corrected files with detailed reports
6. **AI Chat**: Natural language Excel generation requests
7. **User Management**: Authentication, profiles, usage tracking
8. **Billing**: Token-based pricing with subscription options

## Development Commands

*Note: This appears to be a greenfield project. Common commands will be added as development progresses.*

## Development Guidelines

1. **Vertical Slices**: Create new features as complete vertical slices
2. **Start Simple**: Begin with Transaction Script pattern, refactor when complex
3. **Controlled Duplication**: Allow duplication until third usage (Rule of Three)
4. **AI Cost Management**: Always prefer Tier 1 AI unless complexity requires Tier 2
5. **Result Pattern**: Use Result<T> for business logic errors
6. **Testing**: Focus on integration tests per slice, unit tests for complex logic only

## Security Considerations

- JWT authentication (Access: 15min, Refresh: 7 days)
- File encryption (AES-256)
- AI prompt sanitization and validation
- Rate limiting: 60 requests/minute per IP
- XSS/CSRF protection

## Performance Targets

- API response: <200ms (95th percentile)
- File upload: <5s (50MB files)
- Tier 1 AI analysis: <15s
- Tier 2 AI analysis: <30s
- Database connections: 20 pool size

## Key Database Models

- **User**: Authentication, preferences, AI tier settings
- **Analysis**: AI analysis results with tier tracking and costs
- **File**: Excel file metadata and processing status
- **AIUsageStats**: Per-user AI consumption tracking
- **AIPromptCache**: Response caching for cost optimization

## Anti-Patterns to Avoid

- ❌ Interfaces for everything
- ❌ Premature abstractions  
- ❌ Complex inheritance hierarchies
- ❌ Excessive DRY pursuit
- ❌ Enterprise patterns without justification

## Development Phases

1. **MVP** (4 weeks): Auth, upload, basic analysis
2. **AI Integration** (4 weeks): 2-tier AI system
3. **Advanced Features** (3 weeks): AI chat, optimization
4. **Billing System** (3 weeks): Payments, subscriptions
5. **Community Features** (3 weeks): Referrals, reviews, admin

This is a cost-conscious SaaS application prioritizing efficient AI usage and maintainable architecture for a single developer.