import { EventEmitter } from 'events'

export interface ProcessedQA {
  id: string
  original: {
    question: string
    answer: string
  }
  normalized: {
    question: string
    keywords: string[]
  }
  patterns: {
    errorType?: string
    excelFunction?: string[]
    problemCategory: string
  }
  solutions: {
    steps: string[]
    formula?: string
    alternativeMethods?: string[]
  }
  metadata: {
    difficulty: 'easy' | 'medium' | 'hard'
    excelVersions: string[]
    successRate: number
  }
}

export interface SemanticVector {
  text: string
  vector: number[]
  metadata: any
}

export class IntelligentQASystem extends EventEmitter {
  private processedData: Map<string, ProcessedQA> = new Map()
  private semanticIndex: Map<string, SemanticVector> = new Map()
  private patternDatabase: Map<string, any> = new Map()
  private synonymDict: Map<string, string[]> = new Map()
  
  constructor() {
    super()
    this.initializeSynonyms()
    this.initializePatterns()
  }
  
  private initializeSynonyms() {
    // Excel 함수 동의어
    this.synonymDict.set('vlookup', [
      'vlookup', 'v룩업', '브이룩업', 'v찾기', '수직찾기', 'vertical lookup'
    ])
    
    this.synonymDict.set('index', [
      'index', '인덱스', 'index함수', '색인'
    ])
    
    this.synonymDict.set('match', [
      'match', '매치', '일치', 'match함수', '찾기'
    ])
    
    // 오류 관련 동의어
    this.synonymDict.set('#n/a', [
      '#n/a', '#na', '#해당없음', 'na오류', 'n/a에러', '해당 없음'
    ])
    
    this.synonymDict.set('#ref', [
      '#ref', '#ref!', '참조오류', 'ref에러', '참조 오류'
    ])
    
    // 일반 용어
    this.synonymDict.set('error', [
      'error', '오류', '에러', '문제', '이슈', 'issue'
    ])
    
    this.synonymDict.set('circular', [
      'circular', '순환', '순환참조', '순환 참조', 'circular reference'
    ])
  }
  
  private initializePatterns() {
    // 오류 패턴 정의
    this.patternDatabase.set('vlookup_na', {
      indicators: ['vlookup', '#n/a', '찾을 수 없'],
      causes: [
        { cause: '데이터 형식 불일치', probability: 0.4 },
        { cause: '공백 문자', probability: 0.3 },
        { cause: '대소문자 차이', probability: 0.1 },
        { cause: '참조 범위 오류', probability: 0.2 }
      ],
      solutions: [
        { method: 'TRIM 함수 사용', effectiveness: 0.7 },
        { method: 'VALUE 함수로 형식 변환', effectiveness: 0.8 },
        { method: 'IFERROR로 오류 처리', effectiveness: 0.5 }
      ]
    })
    
    this.patternDatabase.set('circular_reference', {
      indicators: ['순환', '참조', '무한'],
      causes: [
        { cause: '자기 참조', probability: 0.6 },
        { cause: '간접 순환', probability: 0.4 }
      ],
      solutions: [
        { method: '수식 추적으로 순환 고리 찾기', effectiveness: 0.9 },
        { method: '반복 계산 활성화', effectiveness: 0.3 }
      ]
    })
  }
  
  /**
   * 질문을 정규화하고 키워드를 추출
   */
  normalizeQuestion(question: string): { normalized: string; keywords: string[] } {
    let normalized = question.toLowerCase()
    const keywords: string[] = []
    
    // 동의어를 표준 용어로 변환
    this.synonymDict.forEach((synonyms, standard) => {
      synonyms.forEach(synonym => {
        const regex = new RegExp(`\\b${synonym}\\b`, 'gi')
        if (regex.test(normalized)) {
          normalized = normalized.replace(regex, standard)
          keywords.push(standard)
        }
      })
    })
    
    // 추가 키워드 추출 (명사, 함수명 등)
    const functionPattern = /\b(sum|average|count|if|vlookup|index|match|sumif)\b/gi
    const matches = normalized.match(functionPattern)
    if (matches) {
      keywords.push(...matches.map(m => m.toLowerCase()))
    }
    
    return {
      normalized: normalized.trim(),
      keywords: [...new Set(keywords)]
    }
  }
  
