import { EmbeddingGenerator } from './embedding-generator'
import { VectorDB, VectorSearchResult } from './vector-db'
import { OpenRouterProvider } from './providers/openrouter'

export interface RAGContext {
  question: string
  similarDocuments: VectorSearchResult[]
  categories: string[]
  averageQuality: number
  totalResults: number
}

export interface RAGResponse {
  answer: string
  confidence: number
  sources: {
    id: string
    title: string
    category: string
    quality: number
    similarity: number
    source: 'stackoverflow' | 'reddit' | 'manual'
    sourceMetadata?: {
      platform?: string
      votes?: number
      isAccepted?: boolean
      opConfirmed?: boolean
      threadUrl?: string
    }
  }[]
  context: RAGContext
  processingTime: number
}

export interface RAGConfig {
  embeddingModel?: string
  maxContextLength?: number
  minSimilarity?: number
  maxResults?: number
  qualityThreshold?: number
  answerModel?: string
  temperature?: number
}

export class RAGService {
  private embeddingGenerator: EmbeddingGenerator
  private vectorDB: VectorDB
  private aiProvider: OpenRouterProvider
  private config: RAGConfig
  private initialized: boolean = false

  constructor(config: RAGConfig = {}) {
    this.config = {
      embeddingModel: 'text-embedding-3-small',
      maxContextLength: 4000,
      minSimilarity: 0.3,
      maxResults: 5,
      qualityThreshold: 0.5,
      answerModel: 'deepseek/deepseek-chat',
      temperature: 0.7,
      ...config
    }

    this.embeddingGenerator = new EmbeddingGenerator()
    this.vectorDB = new VectorDB()
    this.aiProvider = new OpenRouterProvider(
      process.env.OPENROUTER_API_KEY || '',
      this.config.answerModel || 'deepseek/deepseek-chat'
    )
  }

  /**
   * RAG 서비스 초기화
   */
  async initialize(): Promise<void> {
    try {
      console.log('RAG 서비스 초기화 시작...')
      
      // 벡터 DB 초기화
      await this.vectorDB.initialize()
      
      // 연결 상태 확인
      const isHealthy = await this.vectorDB.healthCheck()
      if (!isHealthy) {
        throw new Error('VectorDB 연결 실패')
      }
      
      this.initialized = true
      console.log('RAG 서비스 초기화 완료')
    } catch (error) {
      console.error('RAG 서비스 초기화 실패:', error)
      throw new Error(`RAG 서비스 초기화 실패: ${(error as Error).message}`)
    }
  }

  /**
   * 질문에 대한 답변 생성
   */
  async generateAnswer(question: string): Promise<RAGResponse> {
    if (!this.initialized) {
      throw new Error('RAG 서비스가 초기화되지 않았습니다')
    }

    const startTime = Date.now()

    try {
      // 1. 질문 임베딩 생성
      const queryEmbedding = await this.embeddingGenerator.generateSingleEmbedding(question)
      
      // 2. 유사한 문서 검색
      const similarDocuments = await this.searchSimilarDocuments(queryEmbedding, question)
      
      // 3. 컨텍스트 구성
      const context = this.buildContext(question, similarDocuments)
      
      // 4. AI 답변 생성
      const answer = await this.generateAIAnswer(context)
      
      // 5. 신뢰도 점수 계산
      const confidence = this.calculateConfidence(context, answer)
      
      // 6. 소스 정보 추출
      const sources = this.extractSources(similarDocuments)
      
      const processingTime = Date.now() - startTime

      return {
        answer,
        confidence,
        sources,
        context,
        processingTime
      }
    } catch (error) {
      console.error('답변 생성 실패:', error)
      throw new Error(`답변 생성 실패: ${(error as Error).message}`)
    }
  }

  /**
   * 유사한 문서 검색
   */
  private async searchSimilarDocuments(
    queryEmbedding: number[],
    question: string
  ): Promise<VectorSearchResult[]> {
    // 1. 기본 검색
    let results = await this.vectorDB.search(
      queryEmbedding,
      this.config.maxResults! * 2 // 더 많이 검색 후 필터링
    )

    // 2. 최소 유사도 필터링
    results = results.filter(result => result.score >= this.config.minSimilarity!)

    // 3. 품질 점수 필터링
    results = results.filter(result => 
      result.metadata.quality_score >= this.config.qualityThreshold!
    )

    // 4. 카테고리 다양성 보장
    results = this.diversifyByCategory(results)

    // 5. 최종 결과 수 제한
    return results.slice(0, this.config.maxResults!)
  }

