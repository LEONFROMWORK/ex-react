import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { EmbeddingGenerator } from '@/lib/ai/embedding-generator'

// PipeData 데이터 스키마
const PipeDataSchema = z.object({
  data: z.array(z.object({
    question: z.string(),
    answer: z.string(),
    code_snippets: z.array(z.string()).optional(),
    excel_functions: z.array(z.string()).optional(),
    difficulty: z.enum(['easy', 'medium', 'hard', 'expert']),
    quality_score: z.number().min(0).max(10),
    source: z.string(),
    tags: z.array(z.string()).optional(),
    metadata: z.record(z.any()).optional()
  }))
})

const embeddingGenerator = new EmbeddingGenerator({
  model: 'text-embedding-3-small'
})

// API 토큰 검증
function verifyPipeDataToken(request: NextRequest): boolean {
  const token = request.headers.get('X-PipeData-Token')
  return token === process.env.PIPEDATA_API_TOKEN
}

export async function POST(request: NextRequest) {
  try {
    // 1. 인증 확인
    if (!verifyPipeDataToken(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. 데이터 검증
    const body = await request.json()
    const { data } = PipeDataSchema.parse(body)

    // 3. 데이터베이스에 저장
    const results = await Promise.all(
      data.map(async (item) => {
        try {
          // 기존 데이터 확인 (중복 방지)
          const existing = await prisma.knowledgeItem.findFirst({
            where: {
              question: item.question,
              source: item.source
            }
          })

          if (existing) {
            return { id: existing.id, status: 'duplicate' }
          }

          // 임베딩 생성
          const combinedText = `${item.question} ${item.answer}`;
          const embedding = await embeddingGenerator.generateEmbedding(combinedText);

          // 난이도 매핑 (string → KnowledgeDifficulty enum)
          const difficultyMap: Record<string, string> = {
            'easy': 'EASY',
            'medium': 'MEDIUM', 
            'hard': 'HARD',
            'expert': 'EXPERT'
          };

          // 새 데이터 저장
          const created = await prisma.knowledgeItem.create({
            data: {
              question: item.question,
              answer: item.answer,
              excelFunctions: item.excel_functions || [],
              codeSnippets: item.code_snippets || [],
              difficulty: difficultyMap[item.difficulty] as any,
              qualityScore: item.quality_score,
              source: item.source,
              tags: item.tags || [],
              embedding: embedding,
              metadata: item.metadata || {},
              isActive: true
            }
          })

          return { id: created.id, status: 'created' }
        } catch (error) {
          console.error('Error processing item:', error)
          return { id: null, status: 'error', error: error instanceof Error ? error.message : 'Unknown error' }
        }
      })
    )

    // 4. 통계 업데이트
    const created = results.filter(r => r.status === 'created').length
    const duplicates = results.filter(r => r.status === 'duplicate').length
    const errors = results.filter(r => r.status === 'error').length

    // 5. 응답 반환
    return NextResponse.json({
      success: true,
      processed: data.length,
      created,
      duplicates,
      errors,
      message: `Successfully processed ${data.length} entries: ${created} created, ${duplicates} duplicates, ${errors} errors`
    })

  } catch (error) {
    console.error('PipeData ingestion error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data format', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET: 동기화 상태 확인
export async function GET(request: NextRequest) {
  if (!verifyPipeDataToken(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const stats = await prisma.knowledgeItem.aggregate({
      where: {
        isActive: true
      },
      _count: true,
      _avg: {
        qualityScore: true
      },
      _max: {
        createdAt: true
      }
    })

    const sourceStats = await prisma.knowledgeItem.groupBy({
      by: ['source'],
      where: {
        isActive: true
      },
      _count: true
    })

    return NextResponse.json({
      total_records: stats._count,
      average_quality: stats._avg.qualityScore,
      last_sync: stats._max.createdAt,
      sources: sourceStats.reduce((acc, item) => {
        acc[item.source] = item._count
        return acc
      }, {} as Record<string, number>),
      status: 'active'
    })
  } catch (error) {
    console.error('GET /api/training/pipedata error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}