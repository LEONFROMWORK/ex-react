const { exec } = require('child_process');

console.log('TypeScript 타입 체크 시작...\n');

exec('npx tsc --noEmit', (error, stdout, stderr) => {
  if (error) {
    console.error('타입 오류 발견:');
    console.error(stderr || stdout);
    process.exit(1);
  } else {
    console.log('✅ 타입 체크 통과!');
    if (stdout) console.log(stdout);
  }
});