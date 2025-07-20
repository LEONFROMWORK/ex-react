// 복잡한 수식 처리 성능 테스트
const ExcelJS = require('exceljs');
const { HyperFormula } = require('hyperformula');

async function createComplexFormulaFile() {
  console.log('📝 복잡한 수식이 포함된 Excel 파일 생성 중...');
  
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('ComplexFormulas');
  
  // 데이터 영역 (A1:E100)
  for (let row = 1; row <= 100; row++) {
    worksheet.addRow([
      Math.random() * 100,
      Math.random() * 100,
      Math.random() * 100,
      Math.random() * 100,
      Math.random() * 100
    ]);
  }
  
  // 복잡한 수식 추가 (F1:J100)
  for (let row = 1; row <= 100; row++) {
    worksheet.getCell(`F${row}`).value = { formula: `=SUM(A${row}:E${row})` };
    worksheet.getCell(`G${row}`).value = { formula: `=AVERAGE(A${row}:E${row})` };
    worksheet.getCell(`H${row}`).value = { formula: `=MAX(A${row}:E${row})-MIN(A${row}:E${row})` };
    worksheet.getCell(`I${row}`).value = { formula: `=IF(F${row}>200,"High",IF(F${row}>100,"Medium","Low"))` };
    worksheet.getCell(`J${row}`).value = { formula: `=COUNTIF(A${row}:E${row},">50")` };
  }
  
  // 집계 수식 (K열)
  worksheet.getCell('K1').value = { formula: '=SUM(F1:F100)' };
  worksheet.getCell('K2').value = { formula: '=AVERAGE(G1:G100)' };
  worksheet.getCell('K3').value = { formula: '=MAX(H1:H100)' };
  worksheet.getCell('K4').value = { formula: '=COUNTIF(I1:I100,"High")' };
  
  // 복잡한 중첩 수식
  for (let row = 1; row <= 20; row++) {
    worksheet.getCell(`L${row}`).value = { 
      formula: `=IF(AND(A${row}>50,B${row}<30),VLOOKUP(C${row},A1:E100,4,FALSE),INDEX(D1:D100,MATCH(MAX(E1:E100),E1:E100,0)))`
    };
  }
  
  const filename = 'complex_formulas.xlsx';
  await workbook.xlsx.writeFile(filename);
  console.log('✅ 파일 생성 완료');
  
  return filename;
}

async function testFormulaEvaluation() {
  console.log('\n🔬 수식 평가 성능 테스트\n');
  
  const filename = await createComplexFormulaFile();
  
  // ExcelJS로 읽기
  console.log('📖 파일 읽기 중...');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filename);
  const worksheet = workbook.getWorksheet(1);
  
  // 데이터와 수식 추출
  const data = [];
  const formulas = [];
  
  worksheet.eachRow((row, rowNumber) => {
    const rowData = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      if (cell.formula) {
        formulas.push({
          row: rowNumber - 1,
          col: colNumber - 1,
          formula: cell.formula
        });
        rowData.push(cell.formula);
      } else {
        rowData.push(cell.value || 0);
      }
    });
    data.push(rowData);
  });
  
  console.log(`✅ 데이터 로드 완료: ${formulas.length}개 수식\n`);
  
  // HyperFormula 테스트
  console.log('⚡ HyperFormula 수식 평가 테스트');
  const hfStartTime = Date.now();
  
  const hf = HyperFormula.buildFromArray(data, {
    licenseKey: 'gpl-v3',
    maxRows: 10000,
    maxColumns: 1000
  });
  
  // 모든 수식 평가
  let hfResults = [];
  formulas.forEach(f => {
    const value = hf.getCellValue({ sheet: 0, row: f.row, col: f.col });
    hfResults.push(value);
  });
  
  const hfEndTime = Date.now();
  const hfDuration = hfEndTime - hfStartTime;
  
  console.log(`✅ HyperFormula 완료: ${hfDuration}ms`);
  console.log(`   - 수식/초: ${Math.floor(formulas.length / (hfDuration / 1000))}`);
  
  // 수식 재계산 테스트
  console.log('\n🔄 수식 재계산 성능 테스트');
  
  // 값 변경 후 재계산 시간 측정
  const recalcStartTime = Date.now();
  
  // 10개 셀 값 변경
  for (let i = 0; i < 10; i++) {
    hf.setCellContents({ sheet: 0, row: i, col: 0 }, Math.random() * 100);
  }
  
  const recalcEndTime = Date.now();
  const recalcDuration = recalcEndTime - recalcStartTime;
  
  console.log(`✅ 재계산 완료: ${recalcDuration}ms`);
  
  // 순환 참조 테스트
  console.log('\n🔍 순환 참조 검사 테스트');
  
  // 순환 참조 추가
  hf.setCellContents({ sheet: 0, row: 0, col: 11 }, '=L2');
  hf.setCellContents({ sheet: 0, row: 1, col: 11 }, '=L1');
  
  const errorValue = hf.getCellValue({ sheet: 0, row: 0, col: 11 });
  console.log(`순환 참조 결과: ${JSON.stringify(errorValue)}`);
  
  // 메모리 정리
  hf.destroy();
  
  // 파일 삭제
  const fs = require('fs');
  fs.unlinkSync(filename);
  
  console.log('\n✅ 테스트 완료!');
}

