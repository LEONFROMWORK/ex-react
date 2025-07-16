import { ExcelAnalyzer } from './excel-analyzer'
import { QASystem } from './qa-system'
import { IntelligentQASystem } from './intelligent-qa'
import fs from 'fs/promises'
import path from 'path'

// 통합 시스템 검증
async function verifyIntegratedSystem() {
  console.log('🚀 통합2 시스템 전체 검증 시작\n')
  console.log('='.repeat(60))
  
  const results = {
    excelAnalyzer: { passed: 0, failed: 0 },
    qaSystem: { passed: 0, failed: 0 },
    intelligentQA: { passed: 0, failed: 0 },
    integration: { passed: 0, failed: 0 }
  }
  
  // 1. Excel Analyzer 검증
  console.log('\n📊 1. Excel Analyzer 모듈 검증')
  console.log('-'.repeat(40))
  
  try {
    const analyzer = new ExcelAnalyzer()
    console.log('✅ Excel Analyzer 초기화 성공')
    results.excelAnalyzer.passed++
    
    // 간단한 Excel 파일 생성 및 분석 테스트
    const ExcelJS = await import('exceljs')
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Test')
    
    // 순환 참조 테스트 데이터
    worksheet.getCell('A1').value = { formula: '=B1+1' }
    worksheet.getCell('B1').value = { formula: '=A1+1' }
    
    // 데이터 타입 오류 테스트
    worksheet.getCell('C1').value = '123' // 텍스트로 저장된 숫자
    worksheet.getCell('C2').value = 123
    
    const buffer = await workbook.xlsx.writeBuffer() as Buffer
    const analysisResults = await analyzer.analyze(buffer)
    
    const hasCircularRef = analysisResults.some(r => 
      r.message.includes('순환') || r.code === 'CIRCULAR_REFERENCE'
    )
    
    if (hasCircularRef) {
      console.log('✅ 순환 참조 감지 성공')
      results.excelAnalyzer.passed++
    } else {
      console.log('❌ 순환 참조 감지 실패')
      results.excelAnalyzer.failed++
    }
    
    const report = await analyzer.generateReport(analysisResults)
    if (report.includes('분석 보고서')) {
      console.log('✅ 보고서 생성 성공')
      results.excelAnalyzer.passed++
    } else {
      console.log('❌ 보고서 생성 실패')
      results.excelAnalyzer.failed++
    }
    
  } catch (error) {
    console.log('❌ Excel Analyzer 검증 실패:', error)
    results.excelAnalyzer.failed++
  }
  
  // 2. Q&A System 검증
  console.log('\n💬 2. Q&A System 검증')
  console.log('-'.repeat(40))
  
  try {
    const qaSystem = new QASystem()
    await qaSystem.initialize()
    console.log('✅ Q&A System 초기화 성공')
    results.qaSystem.passed++
    
    // 샘플 데이터 로드
    const sampleQA = {
      id: 'qa_test_1',
      title: 'VLOOKUP #N/A 오류',
      content: 'VLOOKUP 함수에서 #N/A 오류가 발생합니다',
      answer: 'TRIM 함수로 공백을 제거하세요',
      category: '함수_오류',
      tags: ['VLOOKUP', '#N/A'],
      source: 'test'
    }
    
    await qaSystem.loadDocuments([sampleQA])
    console.log('✅ 문서 로드 성공')
    results.qaSystem.passed++
    
    const searchResults = await qaSystem.searchSimilarQuestions('VLOOKUP 오류')
    if (searchResults.length > 0) {
      console.log('✅ 유사 질문 검색 성공')
      results.qaSystem.passed++
    } else {
      console.log('❌ 유사 질문 검색 실패')
      results.qaSystem.failed++
    }
    
  } catch (error) {
    console.log('❌ Q&A System 검증 실패:', error)
    results.qaSystem.failed++
  }
  
  // 3. Intelligent Q&A System 검증
  console.log('\n🧠 3. Intelligent Q&A System 검증')
  console.log('-'.repeat(40))
  
  try {
    const intelligentQA = new IntelligentQASystem()
    console.log('✅ Intelligent Q&A System 초기화 성공')
    results.intelligentQA.passed++
    
    // 동의어 정규화 테스트
    const { normalized, keywords } = intelligentQA.normalizeQuestion('v룩업 #NA 에러')
    if (normalized.includes('vlookup') && keywords.includes('vlookup')) {
      console.log('✅ 동의어 정규화 성공')
      results.intelligentQA.passed++
    } else {
      console.log('❌ 동의어 정규화 실패')
      results.intelligentQA.failed++
    }
    
    // 패턴 분석 테스트
    const patterns = intelligentQA.analyzePattern('VLOOKUP #REF! 오류', keywords)
    if (patterns.errorType === '#REF!' && patterns.problemCategory === 'lookup') {
      console.log('✅ 패턴 분석 성공')
      results.intelligentQA.passed++
    } else {
      console.log('❌ 패턴 분석 실패')
      results.intelligentQA.failed++
    }
    
    // Q&A 처리 테스트
    const processed = await intelligentQA.processQAData({
      id: 'iq_test_1',
      question: '순환 참조 오류 해결',
      answer: '수식 추적으로 찾으세요'
    })
    
    if (processed.patterns.problemCategory === 'circular_reference') {
      console.log('✅ Q&A 처리 및 분류 성공')
      results.intelligentQA.passed++
    } else {
      console.log('❌ Q&A 처리 실패')
      results.intelligentQA.failed++
    }
    
  } catch (error) {
    console.log('❌ Intelligent Q&A System 검증 실패:', error)
    results.intelligentQA.failed++
  }
  
  // 4. 통합 테스트
  console.log('\n🔗 4. 통합 시스템 테스트')
  console.log('-'.repeat(40))
  
  try {
    // API 엔드포인트 시뮬레이션
    console.log('📝 파일 분석 + Q&A 통합 시나리오')
    
    // 시나리오 1: 파일 분석 후 관련 Q&A 제공
    const analyzer = new ExcelAnalyzer()
    const qaSystem = new QASystem()
    const intelligentQA = new IntelligentQASystem()
    
    // Excel 파일에서 오류 발견
    const testWorkbook = new (await import('exceljs')).Workbook()
    const testSheet = testWorkbook.addWorksheet('Test')
    testSheet.getCell('A1').value = { formula: '=VLOOKUP(E1,B:C,2,FALSE)' }
    
    const testBuffer = await testWorkbook.xlsx.writeBuffer() as Buffer
    const fileResults = await analyzer.analyze(testBuffer)
    
    console.log('✅ 파일 분석 완료')
    results.integration.passed++
    
    // 분석 결과를 기반으로 Q&A 검색
    if (fileResults.length > 0) {
      const firstIssue = fileResults[0]
      const relatedQA = await intelligentQA.search(firstIssue.message, 3)
      
      if (relatedQA.length > 0) {
        console.log('✅ 관련 Q&A 검색 성공')
        results.integration.passed++
      } else {
        console.log('❌ 관련 Q&A 검색 실패')
        results.integration.failed++
      }
    }
    
    // 시나리오 2: 자연어 질문에 대한 종합 답변
    const userQuestion = 'Excel에서 VLOOKUP이 #N/A 오류를 반환하는데 순환 참조도 있어요'
    
    // Intelligent QA로 분석
    const { normalized: normQ, keywords: keywordsQ } = intelligentQA.normalizeQuestion(userQuestion)
    const patternsQ = intelligentQA.analyzePattern(userQuestion, keywordsQ)
    
    // 여러 문제 감지 확인
    if (patternsQ.errorType === '#N/A' && keywordsQ.includes('circular')) {
      console.log('✅ 복합 문제 감지 성공')
      results.integration.passed++
    } else {
      console.log('❌ 복합 문제 감지 실패')
      results.integration.failed++
    }
    
  } catch (error) {
    console.log('❌ 통합 테스트 실패:', error)
    results.integration.failed++
  }
  
  // 최종 결과 출력
  console.log('\n' + '='.repeat(60))
  console.log('📊 통합2 시스템 검증 결과')
  console.log('='.repeat(60))
  
  let totalPassed = 0
  let totalFailed = 0
  
  Object.entries(results).forEach(([module, result]) => {
    console.log(`\n${module}:`)
    console.log(`  ✅ 통과: ${result.passed}개`)
    console.log(`  ❌ 실패: ${result.failed}개`)
    console.log(`  📈 성공률: ${((result.passed / (result.passed + result.failed)) * 100).toFixed(1)}%`)
    
    totalPassed += result.passed
    totalFailed += result.failed
  })
  
  console.log('\n' + '-'.repeat(40))
  console.log('전체 결과:')
  console.log(`  ✅ 총 통과: ${totalPassed}개`)
  console.log(`  ❌ 총 실패: ${totalFailed}개`)
  console.log(`  📈 전체 성공률: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)}%`)
  
  if (totalFailed === 0) {
    console.log('\n🎉 모든 검증 통과! 통합2 시스템이 정상 작동합니다.')
  } else {
    console.log('\n⚠️ 일부 검증 실패. 다음 항목을 확인하세요:')
    if (results.excelAnalyzer.failed > 0) console.log('  - Excel Analyzer 모듈')
    if (results.qaSystem.failed > 0) console.log('  - Q&A System')
    if (results.intelligentQA.failed > 0) console.log('  - Intelligent Q&A System')
    if (results.integration.failed > 0) console.log('  - 시스템 통합')
  }
  
  // 성능 벤치마크
  console.log('\n⚡ 성능 벤치마크')
  console.log('-'.repeat(40))
  
  const perfStart = Date.now()
  
  // 100개 질문 처리 속도
  const iq = new IntelligentQASystem()
  for (let i = 0; i < 100; i++) {
    await iq.processQAData({
      id: `perf_${i}`,
      question: `테스트 질문 ${i} VLOOKUP INDEX MATCH`,
      answer: `답변 ${i}`
    })
  }
  
  const processTime = Date.now() - perfStart
  console.log(`100개 Q&A 처리 시간: ${processTime}ms (${(processTime/100).toFixed(1)}ms/item)`)
  
  // 검색 속도
  const searchStart = Date.now()
  await iq.search('VLOOKUP', 10)
  const searchTime = Date.now() - searchStart
  console.log(`검색 응답 시간: ${searchTime}ms`)
  
  console.log('\n✅ 통합2 시스템 검증 완료!')
}

// 실행
if (require.main === module) {
  verifyIntegratedSystem()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('시스템 검증 중 치명적 오류:', error)
      process.exit(1)
    })
}

export { verifyIntegratedSystem }