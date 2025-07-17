import { ChromaApi, OpenAIEmbeddingFunction, Collection } from 'chromadb'
import { EmbeddingData } from './embedding-generator'

export interface VectorSearchResult {
  id: string
  score: number
  metadata: any
  document: string
}

export interface VectorDBConfig {
  host?: string
  port?: number
  ssl?: boolean
  database?: string
  collectionName?: string
}

export class VectorDB {
  private client: ChromaApi
  private collection: Collection | null = null
  private collectionName: string
  private initialized: boolean = false

  constructor(config: VectorDBConfig = {}) {
    this.collectionName = config.collectionName || 'excel_knowledge_base'
    
    // ChromaDB 클라이언트 초기화
    this.client = new ChromaApi({
      path: config.host || 'http://localhost:8000',
    })
  }

  /**
   * ChromaDB 연결 및 컬렉션 초기화
   */
  async initialize(): Promise<void> {
    try {
      // 기존 컬렉션 조회 또는 생성
      try {
        this.collection = await this.client.getCollection({
          name: this.collectionName,
        })
        console.log(`기존 컬렉션 연결: ${this.collectionName}`)
      } catch (error) {
        // 컬렉션이 없으면 새로 생성
        this.collection = await this.client.createCollection({
          name: this.collectionName,
          metadata: {
            description: 'Excel Q&A Knowledge Base',
            created_at: new Date().toISOString(),
            version: '1.0'
          }
        })
        console.log(`새 컬렉션 생성: ${this.collectionName}`)
      }
      
      this.initialized = true
    } catch (error) {
      console.error('VectorDB 초기화 실패:', error)
      throw new Error(`VectorDB 초기화 실패: ${(error as Error).message}`)
    }
  }

  /**
   * 임베딩 데이터 일괄 저장
   */
  async addEmbeddings(embeddingData: EmbeddingData[]): Promise<void> {
    if (!this.initialized || !this.collection) {
      throw new Error('VectorDB가 초기화되지 않았습니다')
    }

    try {
      const batchSize = 100
      
      for (let i = 0; i < embeddingData.length; i += batchSize) {
        const batch = embeddingData.slice(i, i + batchSize)
        
        await this.collection.add({
          ids: batch.map(item => item.id),
          embeddings: batch.map(item => item.embedding),
          metadatas: batch.map(item => item.metadata),
          documents: batch.map(item => item.text)
        })
        
        // 진행률 로그
        const progress = ((i + batch.length) / embeddingData.length) * 100
        console.log(`벡터 DB 저장 진행률: ${progress.toFixed(1)}%`)
        
        // Rate limiting을 위한 대기
        if (i + batchSize < embeddingData.length) {
          await this.delay(100)
        }
      }
      
      console.log(`${embeddingData.length}개 임베딩 저장 완료`)
    } catch (error) {
      console.error('임베딩 저장 실패:', error)
      throw new Error(`임베딩 저장 실패: ${(error as Error).message}`)
    }
  }

  /**
   * 단일 임베딩 추가
   */
  async addSingleEmbedding(embeddingData: EmbeddingData): Promise<void> {
    if (!this.initialized || !this.collection) {
      throw new Error('VectorDB가 초기화되지 않았습니다')
    }

    try {
      await this.collection.add({
        ids: [embeddingData.id],
        embeddings: [embeddingData.embedding],
        metadatas: [embeddingData.metadata],
        documents: [embeddingData.text]
      })
    } catch (error) {
      console.error('단일 임베딩 저장 실패:', error)
      throw new Error(`단일 임베딩 저장 실패: ${(error as Error).message}`)
    }
  }

  /**
   * 벡터 유사도 검색
   */
  async search(
    queryEmbedding: number[],
    limit: number = 5,
    filter?: any
  ): Promise<VectorSearchResult[]> {
    if (!this.initialized || !this.collection) {
      throw new Error('VectorDB가 초기화되지 않았습니다')
    }

    try {
      const results = await this.collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: limit,
        where: filter,
        include: ['metadatas', 'documents', 'distances']
      })

      // 결과 변환
      const searchResults: VectorSearchResult[] = []
      
      if (results.ids && results.ids[0]) {
        for (let i = 0; i < results.ids[0].length; i++) {
          searchResults.push({
            id: results.ids[0][i],
            score: 1 - (results.distances?.[0]?.[i] || 0), // 거리를 유사도로 변환
            metadata: results.metadatas?.[0]?.[i] || {},
            document: results.documents?.[0]?.[i] || ''
          })
        }
      }

