// Simple test to verify RAG integration
const { QASystem } = require('./src/modules/qa-system')

async function testRAGIntegration() {
  console.log('RAG 시스템 통합 테스트 시작...')
  
  try {
    // QA 시스템 초기화
    const qaSystem = new QASystem()
    await qaSystem.initialize()
    
    // 샘플 질문 테스트
    const question = "VLOOKUP 함수에서 #N/A 오류가 발생하는 이유는 무엇인가요?"
    
    console.log('\n=== 기존 답변 시스템 테스트 ===')
    const legacyResult = await qaSystem.generateAnswer(question, [])
    console.log('답변:', legacyResult)
    
    console.log('\n=== RAG 강화 답변 시스템 테스트 ===')
    const enhancedResult = await qaSystem.generateEnhancedAnswer(question)
    console.log('답변:', enhancedResult.answer)
    console.log('신뢰도:', enhancedResult.confidence)
    console.log('처리 시간:', enhancedResult.processingTime, 'ms')
    console.log('방법:', enhancedResult.method)
    console.log('소스 개수:', enhancedResult.sources.length)
    
    console.log('\n=== RAG 상태 확인 ===')
    console.log('RAG 활성화:', qaSystem.isRAGEnabled())
    
    const ragStats = await qaSystem.getRAGStats()
    if (ragStats) {
      console.log('RAG 통계:', ragStats)
    }
    
    console.log('\n✅ RAG 시스템 통합 테스트 완료')
    
  } catch (error) {
    console.error('❌ RAG 시스템 테스트 실패:', error)
    process.exit(1)
  }
}

// 환경 변수 설정
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-key'
process.env.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || 'test-key'

testRAGIntegration()