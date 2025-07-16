const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const fs = require('fs');

// Express 설치 확인
try {
  require('express');
} catch {
  console.log('Express 설치 중...');
  require('child_process').execSync('npm install express http-proxy-middleware', { stdio: 'inherit' });
}

const app = express();
const PORT = 3000;

console.log('🚀 간단한 개발 서버 시작');
console.log('========================');

// 정적 파일 제공
app.use(express.static('public'));
app.use(express.static('.next/static'));

// 테스트 로그인 페이지
app.get('/auth/simple-login', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>테스트 로그인 - Exhell</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: #f5f5f5;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
        }
        .container {
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          width: 100%;
          max-width: 400px;
        }
        h1 {
          color: #333;
          margin-bottom: 30px;
          text-align: center;
        }
        .user-card {
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 15px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .user-card:hover {
          border-color: #0070f3;
          background: #f8f9fa;
        }
        .user-card.selected {
          border-color: #0070f3;
          background: #e6f2ff;
        }
        .btn {
          width: 100%;
          padding: 12px;
          background: #0070f3;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          cursor: pointer;
          margin-top: 20px;
        }
        .btn:hover { background: #0051cc; }
        .btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>테스트 로그인</h1>
        <div id="users">
          <div class="user-card" onclick="selectUser('user-1')">
            <h3>Test User</h3>
            <p>test@example.com</p>
            <small>일반 사용자</small>
          </div>
          <div class="user-card" onclick="selectUser('admin-1')">
            <h3>Admin User</h3>
            <p>admin@example.com</p>
            <small>관리자</small>
          </div>
        </div>
        <button class="btn" id="loginBtn" disabled onclick="login()">
          계정을 선택하세요
        </button>
      </div>
      <script>
        let selectedUser = null;
        
        function selectUser(userId) {
          selectedUser = userId;
          document.querySelectorAll('.user-card').forEach(card => {
            card.classList.remove('selected');
          });
          event.target.closest('.user-card').classList.add('selected');
          document.getElementById('loginBtn').disabled = false;
          document.getElementById('loginBtn').textContent = '로그인';
        }
        
        function login() {
          if (!selectedUser) return;
          
          const userData = {
            'user-1': {
              id: 'user-1',
              email: 'test@example.com',
              name: 'Test User',
              role: '일반 사용자',
              tokens: 100
            },
            'admin-1': {
              id: 'admin-1',
              email: 'admin@example.com',
              name: 'Admin User',
              role: '관리자',
              tokens: 1000
            }
          };
          
          localStorage.setItem('testUser', JSON.stringify(userData[selectedUser]));
          window.location.href = '/dashboard';
        }
      </script>
    </body>
    </html>
  `);
});

// 대시보드 페이지
app.get('/dashboard*', (req, res) => {
  const user = req.headers.cookie?.includes('testUser') ? 'Test User' : null;
  
  if (!user) {
    res.redirect('/auth/simple-login');
    return;
  }
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>대시보드 - Exhell</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: #f5f5f5;
        }
        header {
          background: white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          padding: 15px 0;
        }
        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #0070f3;
        }
        nav a {
          margin: 0 15px;
          text-decoration: none;
          color: #666;
        }
        nav a:hover { color: #0070f3; }
        .main {
          max-width: 1200px;
          margin: 40px auto;
          padding: 0 20px;
        }
        .welcome {
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          text-align: center;
        }
        .features {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          margin-top: 30px;
        }
        .feature-card {
          background: white;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          text-align: center;
        }
        .feature-card h3 { margin-bottom: 10px; }
        .btn {
          display: inline-block;
          padding: 10px 20px;
          background: #0070f3;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          margin-top: 15px;
        }
        .btn:hover { background: #0051cc; }
      </style>
    </head>
    <body>
      <header>
        <div class="header-content">
          <div class="logo">📊 Exhell</div>
          <nav>
            <a href="/dashboard">대시보드</a>
            <a href="/dashboard/upload">파일 업로드</a>
            <a href="/dashboard/chat">AI 어시스턴트</a>
            <a href="#" onclick="logout()">로그아웃</a>
          </nav>
        </div>
      </header>
      <div class="main">
        <div class="welcome">
          <h1>환영합니다! 👋</h1>
          <p style="margin-top: 10px; color: #666;">
            Exhell은 AI 기반 Excel 오류 수정 플랫폼입니다.
          </p>
        </div>
        <div class="features">
          <div class="feature-card">
            <h3>📤 파일 업로드</h3>
            <p>Excel 파일을 업로드하고 오류를 자동으로 검사합니다.</p>
            <a href="/dashboard/upload" class="btn">시작하기</a>
          </div>
          <div class="feature-card">
            <h3>🤖 AI 어시스턴트</h3>
            <p>AI와 대화하며 Excel 작업을 수행합니다.</p>
            <a href="/dashboard/chat" class="btn">대화하기</a>
          </div>
          <div class="feature-card">
            <h3>📊 처리 내역</h3>
            <p>이전에 처리한 파일들을 확인합니다.</p>
            <a href="/dashboard/history" class="btn">확인하기</a>
          </div>
        </div>
      </div>
      <script>
        function logout() {
          localStorage.removeItem('testUser');
          window.location.href = '/auth/simple-login';
        }
      </script>
    </body>
    </html>
  `);
});

// 기본 페이지
app.get('/', (req, res) => {
  res.redirect('/auth/simple-login');
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`\n✅ 서버가 시작되었습니다!`);
  console.log(`🌐 http://localhost:${PORT}`);
  console.log(`\n사용 가능한 페이지:`);
  console.log(`- 로그인: http://localhost:${PORT}/auth/simple-login`);
  console.log(`- 대시보드: http://localhost:${PORT}/dashboard`);
  console.log(`\n⚠️  이것은 임시 개발 서버입니다.`);
  console.log(`정상적인 Next.js 개발을 위해서는 Node.js 18.x LTS 설치를 권장합니다.`);
});