      return searchResults
    } catch (error) {
      console.error('벡터 검색 실패:', error)
      throw new Error(`벡터 검색 실패: ${(error as Error).message}`)
    }
  }

  /**
   * 텍스트 기반 검색 (임베딩 생성 + 검색)
   */
  async searchByText(
    queryText: string,
    limit: number = 5,
    filter?: any
  ): Promise<VectorSearchResult[]> {
    // 이 메서드는 실제로는 EmbeddingGenerator와 연동해야 함
    // 현재는 임시 구현
    throw new Error('텍스트 기반 검색은 EmbeddingGenerator와 연동 필요')
  }

  /**
   * 카테고리별 검색
   */
  async searchByCategory(
    queryEmbedding: number[],
    category: string,
    limit: number = 5
  ): Promise<VectorSearchResult[]> {
    return this.search(queryEmbedding, limit, { category })
  }

  /**
   * 품질 점수 기반 필터링 검색
   */
  async searchByQuality(
    queryEmbedding: number[],
    minQuality: number = 0.7,
    limit: number = 5
  ): Promise<VectorSearchResult[]> {
    return this.search(queryEmbedding, limit, { 
      quality_score: { $gte: minQuality } 
    })
  }

  /**
   * 임베딩 업데이트
   */
  async updateEmbedding(
    id: string,
    newEmbedding: number[],
    newMetadata?: any,
    newDocument?: string
  ): Promise<void> {
    if (!this.initialized || !this.collection) {
      throw new Error('VectorDB가 초기화되지 않았습니다')
    }

    try {
      await this.collection.update({
        ids: [id],
        embeddings: [newEmbedding],
        metadatas: newMetadata ? [newMetadata] : undefined,
        documents: newDocument ? [newDocument] : undefined
      })
    } catch (error) {
      console.error('임베딩 업데이트 실패:', error)
      throw new Error(`임베딩 업데이트 실패: ${(error as Error).message}`)
    }
  }

  /**
   * 임베딩 삭제
   */
  async deleteEmbedding(id: string): Promise<void> {
    if (!this.initialized || !this.collection) {
      throw new Error('VectorDB가 초기화되지 않았습니다')
    }

    try {
      await this.collection.delete({
        ids: [id]
      })
    } catch (error) {
      console.error('임베딩 삭제 실패:', error)
      throw new Error(`임베딩 삭제 실패: ${(error as Error).message}`)
    }
  }

  /**
   * 여러 임베딩 삭제
   */
  async deleteEmbeddings(ids: string[]): Promise<void> {
    if (!this.initialized || !this.collection) {
      throw new Error('VectorDB가 초기화되지 않았습니다')
    }

    try {
      await this.collection.delete({
        ids: ids
      })
    } catch (error) {
      console.error('임베딩 일괄 삭제 실패:', error)
      throw new Error(`임베딩 일괄 삭제 실패: ${(error as Error).message}`)
    }
  }

  /**
   * 컬렉션 통계 조회
   */
  async getCollectionStats(): Promise<{
    count: number
    categories: { [key: string]: number }
    averageQuality: number
  }> {
    if (!this.initialized || !this.collection) {
      throw new Error('VectorDB가 초기화되지 않았습니다')
    }

    try {
      const count = await this.collection.count()
      
      // 모든 메타데이터 조회
      const allData = await this.collection.get({
        include: ['metadatas']
      })
      
      const categories: { [key: string]: number } = {}
      let totalQuality = 0
      let qualityCount = 0
      
      if (allData.metadatas) {
        allData.metadatas.forEach(metadata => {
          if (metadata) {
            // 카테고리 통계
            const category = metadata.category || 'unknown'
            categories[category] = (categories[category] || 0) + 1
            
            // 품질 점수 통계
            if (metadata.quality_score) {
              totalQuality += metadata.quality_score
              qualityCount++
            }
          }
        })
      }
      
      return {
        count,
        categories,
        averageQuality: qualityCount > 0 ? totalQuality / qualityCount : 0
      }
    } catch (error) {
      console.error('컬렉션 통계 조회 실패:', error)
      throw new Error(`컬렉션 통계 조회 실패: ${(error as Error).message}`)
    }
  }

  /**
   * 컬렉션 초기화 (모든 데이터 삭제)
   */
  async clearCollection(): Promise<void> {
    if (!this.initialized || !this.collection) {
      throw new Error('VectorDB가 초기화되지 않았습니다')
    }

    try {
      await this.client.deleteCollection({
        name: this.collectionName
      })
      
      // 컬렉션 재생성
      this.collection = await this.client.createCollection({
        name: this.collectionName,
        metadata: {
          description: 'Excel Q&A Knowledge Base',
          created_at: new Date().toISOString(),
          version: '1.0'
        }
      })
      
      console.log(`컬렉션 ${this.collectionName} 초기화 완료`)
    } catch (error) {
      console.error('컬렉션 초기화 실패:', error)
      throw new Error(`컬렉션 초기화 실패: ${(error as Error).message}`)
    }
  }

  /**
   * 연결 상태 확인
   */
  async healthCheck(): Promise<boolean> {
    try {
      const version = await this.client.version()
      console.log(`ChromaDB 버전: ${version}`)
      return true
    } catch (error) {
      console.error('ChromaDB 연결 실패:', error)
      return false
    }
  }

  /**
   * 지연 함수
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 리소스 정리
   */
  async cleanup(): Promise<void> {
    this.collection = null
    this.initialized = false
  }
}