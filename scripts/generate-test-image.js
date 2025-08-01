// 테스트용 이미지 생성 스크립트
const fs = require('fs');
const path = require('path');

// Canvas API를 사용하여 간단한 Excel 오류 화면 이미지 생성
function generateExcelErrorImage() {
  // Node.js에서는 canvas 패키지가 필요하지만, 
  // 간단한 대안으로 SVG를 생성하여 이미지처럼 사용
  
  const svg = `<svg width="800" height="400" xmlns="http://www.w3.org/2000/svg">
    <rect width="800" height="400" fill="#f5f5f5"/>
    
    <!-- Excel Window -->
    <rect x="50" y="30" width="700" height="340" fill="white" stroke="#d0d0d0"/>
    
    <!-- Toolbar -->
    <rect x="50" y="30" width="700" height="30" fill="#f7f7f7" stroke="#e0e0e0"/>
    <text x="60" y="50" font-family="Arial" font-size="14">월별매출현황.xlsx - Microsoft Excel</text>
    
    <!-- Formula Bar -->
    <rect x="50" y="60" width="700" height="25" fill="#f9f9f9" stroke="#e0e0e0"/>
    <text x="60" y="78" font-family="monospace" font-size="12">fx = C3: #DIV/0!</text>
    
    <!-- Grid Headers -->
    <g font-family="Arial" font-size="12" font-weight="bold">
      <rect x="50" y="85" width="50" height="25" fill="#e8e8e8" stroke="#d0d0d0"/>
      <rect x="100" y="85" width="100" height="25" fill="#e8e8e8" stroke="#d0d0d0"/>
      <text x="145" y="102" text-anchor="middle">A</text>
      <rect x="200" y="85" width="100" height="25" fill="#e8e8e8" stroke="#d0d0d0"/>
      <text x="245" y="102" text-anchor="middle">B</text>
      <rect x="300" y="85" width="100" height="25" fill="#e8e8e8" stroke="#d0d0d0"/>
      <text x="345" y="102" text-anchor="middle">C</text>
      <rect x="400" y="85" width="100" height="25" fill="#e8e8e8" stroke="#d0d0d0"/>
      <text x="445" y="102" text-anchor="middle">D</text>
    </g>
    
    <!-- Row 1 - Headers -->
    <g font-family="Arial" font-size="12">
      <rect x="50" y="110" width="50" height="25" fill="#e8e8e8" stroke="#d0d0d0"/>
      <text x="75" y="127" text-anchor="middle" font-weight="bold">1</text>
      <rect x="100" y="110" width="100" height="25" fill="white" stroke="#d0d0d0"/>
      <text x="110" y="127">이름</text>
      <rect x="200" y="110" width="100" height="25" fill="white" stroke="#d0d0d0"/>
      <text x="210" y="127">매출(1월)</text>
      <rect x="300" y="110" width="100" height="25" fill="white" stroke="#d0d0d0"/>
      <text x="310" y="127">매출(2월)</text>
      <rect x="400" y="110" width="100" height="25" fill="white" stroke="#d0d0d0"/>
      <text x="410" y="127">매출(3월)</text>
    </g>
    
    <!-- Row 3 - Error Row (highlighted) -->
    <g font-family="Arial" font-size="12">
      <rect x="50" y="160" width="50" height="25" fill="#e8e8e8" stroke="#d0d0d0"/>
      <text x="75" y="177" text-anchor="middle" font-weight="bold">3</text>
      <rect x="100" y="160" width="100" height="25" fill="white" stroke="#d0d0d0"/>
      <text x="110" y="177">이영희</text>
      <rect x="200" y="160" width="100" height="25" fill="white" stroke="#d0d0d0"/>
      <text x="210" y="177">2,000,000</text>
      <!-- Error cell with highlight -->
      <rect x="300" y="160" width="100" height="25" fill="#fff3cd" stroke="#ffc107" stroke-width="2"/>
      <text x="310" y="177" fill="#d00000" font-weight="bold">#DIV/0!</text>
      <rect x="400" y="160" width="100" height="25" fill="white" stroke="#d0d0d0"/>
      <text x="410" y="177">2,500,000</text>
    </g>
    
    <!-- Error tooltip -->
    <g>
      <rect x="280" y="195" width="140" height="30" rx="4" fill="#333333"/>
      <polygon points="340,195 350,185 360,195" fill="#333333"/>
      <text x="350" y="212" text-anchor="middle" fill="white" font-size="11">0으로 나누기 오류</text>
    </g>
    
    <!-- More error indicators -->
    <g font-family="Arial" font-size="12">
      <rect x="50" y="210" width="50" height="25" fill="#e8e8e8" stroke="#d0d0d0"/>
      <text x="75" y="227" text-anchor="middle" font-weight="bold">4</text>
      <rect x="100" y="210" width="100" height="25" fill="white" stroke="#d0d0d0"/>
      <text x="110" y="227">박민수</text>
      <rect x="400" y="210" width="100" height="25" fill="white" stroke="#d0d0d0"/>
      <text x="410" y="227" fill="#d00000" font-weight="bold">#REF!</text>
    </g>
    
    <!-- Warning message -->
    <text x="400" y="320" text-anchor="middle" fill="#d00000" font-weight="bold" font-size="14">
      ⚠️ 여러 수식 오류가 발견되었습니다
    </text>
  </svg>`;

  const outputPath = path.join(__dirname, '../public/samples/excel-error-screenshot.svg');
  fs.writeFileSync(outputPath, svg);
  console.log('SVG 이미지 생성 완료:', outputPath);
}

generateExcelErrorImage();