const fs = require('fs');
const path = require('path');

const uploadsDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ uploads 디렉토리가 생성되었습니다.');
} else {
  console.log('✅ uploads 디렉토리가 이미 존재합니다.');
}

// uploads 디렉토리를 정적 파일로 제공하기 위한 설명
console.log('\n📌 Next.js에서 uploads 디렉토리를 정적으로 제공하려면:');
console.log('   public/uploads 심볼릭 링크를 만들거나');
console.log('   next.config.js에서 설정을 추가하세요.');