  /**
   * 카테고리별 다양성 보장
   */
  private diversifyByCategory(results: VectorSearchResult[]): VectorSearchResult[] {
    const categoryMap = new Map<string, VectorSearchResult[]>()
    
    // 카테고리별로 그룹화
    results.forEach(result => {
      const category = result.metadata.category || 'unknown'
      if (!categoryMap.has(category)) {
        categoryMap.set(category, [])
      }
      categoryMap.get(category)!.push(result)
    })
    
    // 각 카테고리에서 최대 2개씩 선택
    const diversifiedResults: VectorSearchResult[] = []
    const maxPerCategory = 2
    
    // 유사도 순으로 정렬된 결과에서 카테고리별로 선택
    for (const result of results) {
      const category = result.metadata.category || 'unknown'
      const categoryResults = categoryMap.get(category)!
      const selectedFromCategory = diversifiedResults.filter(r => 
        r.metadata.category === category
      ).length
      
      if (selectedFromCategory < maxPerCategory) {
        diversifiedResults.push(result)
      }
    }
    
    return diversifiedResults
  }

  /**
   * 컨텍스트 구성
   */
  private buildContext(question: string, documents: VectorSearchResult[]): RAGContext {
    const categories = [...new Set(documents.map(doc => doc.metadata.category))]
    const averageQuality = documents.reduce((sum, doc) => sum + doc.metadata.quality_score, 0) / documents.length
    
    return {
      question,
      similarDocuments: documents,
      categories,
      averageQuality,
      totalResults: documents.length
    }
  }

  /**
   * AI 답변 생성
   */
  private async generateAIAnswer(context: RAGContext): Promise<string> {
    const prompt = this.buildPrompt(context)
    
    try {
      const response = await this.aiProvider.generateResponse(
        prompt,
        {
          systemPrompt: '당신은 Excel 전문가입니다. 제공된 컨텍스트를 기반으로 정확한 답변을 제공하세요.',
          temperature: this.config.temperature!,
          maxTokens: 1000
        }
      )
      
      return response.content || '답변을 생성할 수 없습니다.'
    } catch (error) {
      console.error('AI 답변 생성 실패:', error)
      return '죄송합니다. 현재 답변을 생성할 수 없습니다. 잠시 후 다시 시도해주세요.'
    }
  }

  /**
   * 프롬프트 구성
   */
  private buildPrompt(context: RAGContext): string {
    const contextDocs = context.similarDocuments.map((doc, index) => {
      const source = this.determineDataSource(doc.metadata)
      const sourceLabel = source === 'stackoverflow' ? 'Stack Overflow' : 
                         source === 'reddit' ? 'Reddit' : '수동 입력'
      
      return `[참고자료 ${index + 1}] (출처: ${sourceLabel}, 카테고리: ${doc.metadata.category}, 품질: ${doc.metadata.quality_score.toFixed(2)})\n${doc.document.substring(0, 500)}...\n`
    }).join('\n')

    return `당신은 Excel 전문가입니다. 사용자의 질문에 대해 제공된 참고자료를 바탕으로 정확하고 실용적인 답변을 제공하세요.

사용자 질문: ${context.question}

참고자료 (Stack Overflow, Reddit 커뮤니티, 전문 자료 포함):
${contextDocs}

답변 작성 지침:
1. 참고자료의 내용을 종합하여 답변하세요
2. 구체적인 Excel 함수나 단계별 해결 방법을 포함하세요
3. 가능한 경우 예시를 들어 설명하세요
4. 여러 해결 방법이 있다면 모두 제시하세요
5. Stack Overflow와 Reddit 등 다양한 커뮤니티의 경험을 활용하세요
6. 한국어로 답변하세요
7. 참고자료에 없는 내용은 추측하지 마세요

답변:`
  }

  /**
   * 신뢰도 점수 계산
   */
  private calculateConfidence(context: RAGContext, answer: string): number {
    let confidence = 0

    // 1. 검색 결과 품질 기반 (40%)
    const avgSimilarity = context.similarDocuments.reduce((sum, doc) => sum + doc.score, 0) / context.similarDocuments.length
    confidence += avgSimilarity * 0.4

    // 2. 문서 품질 점수 기반 (30%)
    confidence += context.averageQuality * 0.3

    // 3. 답변 길이 및 구체성 기반 (20%)
    const answerQuality = Math.min(answer.length / 200, 1) * 0.2
    confidence += answerQuality

    // 4. 카테고리 일치도 기반 (10%)
    const categoryConsistency = context.categories.length <= 2 ? 0.1 : 0.05
    confidence += categoryConsistency

    return Math.min(confidence, 1)
  }

