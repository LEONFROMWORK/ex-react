// HyperFormula 통합 테스트 스크립트
const { HyperFormula } = require('hyperformula');

console.log('🧪 HyperFormula 기본 동작 테스트');

try {
  // HyperFormula 인스턴스 생성
  const hf = HyperFormula.buildFromArray([
    ['10', '20', '=A1+B1'],
    ['30', '40', '=A2+B2'],
    ['=SUM(A1:A2)', '=SUM(B1:B2)', '=SUM(C1:C2)']
  ], {
    licenseKey: 'gpl-v3'
  });

  console.log('✅ HyperFormula 인스턴스 생성 성공');

  // 수식 평가 결과 확인
  console.log('\n📊 수식 평가 결과:');
  console.log('C1 (=A1+B1):', hf.getCellValue({ sheet: 0, row: 0, col: 2 }));
  console.log('C2 (=A2+B2):', hf.getCellValue({ sheet: 0, row: 1, col: 2 }));
  console.log('A3 (=SUM(A1:A2)):', hf.getCellValue({ sheet: 0, row: 2, col: 0 }));
  console.log('B3 (=SUM(B1:B2)):', hf.getCellValue({ sheet: 0, row: 2, col: 1 }));
  console.log('C3 (=SUM(C1:C2)):', hf.getCellValue({ sheet: 0, row: 2, col: 2 }));

  // 성능 통계
  const stats = hf.getStats();
  console.log('\n📈 성능 통계:');
  console.log('전체 셀 수:', stats.get('CELLS'));
  console.log('수식 셀 수:', stats.get('FORMULAS'));

  // 메모리 정리
  hf.destroy();
  console.log('\n✅ 테스트 완료!');

} catch (error) {
  console.error('❌ 테스트 실패:', error.message);
  process.exit(1);
}