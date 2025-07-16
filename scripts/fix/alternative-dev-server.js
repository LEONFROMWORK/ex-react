const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 대체 개발 서버 실행 스크립트');
console.log('================================');

// 1. 프로덕션 빌드 시도
console.log('\n1. 프로덕션 빌드로 실행 시도...');

function runBuildAndStart() {
  try {
    console.log('   빌드 중... (시간이 걸릴 수 있습니다)');
    
    // Prisma 생성
    execSync('npx prisma generate', { stdio: 'inherit' });
    
    // Next.js 빌드
    execSync('npx next build', { 
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });
    
    console.log('\n✅ 빌드 성공! 서버 시작...');
    
    // 서버 시작
    const server = spawn('npx', ['next', 'start'], {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });
    
    server.on('error', (err) => {
      console.error('서버 시작 오류:', err);
    });
    
  } catch (error) {
    console.error('\n❌ 빌드 실패:', error.message);
    console.log('\n2. Vercel Dev 서버로 대체 실행...');
    runVercelDev();
  }
}

function runVercelDev() {
  console.log('   Vercel CLI 설치 확인...');
  
  try {
    execSync('npx vercel --version', { stdio: 'ignore' });
  } catch {
    console.log('   Vercel CLI 설치 중...');
    execSync('npm install -g vercel', { stdio: 'inherit' });
  }
  
  console.log('\n   Vercel Dev 서버 시작...');
  const vercel = spawn('npx', ['vercel', 'dev', '--yes'], {
    stdio: 'inherit'
  });
  
  vercel.on('error', (err) => {
    console.error('Vercel 서버 오류:', err);
    runPythonServer();
  });
}

function runPythonServer() {
  console.log('\n3. Python 간단 서버로 대체...');
  
  // 정적 HTML 파일 생성
  const indexHtml = `<!DOCTYPE html>
<html>
<head>
    <title>Exhell - 테스트 서버</title>
    <meta charset="utf-8">
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #333; }
        .links { margin-top: 30px; }
        .links a {
            display: inline-block;
            margin: 10px;
            padding: 10px 20px;
            background: #0070f3;
            color: white;
            text-decoration: none;
            border-radius: 5px;
        }
        .links a:hover { background: #0051cc; }
        .error {
            background: #fee;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔧 Exhell 테스트 서버</h1>
        <div class="error">
            <strong>⚠️ Node.js v24 호환성 문제</strong>
            <p>현재 Node.js v24.3.0은 Next.js 14.1.4와 호환되지 않습니다.</p>
            <p>Node.js 18.x LTS 버전 사용을 권장합니다.</p>
        </div>
        <p>개발 서버가 정상 작동하지 않아 임시 페이지를 표시합니다.</p>
        <div class="links">
            <a href="/auth/simple-login">테스트 로그인</a>
            <a href="/dashboard">대시보드</a>
            <a href="https://github.com/LEONFROMWORK/excelapp">GitHub 저장소</a>
        </div>
        <h3>해결 방법:</h3>
        <pre>
# Node.js 18 설치 (macOS)
brew install nvm
nvm install 18
nvm use 18

# 서버 재실행
npm run dev
        </pre>
    </div>
</body>
</html>`;
  
  fs.writeFileSync('public/index.html', indexHtml);
  console.log('   ✅ 임시 index.html 생성');
  
  console.log('\n   Python 서버 시작...');
  const python = spawn('python3', ['-m', 'http.server', '3000'], {
    cwd: 'public',
    stdio: 'inherit'
  });
  
  console.log('\n✨ 서버 실행 중: http://localhost:3000');
  
  python.on('error', (err) => {
    console.error('Python 서버 오류:', err);
    console.log('\n❌ 모든 대체 방법 실패');
    console.log('Node.js 18.x LTS 설치가 필요합니다.');
  });
}

// 실행
runBuildAndStart();