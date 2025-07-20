// Excel 파일 처리 성능 테스트
const ExcelJS = require('exceljs');
const { HyperFormula } = require('hyperformula');
const fs = require('fs');
const path = require('path');

async function createTestExcelFile(rows = 10000, cols = 20) {
  console.log(`📝 테스트 Excel 파일 생성 중... (${rows}행 x ${cols}열)`);
  
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('TestSheet');
  
  // 헤더 추가
  const headers = [];
  for (let col = 1; col <= cols; col++) {
    headers.push(`Column${col}`);
  }
  worksheet.addRow(headers);
  
  // 데이터 행 추가
  for (let row = 2; row <= rows; row++) {
    const rowData = [];
    for (let col = 1; col <= cols - 1; col++) {
      rowData.push(Math.floor(Math.random() * 100));
    }
    // 마지막 열은 SUM 수식
    rowData.push({ formula: `=SUM(A${row}:${String.fromCharCode(65 + cols - 2)}${row})` });
    worksheet.addRow(rowData);
  }
  
  // 마지막 행에 전체 합계 추가
  const totalRow = ['Total'];
  for (let col = 2; col <= cols; col++) {
    const colLetter = String.fromCharCode(64 + col);
    totalRow.push({ formula: `=SUM(${colLetter}2:${colLetter}${rows})` });
  }
  worksheet.addRow(totalRow);
  
  const filename = `test_${rows}rows.xlsx`;
  await workbook.xlsx.writeFile(filename);
  
  const stats = fs.statSync(filename);
  console.log(`✅ 파일 생성 완료: ${filename} (${(stats.size / 1024 / 1024).toFixed(2)}MB)`);
  
  return filename;
}

async function testExcelJSProcessing(filename) {
  console.log('\n📊 ExcelJS 처리 테스트');
  
  const startTime = Date.now();
  const workbook = new ExcelJS.Workbook();
  
  await workbook.xlsx.readFile(filename);
  
  let cellCount = 0;
  let formulaCount = 0;
  
  workbook.eachSheet((worksheet) => {
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cellCount++;
        if (cell.formula) {
          formulaCount++;
        }
      });
    });
  });
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  console.log(`✅ ExcelJS 처리 완료:`);
  console.log(`   - 처리 시간: ${duration}ms`);
  console.log(`   - 총 셀 수: ${cellCount}`);
  console.log(`   - 수식 수: ${formulaCount}`);
  console.log(`   - 셀/초: ${Math.floor(cellCount / (duration / 1000))}`);
  
  return { duration, cellCount, formulaCount };
}

async function testHyperFormulaProcessing(filename) {
  console.log('\n⚡ HyperFormula 처리 테스트');
  
  const startTime = Date.now();
  
  // ExcelJS로 파일 읽기
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filename);
  
  // HyperFormula용 데이터 준비
  const sheets = [];
  
  workbook.eachSheet((worksheet) => {
    const sheetData = [];
    
    worksheet.eachRow((row, rowNumber) => {
      const rowData = [];
      
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        if (cell.formula) {
          rowData.push(cell.formula);
        } else {
          rowData.push(cell.value || '');
        }
      });
      
      sheetData.push(rowData);
    });
    
    sheets.push(sheetData);
  });
  
  // HyperFormula 인스턴스 생성
  const hf = HyperFormula.buildFromSheets(sheets, {
    licenseKey: 'gpl-v3',
    useStats: true
  });
  
  // 모든 셀 평가
  let cellCount = 0;
  let formulaCount = 0;
  
  sheets.forEach((sheet, sheetIndex) => {
    sheet.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        cellCount++;
        if (typeof cell === 'string' && cell.startsWith('=')) {
          formulaCount++;
          // 수식 평가
          hf.getCellValue({ sheet: sheetIndex, row: rowIndex, col: colIndex });
        }
      });
    });
  });
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  console.log(`✅ HyperFormula 처리 완료:`);
  console.log(`   - 처리 시간: ${duration}ms`);
  console.log(`   - 총 셀 수: ${cellCount}`);
  console.log(`   - 수식 수: ${formulaCount}`);
  console.log(`   - 셀/초: ${Math.floor(cellCount / (duration / 1000))}`);
  
  hf.destroy();
  
  return { duration, cellCount, formulaCount };
}

async function runTests() {
  console.log('🚀 Excel 처리 성능 비교 테스트\n');
  
  try {
    // 다양한 크기의 테스트 파일 생성
    const testSizes = [
      { rows: 1000, cols: 10 },   // 작은 파일
      { rows: 10000, cols: 20 },  // 중간 파일
      { rows: 50000, cols: 30 }   // 큰 파일
    ];
    
    for (const size of testSizes) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`테스트: ${size.rows}행 x ${size.cols}열`);
      console.log('='.repeat(60));
      
      const filename = await createTestExcelFile(size.rows, size.cols);
      
      const excelJsResult = await testExcelJSProcessing(filename);
      const hyperFormulaResult = await testHyperFormulaProcessing(filename);
      
      // 성능 비교
      console.log('\n📊 성능 비교:');
      const improvement = ((excelJsResult.duration - hyperFormulaResult.duration) / excelJsResult.duration * 100).toFixed(1);
      const speedup = (excelJsResult.duration / hyperFormulaResult.duration).toFixed(2);
      
      console.log(`   - 성능 개선: ${improvement}%`);
      console.log(`   - 속도 향상: ${speedup}배`);
      
      if (hyperFormulaResult.duration < excelJsResult.duration) {
        console.log(`   - 🏆 HyperFormula가 ${Math.abs(improvement)}% 더 빠름!`);
      } else {
        console.log(`   - ExcelJS가 ${Math.abs(improvement)}% 더 빠름`);
      }
      
      // 파일 삭제
      fs.unlinkSync(filename);
    }
    
    console.log('\n✅ 모든 테스트 완료!');
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error);
  }
}

// 테스트 실행
runTests();