  /**
   * 질문에서 패턴을 분석
   */
  analyzePattern(question: string, keywords: string[]): any {
    const patterns = {
      errorType: undefined as string | undefined,
      excelFunction: [] as string[],
      problemCategory: 'general'
    }
    
    // 오류 타입 감지
    const errorPatterns = [
      { pattern: /#n\/a|#na|해당.*없/i, type: '#N/A' },
      { pattern: /#ref|참조.*오류/i, type: '#REF!' },
      { pattern: /#value|값.*오류/i, type: '#VALUE!' },
      { pattern: /#div.*0|0.*나누/i, type: '#DIV/0!' }
    ]
    
    for (const { pattern, type } of errorPatterns) {
      if (pattern.test(question)) {
        patterns.errorType = type
        break
      }
    }
    
    // Excel 함수 추출
    const functionRegex = /\b(vlookup|hlookup|index|match|sumif|countif|if|iferror)\b/gi
    const functions = question.match(functionRegex)
    if (functions) {
      patterns.excelFunction = [...new Set(functions.map(f => f.toUpperCase()))]
    }
    
    // 문제 카테고리 분류
    if (keywords.includes('vlookup') || keywords.includes('index')) {
      patterns.problemCategory = 'lookup'
    } else if (keywords.includes('circular') || keywords.includes('순환')) {
      patterns.problemCategory = 'circular_reference'
    } else if (keywords.includes('pivot') || keywords.includes('피벗')) {
      patterns.problemCategory = 'pivot'
    } else if (keywords.includes('vba') || keywords.includes('macro')) {
      patterns.problemCategory = 'vba'
    }
    
    return patterns
  }
  
  /**
   * 답변에서 구조화된 솔루션 추출
   */
  extractSolutions(answer: string): any {
    const solutions = {
      steps: [] as string[],
      formula: undefined as string | undefined,
      alternativeMethods: [] as string[]
    }
    
    // 단계별 해결 방법 추출
    const stepPattern = /(\d+[\)\.]\s*[^\n]+)/g
    const steps = answer.match(stepPattern)
    if (steps) {
      solutions.steps = steps.map(s => s.trim())
    }
    
    // Excel 수식 추출
    const formulaPattern = /=\s*[A-Z]+\([^)]+\)/gi
    const formulas = answer.match(formulaPattern)
    if (formulas) {
      solutions.formula = formulas[0]
    }
    
    // 대체 방법 감지
    if (answer.includes('또는') || answer.includes('대신')) {
      const alternativePattern = /(또는|대신)[^.!?]+[.!?]/g
      const alternatives = answer.match(alternativePattern)
      if (alternatives) {
        solutions.alternativeMethods = alternatives.map(a => a.trim())
      }
    }
    
    return solutions
  }
  
  /**
   * 난이도 평가
   */
  assessDifficulty(patterns: any, solutions: any): 'easy' | 'medium' | 'hard' {
    let score = 0
    
    // 패턴 복잡도
    if (patterns.excelFunction.length > 2) score += 2
    if (patterns.errorType) score += 1
    if (patterns.problemCategory === 'vba') score += 3
    
    // 솔루션 복잡도
    if (solutions.steps.length > 3) score += 2
    if (solutions.formula && solutions.formula.length > 50) score += 1
    
    if (score <= 2) return 'easy'
    if (score <= 5) return 'medium'
    return 'hard'
  }
  
  /**
   * Q&A 데이터 처리 및 인덱싱
   */
  async processQAData(rawQA: any): Promise<ProcessedQA> {
    const { normalized, keywords } = this.normalizeQuestion(rawQA.question)
    const patterns = this.analyzePattern(rawQA.question, keywords)
    const solutions = this.extractSolutions(rawQA.answer || rawQA.answers?.join(' ') || '')
    
    const processed: ProcessedQA = {
      id: rawQA.id,
      original: {
        question: rawQA.question,
        answer: rawQA.answer || rawQA.answers?.join('\n') || ''
      },
      normalized: {
        question: normalized,
        keywords
      },
      patterns,
      solutions,
      metadata: {
        difficulty: this.assessDifficulty(patterns, solutions),
        excelVersions: this.detectExcelVersions(rawQA.question),
        successRate: 0.7 // 초기값, 사용자 피드백으로 업데이트
      }
    }
    
    // 인덱싱
    this.processedData.set(processed.id, processed)
    
    // 의미적 벡터 생성 (실제로는 임베딩 모델 사용)
    const vector = await this.generateSemanticVector(normalized)
    this.semanticIndex.set(processed.id, {
      text: normalized,
      vector,
      metadata: processed
    })
    
    return processed
  }
  
  /**
   * Excel 버전 감지
   */
  private detectExcelVersions(text: string): string[] {
    const versions: string[] = []
    const versionPatterns = [
      { pattern: /excel\s*365/i, version: 'Excel 365' },
      { pattern: /excel\s*2019/i, version: 'Excel 2019' },
      { pattern: /excel\s*2016/i, version: 'Excel 2016' },
      { pattern: /office\s*365/i, version: 'Excel 365' }
    ]
    
    versionPatterns.forEach(({ pattern, version }) => {
      if (pattern.test(text)) {
        versions.push(version)
      }
    })
    
    return versions.length > 0 ? versions : ['Excel 2019'] // 기본값
  }
  
  /**
   * 의미적 벡터 생성 (간단한 구현)
   */
  private async generateSemanticVector(text: string): Promise<number[]> {
    // 실제로는 Sentence-BERT 등 사용
    // 여기서는 간단한 TF-IDF 스타일 벡터
    const words = text.split(/\s+/)
    const vector = new Array(100).fill(0)
    
    words.forEach((word, idx) => {
      const hash = this.hashCode(word)
      vector[Math.abs(hash) % 100] += 1
    })
    
    // 정규화
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))
    return magnitude > 0 ? vector.map(val => val / magnitude) : vector
  }
  
