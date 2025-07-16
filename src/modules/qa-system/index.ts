import { Redis } from 'ioredis'
import { QuestionClassifier } from './question-classifier'
import { QADocument, SearchResult, QASystemOptions, CrawledData } from './types'

// 간단한 인메모리 벡터 DB 구현 (실제로는 ChromaDB/Pinecone 사용)
class SimpleVectorDB {
  private documents: Map<string, QADocument> = new Map()
  private vectors: Map<string, number[]> = new Map()
  
  async add(documents: QADocument[]) {
    for (const doc of documents) {
      this.documents.set(doc.id, doc)
      // 간단한 벡터화 (실제로는 임베딩 모델 사용)
      const vector = this.textToVector(doc.title + ' ' + doc.content)
      this.vectors.set(doc.id, vector)
    }
  }
  
  async query(text: string, limit: number = 5): Promise<SearchResult[]> {
    const queryVector = this.textToVector(text)
    const similarities: Array<[string, number]> = []
    
    // 코사인 유사도 계산
    for (const [id, docVector] of this.vectors) {
      const similarity = this.cosineSimilarity(queryVector, docVector)
      similarities.push([id, similarity])
    }
    
    // 유사도순 정렬
    similarities.sort((a, b) => b[1] - a[1])
    
    // 상위 N개 반환
    return similarities.slice(0, limit).map(([id, similarity]) => {
      const doc = this.documents.get(id)!
      return {
        id: doc.id,
        title: doc.title,
        answer: doc.answer,
        category: doc.category,
        similarity
      }
    })
  }
  
  private textToVector(text: string): number[] {
    // 매우 간단한 벡터화 (실제로는 Word2Vec, BERT 등 사용)
    const words = text.toLowerCase().split(/\s+/)
    const vector = new Array(100).fill(0)
    
    for (let i = 0; i < words.length && i < 100; i++) {
      vector[i] = words[i].charCodeAt(0) / 255
    }
    
    return vector
  }
  
  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0
    let normA = 0
    let normB = 0
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
  }
}

export class QASystem {
  private vectorDB: SimpleVectorDB
  private cache: Redis | null = null
  private classifier: QuestionClassifier
  private options: QASystemOptions
  
  constructor(options: QASystemOptions = {}) {
    this.options = {
      collectionName: 'excel_qa',
      maxResults: 5,
      minSimilarity: 0.3,
      ...options
    }
    
    this.vectorDB = new SimpleVectorDB()
    this.classifier = new QuestionClassifier()
    
    // Redis 연결 (옵션)
    if (process.env.REDIS_URL) {
      this.cache = new Redis(process.env.REDIS_URL)
    }
  }
  
  async initialize() {
    console.log('Initializing Q&A System...')
    // 실제로는 여기서 ChromaDB 연결 등을 수행
  }
  
  async loadDocuments(documents: QADocument[]) {
    console.log(`Loading ${documents.length} documents into vector DB...`)
    await this.vectorDB.add(documents)
  }
  
  async loadOppaduData(jsonlPath: string) {
    console.log('Loading Oppadu data from:', jsonlPath)
    
    try {
      // 파일 읽기
      const fs = await import('fs/promises')
      const data = await fs.readFile(jsonlPath, 'utf-8')
      const lines = data.split('\n').filter(Boolean)
      
      const documents: QADocument[] = []
      
      for (const line of lines) {
        try {
          const rawData = JSON.parse(line)
          
          // QADocument 형식으로 변환
          const doc: QADocument = {
            id: rawData.id,
            title: rawData.title,
            content: rawData.question,
            answer: Array.isArray(rawData.answers) ? rawData.answers.join('\n\n') : rawData.answers,
            category: rawData.category,
            tags: rawData.tags || [],
            source: rawData.source,
            date: rawData.date,
            metadata: {
              url: rawData.url,
              view_count: rawData.view_count,
              answer_count: rawData.answer_count
            }
          }
          
          documents.push(doc)
        } catch (error) {
          console.error('Error parsing line:', error)
        }
      }
      
      await this.loadDocuments(documents)
      console.log(`Successfully loaded ${documents.length} documents from Oppadu`)
      
    } catch (error) {
      console.error('Error loading Oppadu data:', error)
      
      // 파일이 없을 경우 샘플 데이터 사용
      const sampleData: QADocument[] = [
        {
          id: 'oppadu_sample_001',
          title: 'VLOOKUP 함수가 #N/A 오류가 납니다',
          content: 'A열에서 B열의 값을 찾으려고 하는데 계속 #N/A가 나옵니다.',
          answer: 'VLOOKUP의 첫 번째 인수가 검색 범위의 첫 번째 열에 없을 때 #N/A 오류가 발생합니다. TRIM 함수로 공백을 제거해보세요.',
          category: '함수_오류',
          tags: ['VLOOKUP', '#N/A', '오류'],
          source: 'oppadu'
        },
        {
          id: 'oppadu_sample_002',
          title: '텍스트로 저장된 숫자를 숫자로 변환하는 방법',
          content: '데이터를 가져왔는데 숫자가 텍스트로 인식되어 SUM 함수가 작동하지 않습니다.',
          answer: '여러 방법이 있습니다: 1) 노란색 경고 표시 클릭 > 숫자로 변환, 2) VALUE 함수 사용',
          category: '데이터_형식',
          tags: ['텍스트', '숫자', '변환'],
          source: 'oppadu'
        }
      ]
      
      await this.loadDocuments(sampleData)
    }
  }
  
