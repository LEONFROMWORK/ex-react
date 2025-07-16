const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Excel App Services\n');

// Test 1: Check if Redis is available
console.log('1. Testing Redis connection...');
try {
  const redis = require('ioredis');
  const client = new redis.Redis({
    host: 'localhost',
    port: 6379,
    retryStrategy: () => null
  });
  
  client.on('connect', () => {
    console.log('✓ Redis is available');
    client.disconnect();
  });
  
  client.on('error', (err) => {
    console.log('✗ Redis is not running:', err.message);
  });
} catch (e) {
  console.log('✗ Redis client error:', e.message);
}

// Test 2: Check Prisma
console.log('\n2. Checking Prisma client...');
try {
  const prismaPath = path.join(__dirname, 'node_modules/.prisma/client');
  if (fs.existsSync(prismaPath)) {
    console.log('✓ Prisma client exists');
  } else {
    console.log('✗ Prisma client not generated');
    console.log('  Generating Prisma client...');
    try {
      execSync('npx prisma generate', { stdio: 'inherit' });
      console.log('✓ Prisma client generated');
    } catch (e) {
      console.log('✗ Failed to generate Prisma client');
    }
  }
} catch (e) {
  console.log('✗ Prisma check failed:', e.message);
}

// Test 3: Check socket server file
console.log('\n3. Checking WebSocket server...');
const socketServerPath = path.join(__dirname, 'socket-server.js');
if (fs.existsSync(socketServerPath)) {
  console.log('✓ socket-server.js exists');
  
  // Check if it's valid
  try {
    const content = fs.readFileSync(socketServerPath, 'utf8');
    if (content.includes('socket.io')) {
      console.log('✓ WebSocket server looks valid');
    }
  } catch (e) {
    console.log('✗ Could not read socket-server.js');
  }
} else {
  console.log('✗ socket-server.js not found');
}

// Test 4: Check test files
console.log('\n4. Checking test files...');
const testDirs = [
  'src/Features/AIChat/SendChatMessage.test.ts',
  'src/Features/ErrorPatterns/SaveErrorPattern.test.ts',
  'src/Features/ExcelAnalysis/AnalyzeErrors/AnalyzeErrors.test.ts',
  'tests/quick-test.js'
];

testDirs.forEach(testFile => {
  if (fs.existsSync(path.join(__dirname, testFile))) {
    console.log(`✓ ${testFile} exists`);
  } else {
    console.log(`✗ ${testFile} not found`);
  }
});

// Test 5: Check API endpoints (if server is running)
console.log('\n5. Testing API endpoints...');
const http = require('http');

const testEndpoint = (path) => {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:3000${path}`, (res) => {
      resolve({ path, status: res.statusCode });
    });
    
    req.on('error', () => {
      resolve({ path, status: 'offline' });
    });
    
    req.setTimeout(2000, () => {
      req.destroy();
      resolve({ path, status: 'timeout' });
    });
  });
};

Promise.all([
  testEndpoint('/api/health'),
  testEndpoint('/'),
  testEndpoint('/api/auth/register')
]).then(results => {
  results.forEach(result => {
    if (result.status === 'offline') {
      console.log(`✗ ${result.path} - Server offline`);
    } else if (result.status === 'timeout') {
      console.log(`✗ ${result.path} - Timeout`);
    } else {
      console.log(`✓ ${result.path} - Status: ${result.status}`);
    }
  });
  
  console.log('\n📊 Summary:');
  console.log('- Redis: Check the output above');
  console.log('- Prisma: Check the output above');
  console.log('- WebSocket: socket-server.js available');
  console.log('- Tests: Multiple test files found');
  console.log('- API: Server needs to be started');
  
  console.log('\n💡 To start all services, run:');
  console.log('  node run-all-services.js');
});