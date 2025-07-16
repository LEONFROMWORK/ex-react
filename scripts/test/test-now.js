#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting Excel App Test Environment...\n');

// Change to project directory
process.chdir('/Users/kevin/excelapp');

// Check if .env.local exists
const envPath = path.join(__dirname, '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local file not found!');
  process.exit(1);
}

// Load environment variables
require('dotenv').config({ path: envPath });

// Function to run a command
function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env },
      ...options
    });

    proc.on('error', (error) => {
      reject(error);
    });

    proc.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Process exited with code ${code}`));
      }
    });
  });
}

async function main() {
  try {
    console.log('1️⃣ Fixing Prisma client...');
    
    // Remove old Prisma client
    const prismaClientPath = path.join(__dirname, 'node_modules', '.prisma');
    if (fs.existsSync(prismaClientPath)) {
      fs.rmSync(prismaClientPath, { recursive: true, force: true });
    }
    
    // Generate Prisma client
    await runCommand('npx', ['prisma', 'generate']);
    console.log('✅ Prisma client generated\n');
    
    // Create database if needed
    const dbPath = path.join(__dirname, 'prisma', 'dev.db');
    if (!fs.existsSync(dbPath)) {
      console.log('2️⃣ Creating SQLite database...');
      await runCommand('npx', ['prisma', 'db', 'push', '--skip-seed']);
      console.log('✅ Database created\n');
    }
    
    console.log('3️⃣ Starting Next.js server...');
    console.log('   Server will be available at: http://localhost:3000\n');
    
    // Start Next.js
    const nextProc = spawn('npm', ['run', 'dev'], {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env }
    });
    
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n4️⃣ Opening test page...');
    console.log('   Test page: http://localhost:3000/test');
    console.log('   You can also manually open: http://localhost:3000/test\n');
    
    // Try to open browser
    const open = process.platform === 'darwin' ? 'open' : 
                 process.platform === 'win32' ? 'start' : 'xdg-open';
    
    spawn(open, ['http://localhost:3000/test'], {
      detached: true,
      stdio: 'ignore'
    }).unref();
    
    console.log('✅ All services started successfully!');
    console.log('\n📋 Available endpoints:');
    console.log('   - Test Page: http://localhost:3000/test');
    console.log('   - Health Check: http://localhost:3000/api/health');
    console.log('   - Home Page: http://localhost:3000');
    console.log('\nPress Ctrl+C to stop all services.\n');
    
    // Keep the process running
    process.on('SIGINT', () => {
      console.log('\n\n🛑 Stopping all services...');
      nextProc.kill();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();