  private hashCode(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return hash
  }
  
  /**
   * 지능형 검색
   */
  async search(query: string, limit: number = 5): Promise<any[]> {
    const { normalized, keywords } = this.normalizeQuestion(query)
    const queryPatterns = this.analyzePattern(query, keywords)
    const queryVector = await this.generateSemanticVector(normalized)
    
    const results: any[] = []
    
    // 각 문서와 유사도 계산
    this.semanticIndex.forEach((doc, id) => {
      const semanticScore = this.cosineSimilarity(queryVector, doc.vector)
      const keywordScore = this.keywordOverlap(keywords, doc.metadata.normalized.keywords)
      const patternScore = this.patternMatch(queryPatterns, doc.metadata.patterns)
      
      // 가중 평균
      const totalScore = semanticScore * 0.4 + keywordScore * 0.3 + patternScore * 0.3
      
      results.push({
        id,
        score: totalScore,
        data: doc.metadata
      })
    })
    
    // 상위 N개 반환
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }
  
  /**
   * 코사인 유사도
   */
  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    let dotProduct = 0
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i]
    }
    return dotProduct
  }
  
  /**
   * 키워드 중복도
   */
  private keywordOverlap(keywords1: string[], keywords2: string[]): number {
    const set1 = new Set(keywords1)
    const set2 = new Set(keywords2)
    const intersection = new Set([...set1].filter(x => set2.has(x)))
    const union = new Set([...set1, ...set2])
    
    return union.size > 0 ? intersection.size / union.size : 0
  }
  
  /**
   * 패턴 일치도
   */
  private patternMatch(pattern1: any, pattern2: any): number {
    let score = 0
    let total = 0
    
    if (pattern1.errorType && pattern2.errorType) {
      total += 1
      if (pattern1.errorType === pattern2.errorType) score += 1
    }
    
    if (pattern1.problemCategory && pattern2.problemCategory) {
      total += 1
      if (pattern1.problemCategory === pattern2.problemCategory) score += 1
    }
    
    if (pattern1.excelFunction.length > 0 && pattern2.excelFunction.length > 0) {
      total += 1
      const overlap = pattern1.excelFunction.filter((f: string) => 
        pattern2.excelFunction.includes(f)
      ).length
      score += overlap / Math.max(pattern1.excelFunction.length, pattern2.excelFunction.length)
    }
    
    return total > 0 ? score / total : 0
  }
  
  /**
   * 지능형 답변 생성
   */
  async generateAnswer(query: string, searchResults: any[]): Promise<any> {
    if (searchResults.length === 0) {
      return this.generateGenericAnswer(query)
    }
    
    // 가장 관련성 높은 결과들 분석
    const topResults = searchResults.slice(0, 3)
    const patterns = this.extractCommonPatterns(topResults)
    const solutions = this.synthesizeSolutions(topResults, query)
    
    // 신뢰도 계산
    const confidence = this.calculateConfidence(searchResults)
    
    return {
      answer: solutions.primary,
      steps: solutions.steps,
      alternatives: solutions.alternatives,
      relatedCases: topResults.map(r => ({
        question: r.data.original.question,
        similarity: r.score
      })),
      confidence,
      metadata: {
        patterns,
        difficulty: this.assessOverallDifficulty(topResults)
      }
    }
  }
  
  /**
   * 공통 패턴 추출
   */
  private extractCommonPatterns(results: any[]): any {
    const errorTypes = new Map<string, number>()
    const functions = new Map<string, number>()
    const categories = new Map<string, number>()
    
    results.forEach(r => {
      const patterns = r.data.patterns
      
      if (patterns.errorType) {
        errorTypes.set(patterns.errorType, (errorTypes.get(patterns.errorType) || 0) + 1)
      }
      
      patterns.excelFunction.forEach((f: string) => {
        functions.set(f, (functions.get(f) || 0) + 1)
      })
      
      categories.set(patterns.problemCategory, 
        (categories.get(patterns.problemCategory) || 0) + 1)
    })
    
    return {
      commonError: this.getMostFrequent(errorTypes),
      commonFunctions: Array.from(functions.keys()),
      primaryCategory: this.getMostFrequent(categories)
    }
  }
  
  private getMostFrequent(map: Map<string, number>): string | undefined {
    let maxCount = 0
    let mostFrequent: string | undefined
    
    map.forEach((count, key) => {
      if (count > maxCount) {
        maxCount = count
        mostFrequent = key
      }
    })
    
    return mostFrequent
  }
  
  /**
   * 솔루션 합성
   */
  private synthesizeSolutions(results: any[], query: string): any {
    const allSteps: string[] = []
    const allFormulas: string[] = []
    const allAlternatives: string[] = []
    
    results.forEach(r => {
      const solutions = r.data.solutions
      allSteps.push(...solutions.steps)
      if (solutions.formula) allFormulas.push(solutions.formula)
      allAlternatives.push(...solutions.alternativeMethods)
    })
    
    // 중복 제거 및 우선순위 정렬
    const uniqueSteps = this.deduplicateAndPrioritize(allSteps)
    const uniqueFormulas = [...new Set(allFormulas)]
    const uniqueAlternatives = [...new Set(allAlternatives)]
    
    // 주요 솔루션 구성
    const primarySolution = this.constructPrimarySolution(
      query, 
      uniqueSteps, 
      uniqueFormulas[0]
    )
    
    return {
      primary: primarySolution,
      steps: uniqueSteps.slice(0, 5),
      alternatives: uniqueAlternatives.slice(0, 3)
    }
  }
  
  private deduplicateAndPrioritize(items: string[]): string[] {
    const frequency = new Map<string, number>()
    
    items.forEach(item => {
      const normalized = item.toLowerCase().trim()
      frequency.set(normalized, (frequency.get(normalized) || 0) + 1)
    })
    
    return Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([item]) => items.find(i => i.toLowerCase().trim() === item) || item)
  }
  
  private constructPrimarySolution(query: string, steps: string[], formula?: string): string {
    let solution = `"${query}"에 대한 해결 방법:\n\n`
    
    if (steps.length > 0) {
      solution += "단계별 해결 과정:\n"
      steps.forEach((step, idx) => {
        solution += `${idx + 1}. ${step}\n`
      })
    }
    
    if (formula) {
      solution += `\n추천 수식: ${formula}\n`
    }
    
    return solution
  }
  
  /**
   * 신뢰도 계산
   */
  private calculateConfidence(results: any[]): number {
    if (results.length === 0) return 0.1
    
    const topScore = results[0].score
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length
    
    // 상위 점수가 높고, 평균도 높으면 신뢰도 높음
    const confidence = topScore * 0.7 + avgScore * 0.3
    
    return Math.min(confidence, 0.95) // 최대 95%
  }
  
  private assessOverallDifficulty(results: any[]): string {
    const difficulties = results.map(r => r.data.metadata.difficulty)
    const difficultyScores = {
      'easy': 1,
      'medium': 2,
      'hard': 3
    }
    
    const avgScore = difficulties.reduce((sum, d) => sum + difficultyScores[d], 0) / difficulties.length
    
    if (avgScore <= 1.5) return 'easy'
    if (avgScore <= 2.5) return 'medium'
    return 'hard'
  }
  
  private generateGenericAnswer(query: string): any {
    const { normalized, keywords } = this.normalizeQuestion(query)
    const patterns = this.analyzePattern(query, keywords)
    
    let answer = "직접적인 해결 사례를 찾지 못했지만, 다음을 시도해보세요:\n\n"
    
    // 패턴 기반 일반 조언
    if (patterns.errorType) {
      answer += `${patterns.errorType} 오류 해결 일반 방법:\n`
      answer += "1. 데이터 형식 확인\n"
      answer += "2. 참조 범위 검증\n"
      answer += "3. 수식 문법 확인\n"
    }
    
    if (patterns.excelFunction.length > 0) {
      answer += `\n${patterns.excelFunction.join(', ')} 함수 사용 팁:\n`
      answer += "- 정확한 문법 확인\n"
      answer += "- 인수 타입 검증\n"
      answer += "- 범위 참조 확인\n"
    }
    
    return {
      answer,
      steps: [],
      alternatives: [],
      relatedCases: [],
      confidence: 0.3,
      metadata: {
        patterns,
        difficulty: 'unknown'
      }
    }
  }
  
  /**
   * 시스템 학습 및 개선
   */
  async updateFromFeedback(queryId: string, feedback: {
    helpful: boolean
    actualSolution?: string
  }): Promise<void> {
    const processed = this.processedData.get(queryId)
    if (!processed) return
    
    // 성공률 업데이트
    const currentRate = processed.metadata.successRate
    const newRate = feedback.helpful 
      ? currentRate * 0.9 + 0.1 
      : currentRate * 0.9
    
    processed.metadata.successRate = newRate
    
    // 실제 해결책이 제공된 경우 학습
    if (feedback.actualSolution) {
      const newSolutions = this.extractSolutions(feedback.actualSolution)
      processed.solutions.alternativeMethods.push(...newSolutions.steps)
    }
    
    this.emit('learning-update', { queryId, feedback })
  }
}