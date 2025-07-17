import OpenAI from 'openai'

export interface EmbeddingData {
  id: string
  text: string
  embedding: number[]
  metadata: {
    category: string
    quality_score: number
    source: string
    tags?: string[]
    [key: string]: any
  }
}

export interface EmbeddingBatch {
  texts: string[]
  metadatas: any[]
  ids: string[]
}

export class EmbeddingGenerator {
  private openai: OpenAI
  private model: string = 'text-embedding-3-small'
  private batchSize: number = 100
  private maxRetries: number = 3
  private retryDelay: number = 1000

  constructor(apiKey?: string) {
    this.openai = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    })
  }

  /**
   * 단일 텍스트에 대한 임베딩 생성
   */
  async generateSingleEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: text,
        encoding_format: 'float',
      })

      return response.data[0].embedding
    } catch (error) {
      console.error('단일 임베딩 생성 실패:', error)
      throw new Error(`임베딩 생성 실패: ${(error as Error).message}`)
    }
  }

  /**
   * 배치 단위로 임베딩 생성
   */
  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = []
    
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize)
      const batchEmbeddings = await this.processBatch(batch)
      embeddings.push(...batchEmbeddings)
      
      // Rate limiting을 위한 대기
      if (i + this.batchSize < texts.length) {
        await this.delay(200)
      }
    }
    
    return embeddings
  }

  /**
   * Q&A 데이터에서 임베딩 생성
   */
  async generateEmbeddingsFromQAData(qaData: any[]): Promise<EmbeddingData[]> {
    const embeddingData: EmbeddingData[] = []
    
    for (let i = 0; i < qaData.length; i += this.batchSize) {
      const batch = qaData.slice(i, i + this.batchSize)
      const batchResults = await this.processBatchWithRetry(batch)
      embeddingData.push(...batchResults)
      
      // 진행률 로그
      const progress = ((i + batch.length) / qaData.length) * 100
      console.log(`임베딩 생성 진행률: ${progress.toFixed(1)}%`)
      
      // Rate limiting을 위한 대기
      if (i + this.batchSize < qaData.length) {
        await this.delay(100)
      }
    }
    
    return embeddingData
  }

  /**
   * 배치 처리 (재시도 로직 포함)
   */
  private async processBatchWithRetry(batch: any[]): Promise<EmbeddingData[]> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.processBatchInternal(batch)
      } catch (error) {
        console.error(`배치 처리 실패 (${attempt}/${this.maxRetries}):`, error)
        
        if (attempt === this.maxRetries) {
          throw error
        }
        
        await this.delay(this.retryDelay * attempt)
      }
    }
    
    return []
  }

  /**
   * 배치 내부 처리
   */
  private async processBatchInternal(batch: any[]): Promise<EmbeddingData[]> {
    const texts = batch.map(item => this.combineQAText(item))
    const embeddings = await this.processBatch(texts)
    
    return batch.map((item, index) => ({
      id: item.id,
      text: texts[index],
      embedding: embeddings[index],
      metadata: {
        category: item.category,
        quality_score: item.quality_score || 0.5,
        source: item.source || 'unknown',
        tags: item.tags || [],
        difficulty: item.metadata?.difficulty,
        excel_version: item.metadata?.excel_version,
        view_count: item.metadata?.view_count,
        helpful_votes: item.metadata?.helpful_votes
      }
    }))
  }

  /**
   * OpenAI API 배치 처리
   */
  private async processBatch(texts: string[]): Promise<number[][]> {
    const response = await this.openai.embeddings.create({
      model: this.model,
      input: texts,
      encoding_format: 'float',
    })

    return response.data.map(item => item.embedding)
  }

  /**
   * 질문과 답변을 결합하여 임베딩용 텍스트 생성
   */
  private combineQAText(qaItem: any): string {
    const question = qaItem.question || ''
    const answer = qaItem.answer || ''
    const category = qaItem.category || ''
    const tags = qaItem.tags ? qaItem.tags.join(' ') : ''
    
    // 카테고리와 태그 정보를 포함하여 검색 성능 향상
    return `[${category}] ${question}\n\n${answer}\n\n태그: ${tags}`.trim()
  }

  /**
   * 임베딩 품질 검증
   */
  async validateEmbeddings(embeddingData: EmbeddingData[]): Promise<{
    validEmbeddings: EmbeddingData[]
    invalidEmbeddings: EmbeddingData[]
    validationReport: any
  }> {
    const validEmbeddings: EmbeddingData[] = []
    const invalidEmbeddings: EmbeddingData[] = []
    const validationReport = {
      total: embeddingData.length,
      valid: 0,
      invalid: 0,
      averageLength: 0,
      dimensionConsistency: true,
      errors: [] as string[]
    }

    for (const item of embeddingData) {
      try {
        // 임베딩 벡터 검증
        if (!Array.isArray(item.embedding)) {
          invalidEmbeddings.push(item)
          validationReport.errors.push(`${item.id}: 임베딩이 배열이 아닙니다`)
          continue
        }

        // 차원 검증 (text-embedding-3-small: 1536차원)
        if (item.embedding.length !== 1536) {
          invalidEmbeddings.push(item)
          validationReport.errors.push(`${item.id}: 임베딩 차원이 올바르지 않습니다 (${item.embedding.length}/1536)`)
          continue
        }

        // 값 검증 (NaN, Infinity 체크)
        const hasInvalidValues = item.embedding.some(val => 
          !isFinite(val) || isNaN(val)
        )
        
        if (hasInvalidValues) {
          invalidEmbeddings.push(item)
          validationReport.errors.push(`${item.id}: 임베딩에 유효하지 않은 값이 있습니다`)
          continue
        }

        validEmbeddings.push(item)
      } catch (error) {
        invalidEmbeddings.push(item)
        validationReport.errors.push(`${item.id}: 검증 중 오류 발생 - ${(error as Error).message}`)
      }
    }

    validationReport.valid = validEmbeddings.length
    validationReport.invalid = invalidEmbeddings.length
    validationReport.averageLength = validEmbeddings.reduce((sum, item) => sum + item.text.length, 0) / validEmbeddings.length

    return {
      validEmbeddings,
      invalidEmbeddings,
      validationReport
    }
  }

  /**
   * 임베딩 유사도 계산 (테스트용)
   */
  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('임베딩 차원이 일치하지 않습니다')
    }

    let dotProduct = 0
    let norm1 = 0
    let norm2 = 0

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i]
      norm1 += embedding1[i] * embedding1[i]
      norm2 += embedding2[i] * embedding2[i]
    }

    const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))
    return similarity
  }

  /**
   * 임베딩 생성 비용 계산
   */
  calculateCost(textCount: number, averageTokens: number = 100): number {
    // text-embedding-3-small: $0.02 per 1M tokens
    const pricePerMillion = 0.02
    const totalTokens = textCount * averageTokens
    return (totalTokens / 1000000) * pricePerMillion
  }

  /**
   * 지연 함수
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 설정 업데이트
   */
  updateConfig(config: {
    model?: string
    batchSize?: number
    maxRetries?: number
    retryDelay?: number
  }) {
    if (config.model) this.model = config.model
    if (config.batchSize) this.batchSize = config.batchSize
    if (config.maxRetries) this.maxRetries = config.maxRetries
    if (config.retryDelay) this.retryDelay = config.retryDelay
  }
}