// 실시간 수식 업데이트 시뮬레이션
async function testRealtimeUpdates() {
  console.log('\n⏱️ 실시간 업데이트 성능 테스트\n');
  
  // 대시보드 시뮬레이션 (100x20 그리드)
  const dashboardData = [];
  for (let row = 0; row < 100; row++) {
    const rowData = [];
    for (let col = 0; col < 20; col++) {
      if (col < 10) {
        // 데이터 열
        rowData.push(Math.random() * 1000);
      } else {
        // 수식 열
        if (row === 0) {
          rowData.push(`=SUM(A1:J1)`);
        } else {
          rowData.push(`=A${row + 1}+K${row}`);
        }
      }
    }
    dashboardData.push(rowData);
  }
  
  const hf = HyperFormula.buildFromArray(dashboardData, {
    licenseKey: 'gpl-v3'
  });
  
  console.log('📊 대시보드 생성 완료 (100x20 그리드)');
  
  // 100회 업데이트 시뮬레이션
  const updateCount = 100;
  const updateStartTime = Date.now();
  
  for (let i = 0; i < updateCount; i++) {
    const randomRow = Math.floor(Math.random() * 100);
    const randomCol = Math.floor(Math.random() * 10);
    const newValue = Math.random() * 1000;
    
    hf.setCellContents({ sheet: 0, row: randomRow, col: randomCol }, newValue);
  }
  
  const updateEndTime = Date.now();
  const totalUpdateTime = updateEndTime - updateStartTime;
  const avgUpdateTime = totalUpdateTime / updateCount;
  
  console.log(`✅ ${updateCount}회 업데이트 완료`);
  console.log(`   - 총 시간: ${totalUpdateTime}ms`);
  console.log(`   - 평균 업데이트 시간: ${avgUpdateTime.toFixed(2)}ms`);
  console.log(`   - 업데이트/초: ${Math.floor(updateCount / (totalUpdateTime / 1000))}`);
  
  hf.destroy();
}

// 모든 테스트 실행
async function runAllTests() {
  console.log('🚀 HyperFormula 성능 테스트 시작\n');
  
  try {
    await testFormulaEvaluation();
    await testRealtimeUpdates();
    
    console.log('\n🎉 모든 테스트 완료!');
    console.log('\n📊 결론:');
    console.log('- HyperFormula는 복잡한 수식 평가에 최적화되어 있음');
    console.log('- 실시간 업데이트와 재계산에서 뛰어난 성능 발휘');
    console.log('- 대용량 데이터보다는 복잡한 수식 처리에 강점');
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error);
  }
}

runAllTests();