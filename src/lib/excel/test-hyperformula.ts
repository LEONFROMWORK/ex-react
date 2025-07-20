/**
 * HyperFormula 통합 테스트
 */

import { FormulaEngine } from './formula-engine'
import ExcelJS from 'exceljs'

export async function testHyperFormulaIntegration() {
  console.log('🧪 HyperFormula 통합 테스트 시작')
  
  const engine = new FormulaEngine({
    useStats: true,
    binarySearchThreshold: 20
  })
  
  try {
    // 테스트 워크북 생성
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('TestSheet')
    
    // 테스트 데이터 추가
    worksheet.getCell('A1').value = 10
    worksheet.getCell('A2').value = 20
    worksheet.getCell('A3').value = 30
    worksheet.getCell('B1').value = { formula: '=SUM(A1:A3)' }
    worksheet.getCell('B2').value = { formula: '=AVERAGE(A1:A3)' }
    worksheet.getCell('B3').value = { formula: '=A1*A2+A3' }
    worksheet.getCell('C1').value = { formula: '=IF(B1>50,"High","Low")' }
    
    // HyperFormula로 로드
    await engine.loadWorkbook(workbook)
    
    console.log('✅ 워크북 로드 완료')
    
    // 수식 검증 테스트
    const validation1 = engine.validateFormula('=SUM(A1:A3)', { sheet: 'TestSheet' })
    console.log('수식 검증 (SUM):', validation1)
    
    const validation2 = engine.validateFormula('=INVALID_FUNCTION()', { sheet: 'TestSheet' })
    console.log('수식 검증 (잘못된 함수):', validation2)
    
    // 수식 평가 테스트
    const eval1 = engine.evaluateFormula('=SUM(A1:A3)', { sheet: 'TestSheet' })
    console.log('수식 평가 (SUM):', eval1)
    
    const eval2 = engine.evaluateFormula('=A1*2+10', { sheet: 'TestSheet' })
    console.log('수식 평가 (계산식):', eval2)
    
    // 순환 참조 테스트
    const circularRefs = engine.detectCircularReferences()
    console.log('순환 참조:', circularRefs)
    
    // 수식 최적화 테스트
    const optimized = engine.optimizeFormula('=((A1+0)*1)--5')
    console.log('수식 최적화:', optimized)
    
    // 성능 통계
    const stats = engine.getPerformanceStats()
    console.log('성능 통계:', stats)
    
    console.log('✅ 모든 테스트 통과!')
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error)
  } finally {
    await engine.destroy()
  }
}

// CLI에서 직접 실행 가능
if (require.main === module) {
  testHyperFormulaIntegration()
}