  /**
   * 소스 정보 추출
   */
  private extractSources(documents: VectorSearchResult[]): RAGResponse['sources'] {
    return documents.map(doc => ({
      id: doc.id,
      title: this.extractTitle(doc.document),
      category: doc.metadata.category,
      quality: doc.metadata.quality_score,
      similarity: doc.score,
      source: this.determineDataSource(doc.metadata),
      sourceMetadata: this.extractSourceMetadata(doc.metadata)
    }))
  }

  /**
   * 데이터 소스 판별
   */
  private determineDataSource(metadata: any): 'stackoverflow' | 'reddit' | 'manual' {
    if (metadata.source === 'stackoverflow') return 'stackoverflow'
    if (metadata.source === 'reddit') return 'reddit'
    if (metadata.platform === 'stackoverflow') return 'stackoverflow'
    if (metadata.platform === 'reddit') return 'reddit'
    return 'manual'
  }

  /**
   * 소스별 메타데이터 추출
   */
  private extractSourceMetadata(metadata: any): any {
    const baseMetadata = {
      platform: metadata.source || metadata.platform || 'unknown'
    }

    // Stack Overflow 메타데이터
    if (metadata.source === 'stackoverflow' || metadata.platform === 'stackoverflow') {
      return {
        ...baseMetadata,
        votes: metadata.score || metadata.votes || 0,
        isAccepted: metadata.is_accepted || metadata.accepted || false,
        threadUrl: metadata.url || metadata.link
      }
    }

    // Reddit 메타데이터
    if (metadata.source === 'reddit' || metadata.platform === 'reddit') {
      return {
        ...baseMetadata,
        votes: metadata.submission_score || metadata.score || 0,
        opConfirmed: metadata.op_confirmed || false,
        threadUrl: metadata.reddit_url || metadata.url || metadata.permalink
      }
    }

    return baseMetadata
  }

  /**
   * 문서에서 제목 추출
   */
  private extractTitle(document: string): string {
    const firstLine = document.split('\n')[0]
    if (firstLine.startsWith('[') && firstLine.includes(']')) {
      return firstLine.substring(firstLine.indexOf(']') + 1).trim().substring(0, 50)
    }
    return firstLine.substring(0, 50)
  }

  /**
   * 카테고리별 검색
   */
  async searchByCategory(question: string, category: string): Promise<RAGResponse> {
    if (!this.initialized) {
      throw new Error('RAG 서비스가 초기화되지 않았습니다')
    }

    const queryEmbedding = await this.embeddingGenerator.generateSingleEmbedding(question)
    const results = await this.vectorDB.searchByCategory(queryEmbedding, category, this.config.maxResults!)
    
    const context = this.buildContext(question, results)
    const answer = await this.generateAIAnswer(context)
    const confidence = this.calculateConfidence(context, answer)
    const sources = this.extractSources(results)

    return {
      answer,
      confidence,
      sources,
      context,
      processingTime: 0
    }
  }

  /**
   * 품질 기반 검색
   */
  async searchByQuality(question: string, minQuality: number = 0.8): Promise<RAGResponse> {
    if (!this.initialized) {
      throw new Error('RAG 서비스가 초기화되지 않았습니다')
    }

    const queryEmbedding = await this.embeddingGenerator.generateSingleEmbedding(question)
    const results = await this.vectorDB.searchByQuality(queryEmbedding, minQuality, this.config.maxResults!)
    
    const context = this.buildContext(question, results)
    const answer = await this.generateAIAnswer(context)
    const confidence = this.calculateConfidence(context, answer)
    const sources = this.extractSources(results)

    return {
      answer,
      confidence,
      sources,
      context,
      processingTime: 0
    }
  }

  /**
   * 지식 베이스에 새로운 지식 추가
   */
  async addKnowledge(qaData: any): Promise<void> {
    if (!this.initialized) {
      throw new Error('RAG 서비스가 초기화되지 않았습니다')
    }

    const embeddingData = await this.embeddingGenerator.generateEmbeddingsFromQAData([qaData])
    await this.vectorDB.addEmbeddings(embeddingData)
  }

  /**
   * 지식 베이스 통계 조회
   */
  async getKnowledgeStats() {
    if (!this.initialized) {
      throw new Error('RAG 서비스가 초기화되지 않았습니다')
    }

    return await this.vectorDB.getCollectionStats()
  }

  /**
   * 설정 업데이트
   */
  updateConfig(newConfig: Partial<RAGConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    // 임베딩 생성기 설정 업데이트
    if (newConfig.embeddingModel) {
      this.embeddingGenerator.updateConfig({ model: newConfig.embeddingModel })
    }
  }

  /**
   * 리소스 정리
   */
  async cleanup(): Promise<void> {
    await this.vectorDB.cleanup()
    this.initialized = false
  }
}