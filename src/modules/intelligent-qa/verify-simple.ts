import { IntelligentQASystem } from './index'

async function runSimpleVerification() {
  console.log('🔍 IntelligentQASystem 간단 검증 시작...\n')
  
  const qaSystem = new IntelligentQASystem()
  
  // Test 1: 기본 정규화
  console.log('1️⃣ 기본 정규화 테스트')
  const { normalized, keywords } = qaSystem.normalizeQuestion('v룩업에서 #N/A 에러가 발생합니다')
  console.log('입력:', 'v룩업에서 #N/A 에러가 발생합니다')
  console.log('정규화:', normalized)
  console.log('키워드:', keywords)
  console.log('')
  
  // Test 2: 패턴 분석
  console.log('2️⃣ 패턴 분석 테스트')
  const patterns = qaSystem.analyzePattern('VLOOKUP 함수에서 #REF! 오류', ['vlookup', '#ref'])
  console.log('패턴:', JSON.stringify(patterns, null, 2))
  console.log('')
  
  // Test 3: Q&A 처리
  console.log('3️⃣ Q&A 처리 테스트')
  const processed = await qaSystem.processQAData({
    id: 'test_001',
    question: 'VLOOKUP에서 순환 참조 오류가 발생합니다',
    answer: '수식 추적으로 순환 고리를 찾으세요'
  })
  console.log('처리 결과:', {
    id: processed.id,
    keywords: processed.normalized.keywords,
    difficulty: processed.metadata.difficulty
  })
  console.log('')
  
  // Test 4: 검색
  console.log('4️⃣ 검색 테스트')
  const results = await qaSystem.search('VLOOKUP 오류', 1)
  console.log('검색 결과 수:', results.length)
  if (results.length > 0) {
    console.log('최상위 결과:', {
      question: results[0].data.original.question,
      score: results[0].score.toFixed(3)
    })
  }
  
  console.log('\n✅ 검증 완료!')
}

runSimpleVerification().catch(console.error)