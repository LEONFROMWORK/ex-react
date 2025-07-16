import { IntelligentQASystem } from '../index'

describe('IntelligentQASystem', () => {
  let qaSystem: IntelligentQASystem

  beforeEach(() => {
    qaSystem = new IntelligentQASystem()
  })

  describe('Synonym Normalization', () => {
    it('should normalize Korean Excel function names', () => {
      const testCases = [
        { input: 'v룩업 오류가 발생합니다', expected: 'vlookup' },
        { input: '브이룩업에서 #NA 에러', expected: 'vlookup' },
        { input: '참조오류가 계속 나타나요', expected: '#ref' },
        { input: '순환 참조 문제 해결', expected: 'circular' }
      ]

      testCases.forEach(({ input, expected }) => {
        const { normalized, keywords } = qaSystem.normalizeQuestion(input)
        expect(normalized).toContain(expected)
        expect(keywords).toContain(expected)
      })
    })

    it('should extract multiple keywords', () => {
      const { normalized, keywords } = qaSystem.normalizeQuestion(
        'VLOOKUP 함수에서 #N/A 오류가 발생하고 순환참조도 있습니다'
      )
      
      expect(keywords).toContain('vlookup')
      expect(keywords).toContain('#n/a')
      expect(keywords).toContain('circular')
    })

    it('should handle function patterns', () => {
      const { keywords } = qaSystem.normalizeQuestion(
        'SUM과 AVERAGE를 사용한 SUMIF 수식'
      )
      
      expect(keywords).toContain('sum')
      expect(keywords).toContain('average')
      expect(keywords).toContain('sumif')
    })
  })

  describe('Pattern Analysis', () => {
    it('should detect error types correctly', () => {
      const testCases = [
        { question: '#N/A 오류 해결', expectedError: '#N/A' },
        { question: '참조 오류가 발생', expectedError: '#REF!' },
        { question: '#VALUE 에러', expectedError: '#VALUE!' },
        { question: '0으로 나누기 오류', expectedError: '#DIV/0!' }
      ]

      testCases.forEach(({ question, expectedError }) => {
        const { keywords } = qaSystem.normalizeQuestion(question)
        const patterns = qaSystem.analyzePattern(question, keywords)
        expect(patterns.errorType).toBe(expectedError)
      })
    })

    it('should extract Excel functions', () => {
      const question = 'VLOOKUP과 INDEX MATCH 조합 사용'
      const { keywords } = qaSystem.normalizeQuestion(question)
      const patterns = qaSystem.analyzePattern(question, keywords)
      
      expect(patterns.excelFunction).toContain('VLOOKUP')
      expect(patterns.excelFunction).toContain('INDEX')
      expect(patterns.excelFunction).toContain('MATCH')
    })

    it('should classify problem categories', () => {
      const testCases = [
        { question: 'VLOOKUP 사용법', category: 'lookup' },
        { question: '순환 참조 오류', category: 'circular_reference' },
        { question: '피벗 테이블 만들기', category: 'pivot' },
        { question: 'VBA 매크로 실행', category: 'vba' }
      ]

      testCases.forEach(({ question, category }) => {
        const { keywords } = qaSystem.normalizeQuestion(question)
        const patterns = qaSystem.analyzePattern(question, keywords)
        expect(patterns.problemCategory).toBe(category)
      })
    })
  })

  describe('Solution Extraction', () => {
    it('should extract step-by-step solutions', () => {
      const answer = `해결 방법:
1. 데이터 형식을 확인하세요
2. TRIM 함수로 공백을 제거하세요
3. VALUE 함수로 텍스트를 숫자로 변환하세요`

      const solutions = qaSystem['extractSolutions'](answer)
      expect(solutions.steps).toHaveLength(3)
      expect(solutions.steps[0]).toContain('데이터 형식을 확인')
    })

    it('should extract Excel formulas', () => {
      const answer = '다음 수식을 사용하세요: =VLOOKUP(A1,B:C,2,FALSE)'
      const solutions = qaSystem['extractSolutions'](answer)
      
      expect(solutions.formula).toBe('=VLOOKUP(A1,B:C,2,FALSE)')
    })

    it('should detect alternative methods', () => {
      const answer = 'VLOOKUP을 사용하거나, 대신 INDEX/MATCH를 사용할 수 있습니다.'
      const solutions = qaSystem['extractSolutions'](answer)
      
      expect(solutions.alternativeMethods).toHaveLength(1)
      expect(solutions.alternativeMethods[0]).toContain('대신')
    })
  })

  describe('Difficulty Assessment', () => {
    it('should assess difficulty based on complexity', () => {
      const simplePattern = {
        excelFunction: ['SUM'],
        errorType: undefined,
        problemCategory: 'general'
      }
      const simpleSolution = {
        steps: ['간단한 해결'],
        formula: '=SUM(A1:A10)'
      }
      
      expect(qaSystem['assessDifficulty'](simplePattern, simpleSolution)).toBe('easy')

      const complexPattern = {
        excelFunction: ['VLOOKUP', 'INDEX', 'MATCH', 'IFERROR'],
        errorType: '#N/A',
        problemCategory: 'vba'
      }
      const complexSolution = {
        steps: ['1단계', '2단계', '3단계', '4단계', '5단계'],
        formula: '=IFERROR(INDEX(Sheet2!$B:$B,MATCH(A1,Sheet2!$A:$A,0)),VLOOKUP(A1,Sheet3!$A:$B,2,FALSE))'
      }
      
      expect(qaSystem['assessDifficulty'](complexPattern, complexSolution)).toBe('hard')
    })
  })

  describe('Vector Operations', () => {
    it('should generate consistent vectors for same text', async () => {
      const text = 'VLOOKUP 오류 해결'
      const vector1 = await qaSystem['generateSemanticVector'](text)
      const vector2 = await qaSystem['generateSemanticVector'](text)
      
      expect(vector1).toEqual(vector2)
      expect(vector1).toHaveLength(100)
    })

    it('should calculate cosine similarity correctly', () => {
      const vec1 = [1, 0, 0]
      const vec2 = [1, 0, 0]
      const vec3 = [0, 1, 0]
      
      expect(qaSystem['cosineSimilarity'](vec1, vec2)).toBe(1) // Same vectors
      expect(qaSystem['cosineSimilarity'](vec1, vec3)).toBe(0) // Orthogonal vectors
    })

    it('should calculate keyword overlap', () => {
      const keywords1 = ['vlookup', 'error', '#n/a']
      const keywords2 = ['vlookup', '#n/a', 'trim']
      
      const overlap = qaSystem['keywordOverlap'](keywords1, keywords2)
      expect(overlap).toBeCloseTo(0.5, 1) // 2 common out of 4 unique
    })
  })

  describe('QA Processing', () => {
    it('should process raw QA data correctly', async () => {
      const rawQA = {
        id: 'test_001',
        question: 'VLOOKUP에서 #N/A 오류가 발생합니다',
        answer: '1) TRIM 함수로 공백 제거\n2) 데이터 형식 확인',
        category: '함수_오류'
      }

      const processed = await qaSystem.processQAData(rawQA)
      
      expect(processed.id).toBe('test_001')
      expect(processed.normalized.keywords).toContain('vlookup')
      expect(processed.normalized.keywords).toContain('#n/a')
      expect(processed.patterns.errorType).toBe('#N/A')
      expect(processed.patterns.problemCategory).toBe('lookup')
      expect(processed.solutions.steps).toHaveLength(2)
      expect(processed.metadata.difficulty).toBeDefined()
    })

    it('should handle missing answer gracefully', async () => {
      const rawQA = {
        id: 'test_002',
        question: '피벗 테이블 만들기',
        answers: ['답변1', '답변2']
      }

      const processed = await qaSystem.processQAData(rawQA)
      expect(processed.original.answer).toBe('답변1\n답변2')
    })
  })

  describe('Search and Answer Generation', () => {
    beforeEach(async () => {
      // Load test data
      const testData = [
        {
          id: 'test_1',
          question: 'VLOOKUP #N/A 오류',
          answer: 'TRIM 함수 사용하세요'
        },
        {
          id: 'test_2',
          question: '순환 참조 해결',
          answer: '수식 추적으로 찾으세요'
        }
      ]

      for (const data of testData) {
        await qaSystem.processQAData(data)
      }
    })

    it('should search similar questions', async () => {
      const results = await qaSystem.search('vlookup 오류', 2)
      
      expect(results).toHaveLength(2)
      expect(results[0].score).toBeGreaterThan(results[1].score)
      expect(results[0].data.original.question).toContain('VLOOKUP')
    })

    it('should generate contextual answers', async () => {
      const searchResults = await qaSystem.search('VLOOKUP 오류 해결', 2)
      const answer = await qaSystem.generateAnswer('VLOOKUP 오류', searchResults)
      
      expect(answer.answer).toContain('VLOOKUP')
      expect(answer.confidence).toBeGreaterThan(0)
      expect(answer.metadata.patterns).toBeDefined()
    })

    it('should generate generic answer when no results', async () => {
      const answer = await qaSystem.generateAnswer('존재하지 않는 질문', [])
      
      expect(answer.answer).toContain('직접적인 해결 사례를 찾지 못했지만')
      expect(answer.confidence).toBe(0.3)
    })
  })

  describe('Learning and Feedback', () => {
    it('should update success rate from feedback', async () => {
      const rawQA = {
        id: 'feedback_test',
        question: '테스트 질문',
        answer: '테스트 답변'
      }

      const processed = await qaSystem.processQAData(rawQA)
      const initialRate = processed.metadata.successRate

      await qaSystem.updateFromFeedback('feedback_test', { helpful: true })
      
      const updated = qaSystem['processedData'].get('feedback_test')
      expect(updated?.metadata.successRate).toBeGreaterThan(initialRate)
    })

    it('should add actual solutions from feedback', async () => {
      const rawQA = {
        id: 'solution_test',
        question: '테스트 질문',
        answer: '원래 답변'
      }

      await qaSystem.processQAData(rawQA)
      
      await qaSystem.updateFromFeedback('solution_test', {
        helpful: false,
        actualSolution: '1. 새로운 해결 방법\n2. 더 나은 접근'
      })
      
      const updated = qaSystem['processedData'].get('solution_test')
      expect(updated?.solutions.alternativeMethods).toContain('1. 새로운 해결 방법')
    })
  })

  describe('Performance Tests', () => {
    it('should handle large datasets efficiently', async () => {
      const startTime = Date.now()
      
      // Generate 1000 test questions
      const testData = Array.from({ length: 1000 }, (_, i) => ({
        id: `perf_${i}`,
        question: `테스트 질문 ${i} VLOOKUP INDEX MATCH`,
        answer: `답변 ${i}`
      }))

      for (const data of testData) {
        await qaSystem.processQAData(data)
      }

      const processTime = Date.now() - startTime
      expect(processTime).toBeLessThan(5000) // Should process 1000 items in under 5 seconds

      // Test search performance
      const searchStart = Date.now()
      const results = await qaSystem.search('VLOOKUP 테스트', 10)
      const searchTime = Date.now() - searchStart

      expect(searchTime).toBeLessThan(100) // Search should be under 100ms
      expect(results.length).toBeGreaterThan(0)
    })

    it('should maintain accuracy with similar questions', async () => {
      const similarQuestions = [
        { id: 'sim_1', question: 'VLOOKUP #N/A 오류 해결', answer: '정답 1' },
        { id: 'sim_2', question: 'VLOOKUP #NA 에러 수정', answer: '정답 2' },
        { id: 'sim_3', question: 'v룩업 해당없음 오류', answer: '정답 3' }
      ]

      for (const q of similarQuestions) {
        await qaSystem.processQAData(q)
      }

      const results = await qaSystem.search('vlookup na 오류', 3)
      
      // All similar questions should be found
      expect(results).toHaveLength(3)
      
      // Scores should be close (within 0.2)
      const scores = results.map(r => r.score)
      const maxScore = Math.max(...scores)
      const minScore = Math.min(...scores)
      expect(maxScore - minScore).toBeLessThan(0.2)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty questions', () => {
      const { normalized, keywords } = qaSystem.normalizeQuestion('')
      expect(normalized).toBe('')
      expect(keywords).toHaveLength(0)
    })

    it('should handle special characters', () => {
      const { normalized } = qaSystem.normalizeQuestion('=VLOOKUP($A$1,Sheet2!$B:$C,2,0)')
      expect(normalized).toBeDefined()
      expect(normalized.length).toBeGreaterThan(0)
    })

    it('should handle very long text', () => {
      const longText = 'VLOOKUP '.repeat(1000)
      const { keywords } = qaSystem.normalizeQuestion(longText)
      expect(keywords).toContain('vlookup')
    })

    it('should handle mixed languages', () => {
      const { normalized, keywords } = qaSystem.normalizeQuestion(
        'Excel에서 VLOOKUP function이 #N/A error를 반환합니다'
      )
      expect(keywords).toContain('vlookup')
      expect(keywords).toContain('#n/a')
      expect(keywords).toContain('error')
    })
  })
})