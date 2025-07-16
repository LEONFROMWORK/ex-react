#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { createClient } = require('redis');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

// Check if required directories exist
const checkDirectories = () => {
  log('\n=== Checking directories ===', 'cyan');
  
  const dirs = ['uploads', 'node_modules', 'prisma', 'src', 'public'];
  const missingDirs = [];
  
  dirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (fs.existsSync(dirPath)) {
      log(`✓ ${dir} exists`, 'green');
    } else {
      log(`✗ ${dir} missing`, 'red');
      missingDirs.push(dir);
    }
  });
  
  // Create uploads directory if missing
  if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
    fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });
    log('Created uploads directory', 'yellow');
  }
  
  return missingDirs.length === 0;
};

// Check if package dependencies are installed
const checkDependencies = () => {
  log('\n=== Checking dependencies ===', 'cyan');
  
  const packageJson = require('./package.json');
  const requiredDeps = ['socket.io', '@prisma/client', 'next', 'redis', 'ioredis'];
  const missingDeps = [];
  
  requiredDeps.forEach(dep => {
    if (packageJson.dependencies[dep]) {
      log(`✓ ${dep} is in package.json`, 'green');
    } else {
      log(`✗ ${dep} missing from package.json`, 'red');
      missingDeps.push(dep);
    }
  });
  
  return missingDeps.length === 0;
};

// Check Redis connection
const checkRedis = async () => {
  log('\n=== Checking Redis connection ===', 'cyan');
  
  try {
    const redis = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    
    await redis.connect();
    await redis.ping();
    log('✓ Redis is running and accessible', 'green');
    await redis.disconnect();
    return true;
  } catch (error) {
    log(`✗ Redis connection failed: ${error.message}`, 'red');
    log('  Please ensure Redis is installed and running:', 'yellow');
    log('  - Install: brew install redis', 'yellow');
    log('  - Start: brew services start redis', 'yellow');
    return false;
  }
};

// Check PostgreSQL connection
const checkDatabase = () => {
  return new Promise((resolve) => {
    log('\n=== Checking database ===', 'cyan');
    
    exec('npx prisma db push --skip-generate', (error, stdout, stderr) => {
      if (error) {
        log(`✗ Database check failed: ${error.message}`, 'red');
        log('  Please ensure PostgreSQL is running and configured', 'yellow');
        resolve(false);
      } else {
        log('✓ Database schema synchronized', 'green');
        resolve(true);
      }
    });
  });
};

// Generate Prisma client
const generatePrismaClient = () => {
  return new Promise((resolve) => {
    log('\n=== Generating Prisma client ===', 'cyan');
    
    exec('npx prisma generate', (error, stdout, stderr) => {
      if (error) {
        log(`✗ Prisma generate failed: ${error.message}`, 'red');
        resolve(false);
      } else {
        log('✓ Prisma client generated', 'green');
        resolve(true);
      }
    });
  });
};

// Start WebSocket server
const startSocketServer = () => {
  log('\n=== Starting WebSocket server ===', 'cyan');
  
  const socketServer = spawn('node', ['socket-server.js'], {
    env: { ...process.env },
    stdio: 'pipe'
  });
  
  socketServer.stdout.on('data', (data) => {
    log(`[WebSocket] ${data.toString().trim()}`, 'magenta');
  });
  
  socketServer.stderr.on('data', (data) => {
    log(`[WebSocket Error] ${data.toString().trim()}`, 'red');
  });
  
  return socketServer;
};

// Start Next.js development server
const startNextServer = () => {
  log('\n=== Starting Next.js server ===', 'cyan');
  
  const nextServer = spawn('npm', ['run', 'dev'], {
    env: { ...process.env, NODE_ENV: 'development' },
    stdio: 'pipe',
    shell: true
  });
  
  nextServer.stdout.on('data', (data) => {
    log(`[Next.js] ${data.toString().trim()}`, 'blue');
  });
  
  nextServer.stderr.on('data', (data) => {
    const message = data.toString().trim();
    // Filter out non-error messages
    if (!message.includes('warn') && !message.includes('info')) {
      log(`[Next.js Error] ${message}`, 'red');
    }
  });
  
  return nextServer;
};

// Wait for server to be ready
const waitForServer = (port, maxAttempts = 30) => {
  return new Promise((resolve) => {
    let attempts = 0;
    
    const checkServer = () => {
      attempts++;
      
      const req = http.get(`http://localhost:${port}/api/health`, (res) => {
        if (res.statusCode === 200) {
          log(`✓ Server on port ${port} is ready`, 'green');
          resolve(true);
        } else {
          setTimeout(checkServer, 1000);
        }
      });
      
      req.on('error', () => {
        if (attempts < maxAttempts) {
          setTimeout(checkServer, 1000);
        } else {
          log(`✗ Server on port ${port} failed to start`, 'red');
          resolve(false);
        }
      });
      
      req.end();
    };
    
    checkServer();
  });
};

