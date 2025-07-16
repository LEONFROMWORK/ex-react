#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Quick Start - Excel App Services\n');

// Create required directories
const createDirectories = () => {
  const dirs = ['uploads', 'tmp'];
  dirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`✓ Created ${dir} directory`);
    }
  });
};

// Start services using npm scripts
const startServices = () => {
  console.log('\n📦 Starting services...\n');
  
  // Option 1: Try using the existing start-services.js
  if (fs.existsSync(path.join(__dirname, 'start-services.js'))) {
    console.log('Using start-services.js...');
    const services = spawn('node', ['start-services.js'], {
      cwd: __dirname,
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'development' }
    });
    
    services.on('error', (err) => {
      console.error('Failed to start services:', err);
      fallbackStart();
    });
    
    return services;
  } else {
    fallbackStart();
  }
};

// Fallback: Start services individually
const fallbackStart = () => {
  console.log('\nStarting services individually...\n');
  
  // Start socket server
  if (fs.existsSync(path.join(__dirname, 'socket-server.js'))) {
    console.log('Starting WebSocket server...');
    const socketProc = spawn('node', ['socket-server.js'], {
      cwd: __dirname,
      stdio: 'inherit',
      env: process.env
    });
    
    socketProc.on('error', (err) => {
      console.error('WebSocket server error:', err);
    });
  }
  
  // Start Next.js
  setTimeout(() => {
    console.log('\nStarting Next.js server...');
    const nextProc = spawn('npm', ['run', 'dev'], {
      cwd: __dirname,
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, NODE_ENV: 'development' }
    });
    
    nextProc.on('error', (err) => {
      console.error('Next.js error:', err);
    });
  }, 2000);
};

// Display service info
const displayInfo = () => {
  setTimeout(() => {
    console.log('\n✅ Services should be starting...\n');
    console.log('📋 Available at:');
    console.log('  - Main App: http://localhost:3000');
    console.log('  - WebSocket: ws://localhost:3001');
    console.log('  - API Health: http://localhost:3000/api/health');
    console.log('\n🔍 Check the console output above for any errors.');
    console.log('⚡ Press Ctrl+C to stop all services.\n');
  }, 5000);
};

// Main execution
createDirectories();
const proc = startServices();
displayInfo();

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down...');
  process.exit(0);
});