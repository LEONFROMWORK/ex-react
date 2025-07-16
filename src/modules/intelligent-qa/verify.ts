import { IntelligentQASystem } from './index'

async function verifySystem() {
  console.log('🔍 IntelligentQASystem 검증 시작...\n')
  
  const qaSystem = new IntelligentQASystem()
  let passedTests = 0
  let failedTests = 0
  
  // Test 1: 동의어 정규화
  console.log('1️⃣ 동의어 정규화 테스트')
  try {
    const { normalized, keywords } = qaSystem.normalizeQuestion('v룩업에서 #N/A 에러가 발생합니다')
    
    if (normalized.includes('vlookup') && keywords.includes('vlookup') && keywords.includes('#n/a')) {
      console.log('✅ 통과: 한글 동의어가 올바르게 정규화됨')
      console.log(`   정규화된 질문: ${normalized}`)
      console.log(`   추출된 키워드: ${keywords.join(', ')}`)
      passedTests++
    } else {
      throw new Error('동의어 정규화 실패')
    }
  } catch (error) {
    console.log('❌ 실패:', error)
    failedTests++
  }
  
  // Test 2: 패턴 분석
  console.log('\n2️⃣ 패턴 분석 테스트')
  try {
    const question = 'VLOOKUP 함수에서 #REF! 오류가 발생하고 있습니다'
    const { keywords } = qaSystem.normalizeQuestion(question)
    const patterns = qaSystem.analyzePattern(question, keywords)
    
    if (patterns.errorType === '#REF!' && 
        patterns.excelFunction.includes('VLOOKUP') &&
        patterns.problemCategory === 'lookup') {
      console.log('✅ 통과: 오류 타입과 함수가 올바르게 감지됨')
      console.log(`   오류 타입: ${patterns.errorType}`)
      console.log(`   Excel 함수: ${patterns.excelFunction.join(', ')}`)
      console.log(`   문제 카테고리: ${patterns.problemCategory}`)
      passedTests++
    } else {
      throw new Error('패턴 분석 실패')
    }
  } catch (error) {
    console.log('❌ 실패:', error)
    failedTests++
  }
  
  // Test 3: 솔루션 추출
  console.log('\n3️⃣ 솔루션 추출 테스트')
  try {
    const answer = `해결 방법:
1. 데이터 형식을 확인하세요
2. TRIM 함수로 공백을 제거하세요
3. =VLOOKUP(A1,B:C,2,FALSE) 수식을 사용하세요`
    
    const solutions = qaSystem['extractSolutions'](answer)
    
    if (solutions.steps.length === 3 && 
        solutions.formula === '=VLOOKUP(A1,B:C,2,FALSE)') {
      console.log('✅ 통과: 단계별 해결법과 수식이 올바르게 추출됨')
      console.log(`   추출된 단계: ${solutions.steps.length}개`)
      console.log(`   추출된 수식: ${solutions.formula}`)
      passedTests++
    } else {
      throw new Error('솔루션 추출 실패')
    }
  } catch (error) {
    console.log('❌ 실패:', error)
    failedTests++
  }
  
  // Test 4: Q&A 데이터 처리
  console.log('\n4️⃣ Q&A 데이터 처리 테스트')
  try {
    const rawQA = {
      id: 'test_001',
      question: 'VLOOKUP에서 순환 참조 오류가 발생합니다',
      answer: '1) 수식 추적으로 순환 고리를 찾으세요\n2) 반복 계산을 비활성화하세요',
      category: '함수_오류'
    }
    
    const processed = await qaSystem.processQAData(rawQA)
    
    if (processed.normalized.keywords.includes('vlookup') &&
        processed.normalized.keywords.includes('circular') &&
        processed.patterns.problemCategory === 'lookup' &&
        processed.solutions.steps.length === 2) {
      console.log('✅ 통과: Q&A 데이터가 올바르게 처리됨')
      console.log(`   난이도: ${processed.metadata.difficulty}`)
      console.log(`   키워드: ${processed.normalized.keywords.join(', ')}`)
      passedTests++
    } else {
      throw new Error('Q&A 처리 실패')
    }
  } catch (error) {
    console.log('❌ 실패:', error)
    failedTests++
  }
  
  // Test 5: 벡터 생성 및 유사도
  console.log('\n5️⃣ 벡터 생성 및 유사도 테스트')
  try {
    const text1 = 'VLOOKUP 오류 해결'
    const text2 = 'VLOOKUP 오류 해결'
    const text3 = '피벗 테이블 만들기'
    
    const vec1 = await qaSystem['generateSemanticVector'](text1)
    const vec2 = await qaSystem['generateSemanticVector'](text2)
    const vec3 = await qaSystem['generateSemanticVector'](text3)
    
    const similarity12 = qaSystem['cosineSimilarity'](vec1, vec2)
    const similarity13 = qaSystem['cosineSimilarity'](vec1, vec3)
    
    if (vec1.length === 100 && 
        similarity12 === 1 && 
        similarity13 < similarity12) {
      console.log('✅ 통과: 벡터 생성 및 유사도 계산이 올바름')
      console.log(`   벡터 크기: ${vec1.length}`)
      console.log(`   동일 텍스트 유사도: ${similarity12}`)
      console.log(`   다른 텍스트 유사도: ${similarity13.toFixed(3)}`)
      passedTests++
    } else {
      throw new Error('벡터 연산 실패')
    }
  } catch (error) {
    console.log('❌ 실패:', error)
    failedTests++
  }
  
  // Test 6: 검색 및 답변 생성
  console.log('\n6️⃣ 검색 및 답변 생성 테스트')
  try {
    // 테스트 데이터 로드
    const testData = [
      {
        id: 'search_1',
        question: 'VLOOKUP #N/A 오류 해결 방법',
        answer: 'TRIM 함수로 공백을 제거하고 데이터 형식을 확인하세요'
      },
      {
        id: 'search_2',
        question: '순환 참조 찾는 방법',
        answer: '수식 추적 기능을 사용하여 순환 고리를 찾으세요'
      }
    ]
    
    for (const data of testData) {
      await qaSystem.processQAData(data)
    }
    
    // 검색 테스트
    const searchResults = await qaSystem.search('VLOOKUP 오류', 2)
    const answer = await qaSystem.generateAnswer('VLOOKUP 오류 해결', searchResults)
    
    if (searchResults.length > 0 && 
        searchResults[0].data.original.question.includes('VLOOKUP') &&
        answer.answer.includes('VLOOKUP') &&
        answer.confidence > 0) {
      console.log('✅ 통과: 검색 및 답변 생성이 올바르게 작동')
      console.log(`   검색 결과: ${searchResults.length}개`)
      console.log(`   최상위 결과 점수: ${searchResults[0].score.toFixed(3)}`)
      console.log(`   답변 신뢰도: ${(answer.confidence * 100).toFixed(1)}%`)
      passedTests++
    } else {
      throw new Error('검색/답변 생성 실패')
    }
  } catch (error) {
    console.log('❌ 실패:', error)
    failedTests++
  }
  
  // Test 7: 성능 테스트
  console.log('\n7️⃣ 성능 테스트 (100개 데이터)')
  try {
    const startTime = Date.now()
    
    // 100개 테스트 데이터 생성
    for (let i = 0; i < 100; i++) {
      await qaSystem.processQAData({
        id: `perf_${i}`,
        question: `테스트 질문 ${i} VLOOKUP INDEX MATCH`,
        answer: `답변 ${i}`
      })
    }
    
    const processTime = Date.now() - startTime
    
    // 검색 성능 테스트
    const searchStart = Date.now()
    const results = await qaSystem.search('VLOOKUP 테스트', 10)
    const searchTime = Date.now() - searchStart
    
    if (processTime < 1000 && searchTime < 50 && results.length > 0) {
      console.log('✅ 통과: 성능이 허용 범위 내')
      console.log(`   100개 처리 시간: ${processTime}ms`)
      console.log(`   검색 시간: ${searchTime}ms`)
      console.log(`   검색 결과: ${results.length}개`)
      passedTests++
    } else {
      throw new Error(`성능 미달 - 처리: ${processTime}ms, 검색: ${searchTime}ms`)
    }
  } catch (error) {
    console.log('❌ 실패:', error)
    failedTests++
  }
  
  // Test 8: 학습 및 피드백
  console.log('\n8️⃣ 학습 및 피드백 테스트')
  try {
    const testId = 'feedback_test'
    await qaSystem.processQAData({
      id: testId,
      question: '피드백 테스트',
      answer: '원래 답변'
    })
    
    const initialData = qaSystem['processedData'].get(testId)
    const initialRate = initialData?.metadata.successRate || 0
    
    // 긍정 피드백
    await qaSystem.updateFromFeedback(testId, { helpful: true })
    
    const updatedData = qaSystem['processedData'].get(testId)
    const updatedRate = updatedData?.metadata.successRate || 0
    
    if (updatedRate > initialRate) {
      console.log('✅ 통과: 피드백 반영이 올바르게 작동')
      console.log(`   초기 성공률: ${(initialRate * 100).toFixed(1)}%`)
      console.log(`   업데이트된 성공률: ${(updatedRate * 100).toFixed(1)}%`)
      passedTests++
    } else {
      throw new Error('피드백 반영 실패')
    }
  } catch (error) {
    console.log('❌ 실패:', error)
    failedTests++
  }
  
  // 최종 결과
  console.log('\n' + '='.repeat(50))
  console.log('📊 검증 결과 요약')
  console.log('='.repeat(50))
  console.log(`✅ 통과: ${passedTests}개`)
  console.log(`❌ 실패: ${failedTests}개`)
  console.log(`📈 성공률: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`)
  
  if (failedTests === 0) {
    console.log('\n🎉 모든 테스트 통과! 시스템이 정상적으로 작동합니다.')
  } else {
    console.log('\n⚠️ 일부 테스트 실패. 수정이 필요합니다.')
  }
  
  return { passed: passedTests, failed: failedTests }
}

// 실행
verifySystem()
  .then(({ passed, failed }) => {
    process.exit(failed > 0 ? 1 : 0)
  })
  .catch(error => {
    console.error('검증 중 오류 발생:', error)
    process.exit(1)
  })