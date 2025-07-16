import { QuestionCategory } from './types'

export class QuestionClassifier {
  private categories: QuestionCategory[] = [
    {
      name: '함수_오류',
      keywords: ['#VALUE', '#REF', '#N/A', '#DIV/0', '#NAME', '#NULL', '#NUM', '오류', 'error', '에러'],
      priority: 1
    },
    {
      name: '함수_사용법',
      keywords: ['VLOOKUP', 'INDEX', 'MATCH', 'SUMIF', 'COUNTIF', 'IF', 'IFS', 'CONCATENATE', '함수', '수식', 'formula'],
      priority: 2
    },
    {
      name: 'VBA_매크로',
      keywords: ['VBA', '매크로', 'macro', 'Sub', 'Function', '모듈', 'module', '코드', 'code'],
      priority: 3
    },
    {
      name: '데이터_형식',
      keywords: ['텍스트', '숫자', '날짜', '형식', '변환', 'format', 'convert', '서식'],
      priority: 4
    },
    {
      name: '피벗_테이블',
      keywords: ['피벗', 'pivot', '피봇', '집계', 'summarize', '요약'],
      priority: 5
    },
    {
      name: '차트_그래프',
      keywords: ['차트', '그래프', 'chart', 'graph', '시각화', 'visualization'],
      priority: 6
    },
    {
      name: '데이터_처리',
      keywords: ['정렬', 'sort', '필터', 'filter', '중복', 'duplicate', '제거', 'remove'],
      priority: 7
    },
    {
      name: '파일_작업',
      keywords: ['저장', 'save', '열기', 'open', '가져오기', 'import', '내보내기', 'export'],
      priority: 8
    }
  ]
  
  classify(question: string): string {
    const lowerQuestion = question.toLowerCase()
    const scores = new Map<string, number>()
    
    // 각 카테고리별 점수 계산
    for (const category of this.categories) {
      let score = 0
      
      for (const keyword of category.keywords) {
        if (lowerQuestion.includes(keyword.toLowerCase())) {
          // 키워드 길이에 따른 가중치
          const weight = keyword.length > 5 ? 2 : 1
          score += weight
        }
      }
      
      // 우선순위 반영
      if (score > 0) {
        score = score * (10 - category.priority)
        scores.set(category.name, score)
      }
    }
    
    // 가장 높은 점수의 카테고리 반환
    if (scores.size === 0) {
      return '기타'
    }
    
    const sortedScores = Array.from(scores.entries()).sort((a, b) => b[1] - a[1])
    return sortedScores[0][0]
  }
  
  extractKeywords(question: string): string[] {
    const keywords: string[] = []
    const lowerQuestion = question.toLowerCase()
    
    // 모든 카테고리의 키워드 확인
    for (const category of this.categories) {
      for (const keyword of category.keywords) {
        if (lowerQuestion.includes(keyword.toLowerCase())) {
          keywords.push(keyword)
        }
      }
    }
    
    // 추가 키워드 추출 (Excel 함수명 패턴)
    const functionPattern = /\b[A-Z]+(?:\.[A-Z]+)*\b/g
    const matches = question.match(functionPattern)
    if (matches) {
      keywords.push(...matches)
    }
    
    // 중복 제거 및 정렬
    return [...new Set(keywords)].sort()
  }
  
  getSuggestedCategories(question: string, maxCategories: number = 3): Array<{name: string, confidence: number}> {
    const lowerQuestion = question.toLowerCase()
    const scores = new Map<string, number>()
    
    // 각 카테고리별 점수 계산
    for (const category of this.categories) {
      let matchCount = 0
      let totalKeywords = category.keywords.length
      
      for (const keyword of category.keywords) {
        if (lowerQuestion.includes(keyword.toLowerCase())) {
          matchCount++
        }
      }
      
      if (matchCount > 0) {
        const confidence = (matchCount / totalKeywords) * 100
        scores.set(category.name, confidence)
      }
    }
    
    // 점수순 정렬 및 상위 N개 반환
    return Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxCategories)
      .map(([name, confidence]) => ({ name, confidence: Math.round(confidence) }))
  }
}