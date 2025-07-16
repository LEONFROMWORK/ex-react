const { exec } = require('child_process');
const http = require('http');

console.log('🚀 Starting Excel App Test...\n');

// 1. First check if server is already running
const checkServer = () => {
  return new Promise((resolve) => {
    http.get('http://localhost:3000/api/health', (res) => {
      resolve(true);
    }).on('error', () => {
      resolve(false);
    });
  });
};

// 2. Start the server if needed
async function startServer() {
  const isRunning = await checkServer();
  
  if (isRunning) {
    console.log('✅ Server is already running on port 3000');
    return;
  }
  
  console.log('Starting Next.js server...');
  const server = exec('npm run dev', {
    cwd: '/Users/kevin/excelapp'
  });
  
  server.stdout.on('data', (data) => {
    console.log(data.toString());
  });
  
  server.stderr.on('data', (data) => {
    console.error(data.toString());
  });
  
  // Wait for server to start
  let attempts = 0;
  while (attempts < 30) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const running = await checkServer();
    if (running) {
      console.log('✅ Server started successfully!');
      break;
    }
    attempts++;
  }
}

// 3. Run the tests
async function runTests() {
  console.log('\n📋 Running tests...\n');
  
  const tests = [
    { name: 'Health Check', url: 'http://localhost:3000/api/health' },
    { name: 'Home Page', url: 'http://localhost:3000' },
    { name: 'Test Page', url: 'http://localhost:3000/test' }
  ];
  
  for (const test of tests) {
    console.log(`Testing: ${test.name}`);
    await new Promise((resolve) => {
      http.get(test.url, (res) => {
        console.log(`  Status: ${res.statusCode} ${res.statusCode === 200 ? '✅' : '❌'}`);
        resolve();
      }).on('error', (err) => {
        console.log(`  Error: ${err.message} ❌`);
        resolve();
      });
    });
  }
  
  console.log('\n✨ Test complete!');
  console.log('\nOpen http://localhost:3000/test in your browser to see the test page.');
}

// Main execution
async function main() {
  try {
    await startServer();
    await runTests();
  } catch (error) {
    console.error('Error:', error);
  }
}

main();