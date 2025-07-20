import { prisma } from '@/lib/prisma'
import { EmbeddingGenerator } from '@/lib/ai/embedding-generator'

export interface PipeDataEntry {
  question: string
  answer: string
  excel_functions?: string[]
  code_snippets?: string[]
  difficulty: 'easy' | 'medium' | 'hard' | 'advanced'
  quality_score: number
  source: string
}

export class PipeDataIntegrationService {
  private embeddingGenerator: EmbeddingGenerator

  constructor() {
    this.embeddingGenerator = new EmbeddingGenerator({
      model: 'text-embedding-3-small'
    })
  }

  /**
   * PipeData에서 학습한 지식을 활용한 Excel 분석
   */
  async analyzeWithPipeDataKnowledge(query: string) {
    try {
      // 1. 쿼리 임베딩 생성
      const queryEmbedding = await this.embeddingGenerator.generateEmbedding(query)

      // 2. 유사한 Q&A 검색 (pgvector 사용)
      const similarQAs = await this.findSimilarQAs(queryEmbedding, 5)

      // 3. 컨텍스트 구성
      const context = this.buildContext(similarQAs)

      // 4. 난이도 판단
      const difficulty = this.assessDifficulty(similarQAs)

      return {
        context,
        difficulty,
        similarCases: similarQAs,
        recommendedTier: this.getRecommendedAITier(difficulty)
      }
    } catch (error) {
      console.error('PipeData knowledge search error:', error)
      return {
        context: '',
        difficulty: 'medium',
        similarCases: [],
        recommendedTier: 'TIER1'
      }
    }
  }

  /**
   * 유사한 Q&A 검색
   */
  private async findSimilarQAs(embedding: number[], limit: number = 5) {
    // PostgreSQL pgvector를 사용한 유사도 검색
    const result = await prisma.$queryRaw`
      SELECT 
        id,
        question,
        answer,
        "excelFunctions",
        "codeSnippets",
        difficulty,
        "qualityScore",
        source,
        tags,
        metadata,
        1 - (embedding <-> ${embedding}::vector) as similarity
      FROM "KnowledgeItem"
      WHERE "isActive" = true
        AND "qualityScore" > 7.0
      ORDER BY embedding <-> ${embedding}::vector
      LIMIT ${limit}
    `

    return result as any[]
  }

  /**
   * AI 프롬프트용 컨텍스트 생성
   */
  private buildContext(similarQAs: any[]): string {
    if (similarQAs.length === 0) return ''

    let context = '다음은 유사한 Excel 문제와 해결책입니다:\n\n'

    similarQAs.forEach((qa, index) => {
      context += `사례 ${index + 1}:\n`
      context += `Q: ${qa.question}\n`
      context += `A: ${qa.answer}\n`
      
      if (qa.excelFunctions && qa.excelFunctions.length > 0) {
        context += `사용된 함수: ${qa.excelFunctions.join(', ')}\n`
      }
      
      if (qa.codeSnippets && qa.codeSnippets.length > 0) {
        context += `예제 코드:\n${qa.codeSnippets.slice(0, 2).join('\n')}\n`
      }
      
      context += `난이도: ${qa.difficulty} | 품질점수: ${qa.qualityScore}\n`
      context += '\n'
    })

    return context
  }

  /**
   * 난이도 평가
   */
  private assessDifficulty(similarQAs: any[]): string {
    if (similarQAs.length === 0) return 'medium'

    const difficulties = similarQAs
      .map(qa => qa.difficulty || 'medium')
      .filter(Boolean)

    // 가장 높은 난이도 반환 (KnowledgeDifficulty enum 기준)
    if (difficulties.includes('EXPERT')) return 'expert'
    if (difficulties.includes('HARD')) return 'hard'
    if (difficulties.includes('MEDIUM')) return 'medium'
    return 'easy'
  }

  /**
   * 난이도별 AI 티어 추천
   */
  private getRecommendedAITier(difficulty: string): string {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return 'TIER1' // Cost-efficient for simple tasks
      case 'medium':
        return 'TIER1'
      case 'hard':
        return 'TIER2' // More powerful model for complex tasks
      case 'expert':
        return 'TIER2'
      default:
        return 'TIER1'
    }
  }

  /**
   * PipeData 동기화 통계
   */
  async getSyncStats() {
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

    const bySource = await prisma.knowledgeItem.groupBy({
      by: ['source'],
      where: {
        isActive: true
      },
      _count: true
    })

    const byDifficulty = await prisma.knowledgeItem.groupBy({
      by: ['difficulty'],
      where: {
        isActive: true
      },
      _count: true
    })

    return {
      totalRecords: stats._count,
      averageQuality: stats._avg.qualityScore || 0,
      lastSync: stats._max.createdAt,
      sources: bySource.reduce((acc, item) => {
        acc[item.source] = item._count
        return acc
      }, {} as Record<string, number>),
      difficulties: byDifficulty.reduce((acc, item) => {
        acc[item.difficulty] = item._count
        return acc
      }, {} as Record<string, number>)
    }
  }
}