  async searchSimilarQuestions(query: string, limit?: number): Promise<SearchResult[]> {
    const maxResults = limit || this.options.maxResults || 5
    
    // 캐시 확인
    if (this.cache) {
      const cacheKey = `qa:search:${Buffer.from(query).toString('base64').substring(0, 20)}`
      const cached = await this.cache.get(cacheKey)
      
      if (cached) {
        console.log('Cache hit for query:', query)
        return JSON.parse(cached)
      }
    }
    
    // 벡터 검색
    const results = await this.vectorDB.query(query, maxResults)
    
    // 최소 유사도 필터링
    const filteredResults = results.filter(r => r.similarity >= (this.options.minSimilarity || 0.3))
    
    // 캐시 저장
    if (this.cache && filteredResults.length > 0) {
      const cacheKey = `qa:search:${Buffer.from(query).toString('base64').substring(0, 20)}`
      await this.cache.setex(cacheKey, 3600, JSON.stringify(filteredResults))
    }
    
    return filteredResults
  }
  
  async generateAnswer(question: string, context: SearchResult[]): Promise<string> {
    // 카테고리 분류
    const category = this.classifier.classify(question)
    const keywords = this.classifier.extractKeywords(question)
    
    console.log('Question category:', category)
    console.log('Keywords:', keywords)
    
    // 컨텍스트가 없으면 일반적인 답변
    if (context.length === 0) {
      return this.getGenericAnswer(category, keywords)
    }
    
    // AI API 호출 (실제로는 OpenAI/Claude API 사용)
    const prompt = this.buildPrompt(question, context, category)
    
    // 여기서는 간단한 템플릿 기반 답변 생성
    let answer = `"${question}"에 대한 답변입니다.\n\n`
    
    // 가장 유사한 Q&A 참조
    const bestMatch = context[0]
    if (bestMatch.similarity > 0.8) {
      answer += `유사한 문제의 해결 방법:\n${bestMatch.answer}\n\n`
    }
    
    // 카테고리별 추가 정보
    answer += this.getCategorySpecificAdvice(category, keywords)
    
    // 참고 자료
    if (context.length > 1) {
      answer += '\n\n관련 참고 자료:\n'
      context.slice(1, 3).forEach((result, idx) => {
        answer += `${idx + 1}. ${result.title}\n`
      })
    }
    
    return answer
  }
  
  private buildPrompt(question: string, context: SearchResult[], category: string): string {
    return `
당신은 Excel 전문가입니다. 사용자의 질문에 대해 명확하고 실용적인 답변을 제공하세요.

카테고리: ${category}

참고할 수 있는 유사한 Q&A:
${context.map(c => `Q: ${c.title}\nA: ${c.answer}`).join('\n\n')}

사용자 질문: ${question}

단계별로 명확하게 답변하고, 가능하다면 예시를 포함하세요.`
  }
  
  private getGenericAnswer(category: string, keywords: string[]): string {
    const genericAnswers: Record<string, string> = {
      '함수_오류': `Excel 함수 오류를 해결하기 위한 일반적인 방법:
1. 함수 구문을 확인하세요
2. 참조하는 셀의 데이터 타입을 확인하세요
3. 범위가 올바른지 확인하세요
4. 오류 처리 함수(IFERROR, IFNA)를 사용해보세요`,
      
      '함수_사용법': `Excel 함수 사용 팁:
1. 함수 마법사(fx 버튼)를 활용하세요
2. F1 키로 도움말을 확인하세요
3. 간단한 예제부터 시작하세요
4. 중첩 함수는 단계별로 구성하세요`,
      
      '데이터_형식': `데이터 형식 문제 해결:
1. 셀 서식을 확인하세요 (Ctrl+1)
2. TEXT, VALUE, DATEVALUE 함수를 활용하세요
3. 데이터 > 텍스트 나누기 기능을 사용해보세요
4. 찾기 및 바꾸기로 특수 문자를 제거하세요`,
      
      '기타': `Excel 관련 일반적인 도움말입니다. 더 구체적인 질문을 해주시면 더 정확한 답변을 드릴 수 있습니다.`
    }
    
    return genericAnswers[category] || genericAnswers['기타']
  }
  
  private getCategorySpecificAdvice(category: string, keywords: string[]): string {
    let advice = ''
    
    // 특정 키워드에 대한 조언
    if (keywords.includes('VLOOKUP')) {
      advice += '💡 팁: VLOOKUP 대신 INDEX/MATCH 조합을 사용하면 더 유연하고 빠릅니다.\n'
    }
    
    if (keywords.includes('#N/A')) {
      advice += '⚠️ #N/A 오류는 찾는 값이 없을 때 발생합니다. IFNA 함수로 오류를 처리하세요.\n'
    }
    
    if (keywords.includes('pivot') || keywords.includes('피벗')) {
      advice += '📊 피벗 테이블은 데이터 > 피벗 테이블에서 만들 수 있습니다.\n'
    }
    
    return advice
  }
  
  classifyQuestion(question: string): string {
    return this.classifier.classify(question)
  }
  
  extractKeywords(question: string): string[] {
    return this.classifier.extractKeywords(question)
  }
}

// Export all types and classes
export * from './types'
export { QuestionClassifier } from './question-classifier'