#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

console.log('🧪 Excel App - Complete Test Suite\n');
console.log('=' .repeat(60));

// Test results storage
const results = {
  environment: [],
  dependencies: [],
  services: [],
  api: [],
  tests: []
};

// Helper functions
const log = (message, type = 'info') => {
  const symbols = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };
  console.log(`${symbols[type]} ${message}`);
};

// 1. Environment Check
const checkEnvironment = () => {
  console.log('\n1️⃣ ENVIRONMENT CHECK');
  console.log('-'.repeat(40));
  
  // Check Node version
  const nodeVersion = process.version;
  log(`Node.js: ${nodeVersion}`, 'info');
  results.environment.push({ item: 'Node.js', status: 'ok', version: nodeVersion });
  
  // Check npm version
  try {
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    log(`npm: ${npmVersion}`, 'info');
    results.environment.push({ item: 'npm', status: 'ok', version: npmVersion });
  } catch (e) {
    log('npm not found', 'error');
    results.environment.push({ item: 'npm', status: 'error' });
  }
  
  // Check directories
  const dirs = ['src', 'prisma', 'uploads', 'public', 'node_modules'];
  dirs.forEach(dir => {
    if (fs.existsSync(path.join(__dirname, dir))) {
      log(`Directory ${dir} exists`, 'success');
      results.environment.push({ item: `Directory: ${dir}`, status: 'ok' });
    } else {
      log(`Directory ${dir} missing`, 'error');
      results.environment.push({ item: `Directory: ${dir}`, status: 'missing' });
    }
  });
};

// 2. Dependencies Check
const checkDependencies = () => {
  console.log('\n2️⃣ DEPENDENCIES CHECK');
  console.log('-'.repeat(40));
  
  try {
    const pkg = require('./package.json');
    const critical = [
      'next', 'react', 'react-dom', '@prisma/client',
      'socket.io', 'socket.io-client', 'ioredis',
      'exceljs', 'openai', '@anthropic-ai/sdk'
    ];
    
    critical.forEach(dep => {
      if (pkg.dependencies[dep]) {
        log(`${dep}: ${pkg.dependencies[dep]}`, 'success');
        results.dependencies.push({ item: dep, status: 'ok', version: pkg.dependencies[dep] });
      } else {
        log(`${dep}: NOT FOUND`, 'error');
        results.dependencies.push({ item: dep, status: 'missing' });
      }
    });
    
    // Check if node_modules exists
    if (!fs.existsSync(path.join(__dirname, 'node_modules'))) {
      log('node_modules not found - run npm install', 'error');
    }
  } catch (e) {
    log('Could not read package.json', 'error');
  }
};

// 3. Database and Services Check
const checkServices = async () => {
  console.log('\n3️⃣ SERVICES CHECK');
  console.log('-'.repeat(40));
  
  // Check Redis
  try {
    const Redis = require('ioredis');
    const redis = new Redis({
      host: 'localhost',
      port: 6379,
      retryStrategy: () => null,
      lazyConnect: true,
      connectTimeout: 2000
    });
    
    await redis.connect();
    await redis.ping();
    log('Redis: Connected', 'success');
    results.services.push({ item: 'Redis', status: 'running' });
    await redis.disconnect();
  } catch (e) {
    log('Redis: Not running', 'error');
    results.services.push({ item: 'Redis', status: 'offline' });
  }
  
  // Check Prisma
  const prismaPath = path.join(__dirname, 'node_modules/.prisma/client');
  if (fs.existsSync(prismaPath)) {
    log('Prisma Client: Generated', 'success');
    results.services.push({ item: 'Prisma Client', status: 'ok' });
  } else {
    log('Prisma Client: Not generated', 'error');
    results.services.push({ item: 'Prisma Client', status: 'missing' });
  }
  
  // Check Socket Server
  if (fs.existsSync(path.join(__dirname, 'socket-server.js'))) {
    log('WebSocket Server: File exists', 'success');
    results.services.push({ item: 'WebSocket Server', status: 'available' });
  } else {
    log('WebSocket Server: File missing', 'error');
    results.services.push({ item: 'WebSocket Server', status: 'missing' });
  }
};