// Run tests
const runTests = () => {
  return new Promise((resolve) => {
    log('\n=== Running tests ===', 'cyan');
    
    // First, try to run a simple API test
    exec('npm run test:quick', (error, stdout, stderr) => {
      if (error) {
        log('Quick test not available, running standard tests', 'yellow');
        
        // Run unit tests
        exec('npm run test:unit', (error, stdout, stderr) => {
          if (error) {
            log(`✗ Unit tests failed: ${error.message}`, 'red');
          } else {
            log('✓ Unit tests passed', 'green');
            console.log(stdout);
          }
          
          // Run integration tests
          exec('npm run test:integration', (error, stdout, stderr) => {
            if (error) {
              log(`✗ Integration tests failed: ${error.message}`, 'red');
            } else {
              log('✓ Integration tests passed', 'green');
              console.log(stdout);
            }
            resolve();
          });
        });
      } else {
        log('✓ Quick tests passed', 'green');
        console.log(stdout);
        resolve();
      }
    });
  });
};

// Test API endpoints
const testEndpoints = async () => {
  log('\n=== Testing API endpoints ===', 'cyan');
  
  const endpoints = [
    { path: '/api/health', method: 'GET', name: 'Health Check' },
    { path: '/api/auth/register', method: 'POST', name: 'Registration' },
    { path: '/api/files/upload', method: 'POST', name: 'File Upload' },
    { path: '/api/analyze', method: 'POST', name: 'Analysis' }
  ];
  
  for (const endpoint of endpoints) {
    await testEndpoint(endpoint);
  }
};

const testEndpoint = (endpoint) => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: endpoint.path,
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode < 500) {
          log(`✓ ${endpoint.name} endpoint is responding (${res.statusCode})`, 'green');
        } else {
          log(`✗ ${endpoint.name} endpoint error (${res.statusCode})`, 'red');
        }
        resolve();
      });
    });
    
    req.on('error', (error) => {
      log(`✗ ${endpoint.name} endpoint failed: ${error.message}`, 'red');
      resolve();
    });
    
    if (endpoint.method === 'POST') {
      req.write(JSON.stringify({}));
    }
    
    req.end();
  });
};

// Main execution
const main = async () => {
  log('🚀 Starting Excel App Services and Tests', 'cyan');
  log('=' .repeat(50), 'cyan');
  
  // Check environment
  if (!checkDirectories()) {
    log('\n⚠️  Some directories are missing but will be created', 'yellow');
  }
  
  if (!checkDependencies()) {
    log('\n⚠️  Some dependencies might be missing', 'yellow');
  }
  
  // Check external services
  const redisOk = await checkRedis();
  if (!redisOk) {
    log('\n⚠️  Redis is not running. Some features may not work.', 'yellow');
  }
  
  // Setup database
  const prismaGenerated = await generatePrismaClient();
  if (!prismaGenerated) {
    log('\n⚠️  Prisma client generation failed', 'yellow');
  }
  
  const dbOk = await checkDatabase();
  if (!dbOk) {
    log('\n⚠️  Database setup failed. Using mock data.', 'yellow');
  }
  
  // Start services
  let socketServer, nextServer;
  
  try {
    socketServer = startSocketServer();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for socket server
    
    nextServer = startNextServer();
    
    log('\n⏳ Waiting for servers to start...', 'yellow');
    const serverReady = await waitForServer(3000);
    
    if (serverReady) {
      // Test endpoints
      await testEndpoints();
      
      // Run tests
      await runTests();
      
      log('\n✅ All services started successfully!', 'green');
      log('\n📋 Service Status:', 'cyan');
      log('  - Next.js: http://localhost:3000', 'blue');
      log('  - WebSocket: ws://localhost:3001', 'magenta');
      log('  - Redis: ' + (redisOk ? 'Connected' : 'Not available'), redisOk ? 'green' : 'yellow');
      log('  - Database: ' + (dbOk ? 'Connected' : 'Using mock'), dbOk ? 'green' : 'yellow');
      
      log('\n🎯 You can now:', 'cyan');
      log('  1. Visit http://localhost:3000 to use the app', 'white');
      log('  2. Upload Excel files for analysis', 'white');
      log('  3. Test the chat interface', 'white');
      log('  4. Check real-time progress updates', 'white');
      
      log('\n⚡ Press Ctrl+C to stop all services', 'yellow');
    } else {
      throw new Error('Servers failed to start');
    }
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    
    // Cleanup
    if (socketServer) socketServer.kill();
    if (nextServer) nextServer.kill();
    
    process.exit(1);
  }
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    log('\n\n🛑 Shutting down services...', 'yellow');
    
    if (socketServer) {
      socketServer.kill();
      log('✓ WebSocket server stopped', 'green');
    }
    
    if (nextServer) {
      nextServer.kill();
      log('✓ Next.js server stopped', 'green');
    }
    
    log('\n👋 Goodbye!', 'cyan');
    process.exit(0);
  });
};

// Run the main function
main().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  process.exit(1);
});