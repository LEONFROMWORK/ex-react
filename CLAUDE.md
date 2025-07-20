# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ExcelApp (Exhell)** - AI-powered Excel error correction and automation SaaS platform
- **Goal**: Automatically detect and fix Excel errors, generate optimized Excel files with AI
- **Tech Stack**: Next.js 14 (App Router), TypeScript, PostgreSQL, Prisma
- **AI Integration**: Multi-tier system with OpenRouter for cost optimization
- **Deployment**: Railway (primary), Vercel-ready

## Key Technologies

### Frontend
- **Next.js 14**: App Router with server components
- **TypeScript**: Type-safe development
- **Tailwind CSS + shadcn/ui**: Styling and UI components
- **Zustand**: Lightweight state management
- **React Query**: Server state management
- **react-dropzone**: File upload handling
- **next-intl**: Internationalization (Korean/English)

### Backend  
- **Next.js API Routes**: Serverless API endpoints
- **Prisma + PostgreSQL**: Type-safe ORM and database
- **ExcelJS + HyperFormula**: Advanced Excel processing
- **Socket.IO**: Real-time progress updates
- **OpenRouter API**: Unified AI provider (replaces direct OpenAI)

### Payment Systems
- **TossPayments**: Korean payment gateway
- **Stripe**: International payment gateway
- **Region-based routing**: Automatic gateway selection by user location

## Development Commands

```bash
# Development
npm run dev              # Start development server (localhost:3000)
npm run dev:all          # Start dev server + Socket.IO server concurrently

# Build & Deploy
npm run build            # Production build with Prisma generation
npm run build:full       # Build + database migration
npm run start            # Start production server

# Database
npm run db:push          # Push Prisma schema to database
npm run db:migrate       # Create migration
npm run db:studio        # Open Prisma Studio GUI
npm run db:seed          # Seed database with test data

# Code Quality
npm run lint             # Run ESLint
npm run typecheck        # TypeScript type checking
npm run test             # Run Jest tests
npm run test:e2e         # Run Cypress E2E tests

# AI System
npm run ai:init          # Initialize AI system configuration
npm run sync-knowledge   # Sync knowledge base data
```

## AI System Architecture

### 3-Tier Cost-Optimized System
1. **TIER1 (Mistral 7B)**: Basic error detection, rule-based analysis
   - Cost: ~$0.0001 per request
   - Use: Simple formula errors, data validation

2. **TIER2 (GPT-4 Turbo)**: Complex analysis
   - Cost: ~$0.01 per request
   - Use: Complex formulas, multi-sheet dependencies

3. **TIER3 (GPT-4 Vision)**: Visual analysis
   - Cost: ~$0.02 per request
   - Use: Charts, images, visual data analysis

### Routing Logic
```typescript
// Confidence-based escalation
if (complexity < 30) return TIER1;
if (complexity < 70 || hasVisualContent) return TIER2;
return TIER3;
```

## Project Structure

```
/
├── app/                      # Next.js App Router
│   ├── api/                 # API routes
│   ├── [locale]/           # Internationalized pages
│   └── globals.css         # Global styles
├── components/              # React components
│   ├── ui/                 # shadcn/ui components
│   ├── ai/                 # AI-related components
│   └── payment/            # Payment components
├── src/
│   ├── lib/                # Core business logic
│   │   ├── ai/            # AI providers and logic
│   │   ├── excel/         # Excel processing
│   │   ├── payment/       # Payment providers
│   │   └── utils/         # Utilities
│   ├── messages/          # i18n translation files
│   └── types/             # TypeScript definitions
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts           # Database seeding
└── public/                # Static assets
```

## Core Features Implementation

### Multi-File Analysis
- Session-based file grouping
- Parallel processing with progress tracking
- WebSocket real-time updates via Socket.IO

### Payment Integration
```typescript
// Automatic region detection
const location = await locationDetector.detectUserLocation();
const provider = location.region === 'KR' ? 'TOSS' : 'STRIPE';
```

### Internationalization
- Default language: Korean (ko)
- Supported: Korean, English, Japanese, Chinese
- Automatic locale detection based on browser settings

## Environment Variables

Critical environment variables (see .env.example):
```bash
# Database
DATABASE_URL="postgresql://..."

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="..."

# AI (OpenRouter - recommended)
OPENROUTER_API_KEY="sk-or-v1-..."

# Payment - Korea
TOSS_CLIENT_KEY="test_ck_..."
TOSS_SECRET_KEY="test_sk_..."

# Payment - International  
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_SECRET_KEY="sk_test_..."

# Feature Flags
NEXT_PUBLIC_DEMO_MODE=true
ENABLE_REGIONAL_ROUTING=true
```

## Database Schema

Key models:
- **User**: Authentication, subscription, usage limits
- **Analysis**: AI analysis results with confidence scores
- **ExcelFile**: File metadata and processing status
- **AIUsage**: Token consumption tracking per tier
- **Payment**: Transaction records with regional info

## Performance Considerations

- **File size limit**: 50MB (configurable)
- **Concurrent analyses**: 5 per user
- **API rate limiting**: 60 requests/minute
- **AI response caching**: 24 hours for identical requests
- **Database connection pooling**: 20 connections

## Security

- JWT authentication with refresh tokens
- File encryption at rest (AES-256)
- Prompt injection protection
- XSS/CSRF protection via Next.js
- API key rotation support

## Testing Strategy

- **Unit tests**: Business logic and utilities
- **Integration tests**: API endpoints
- **E2E tests**: Critical user flows
- **AI mock responses**: For consistent testing

## Deployment

### Railway (Production)
- Automatic deployments from main branch
- PostgreSQL included
- Environment variables via Railway dashboard

### Local Development
- PostgreSQL via Docker or local installation
- Redis optional (falls back to memory)
- Demo mode available without external services