// 4. API Endpoints Test
const testAPIs = async () => {
  console.log('\n4️⃣ API ENDPOINTS TEST');
  console.log('-'.repeat(40));
  
  // Check if server is running
  const checkEndpoint = (path, method = 'GET') => {
    return new Promise((resolve) => {
      const options = {
        hostname: 'localhost',
        port: 3000,
        path: path,
        method: method,
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 3000
      };
      
      const req = http.request(options, (res) => {
        resolve({ path, status: res.statusCode, online: true });
      });
      
      req.on('error', () => {
        resolve({ path, status: 'offline', online: false });
      });
      
      req.on('timeout', () => {
        req.destroy();
        resolve({ path, status: 'timeout', online: false });
      });
      
      req.end();
    });
  };
  
  const endpoints = [
    '/api/health',
    '/api/auth/session',
    '/api/analyze',
    '/api/files/upload',
    '/api/ai/models/active'
  ];
  
  console.log('Testing endpoints...');
  
  for (const endpoint of endpoints) {
    const result = await checkEndpoint(endpoint);
    if (result.online) {
      log(`${endpoint}: ${result.status}`, result.status < 400 ? 'success' : 'warning');
    } else {
      log(`${endpoint}: Server offline`, 'error');
    }
    results.api.push(result);
  }
};

// 5. Run Tests
const runTests = () => {
  console.log('\n5️⃣ RUNNING TESTS');
  console.log('-'.repeat(40));
  
  // Check for test files
  const testFiles = [
    'src/Features/AIChat/SendChatMessage.test.ts',
    'src/Features/ErrorPatterns/SaveErrorPattern.test.ts',
    'src/Features/ExcelAnalysis/AnalyzeErrors/AnalyzeErrors.test.ts',
    'tests/quick-test.js'
  ];
  
  let foundTests = 0;
  testFiles.forEach(file => {
    if (fs.existsSync(path.join(__dirname, file))) {
      foundTests++;
      log(`Found: ${file}`, 'success');
    }
  });
  
  log(`Found ${foundTests}/${testFiles.length} test files`, foundTests > 0 ? 'info' : 'warning');
  
  // Try to run quick test if available
  if (fs.existsSync(path.join(__dirname, 'tests/quick-test.js'))) {
    try {
      console.log('\nRunning quick test...');
      execSync('node tests/quick-test.js', { 
        stdio: 'inherit',
        timeout: 10000 
      });
      results.tests.push({ item: 'Quick Test', status: 'passed' });
    } catch (e) {
      log('Quick test failed', 'error');
      results.tests.push({ item: 'Quick Test', status: 'failed' });
    }
  }
};

// 6. Generate Report
const generateReport = () => {
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY REPORT');
  console.log('='.repeat(60));
  
  // Environment
  console.log('\n🌍 Environment:');
  const envOk = results.environment.filter(r => r.status === 'ok').length;
  console.log(`  ${envOk}/${results.environment.length} checks passed`);
  
  // Dependencies
  console.log('\n📦 Dependencies:');
  const depOk = results.dependencies.filter(r => r.status === 'ok').length;
  console.log(`  ${depOk}/${results.dependencies.length} dependencies found`);
  
  // Services
  console.log('\n🔧 Services:');
  results.services.forEach(s => {
    console.log(`  - ${s.item}: ${s.status}`);
  });
  
  // API
  console.log('\n🌐 API Status:');
  const serverOnline = results.api.some(a => a.online);
  if (serverOnline) {
    console.log('  Server is running');
    results.api.forEach(a => {
      if (a.online) console.log(`  - ${a.path}: ${a.status}`);
    });
  } else {
    console.log('  Server is OFFLINE');
  }
  
  // Overall Status
  console.log('\n' + '='.repeat(60));
  
  const issues = [];
  if (!results.services.find(s => s.item === 'Redis')?.status.includes('running')) {
    issues.push('Redis is not running');
  }
  if (!results.services.find(s => s.item === 'Prisma Client')?.status.includes('ok')) {
    issues.push('Prisma client not generated');
  }
  if (!serverOnline) {
    issues.push('Next.js server is not running');
  }
  
  if (issues.length === 0) {
    console.log('✅ SYSTEM READY - All checks passed!');
  } else {
    console.log('⚠️  ISSUES FOUND:');
    issues.forEach(issue => console.log(`   - ${issue}`));
  }
  
  console.log('\n📝 NEXT STEPS:');
  if (!results.services.find(s => s.item === 'Redis')?.status.includes('running')) {
    console.log('1. Start Redis: brew services start redis');
  }
  if (!results.services.find(s => s.item === 'Prisma Client')?.status.includes('ok')) {
    console.log('2. Generate Prisma: npx prisma generate');
  }
  if (!serverOnline) {
    console.log('3. Start services: node start-services.js');
  }
  console.log('4. Run tests: npm test');
  
  console.log('\n' + '='.repeat(60));
};

// Main execution
const main = async () => {
  try {
    checkEnvironment();
    checkDependencies();
    await checkServices();
    await testAPIs();
    runTests();
    generateReport();
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
};

// Run the complete test
main();