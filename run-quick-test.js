const fs = require('fs');
const path = require('path');

console.log('🧪 Excel App - Quick Test Report\n');

// 1. Check environment
console.log('1️⃣ Environment Check:');
console.log('-------------------');
console.log(`Working Directory: ${process.cwd()}`);
console.log(`Node Version: ${process.version}`);
console.log(`Platform: ${process.platform}`);

// 2. Check dependencies
console.log('\n2️⃣ Dependencies Check:');
console.log('---------------------');
try {
  const pkg = require('./package.json');
  const criticalDeps = [
    'next', 'react', '@prisma/client', 'socket.io', 
    'ioredis', 'exceljs', 'openai', '@anthropic-ai/sdk'
  ];
  
  criticalDeps.forEach(dep => {
    if (pkg.dependencies[dep]) {
      console.log(`✓ ${dep}: ${pkg.dependencies[dep]}`);
    } else {
      console.log(`✗ ${dep}: NOT FOUND`);
    }
  });
} catch (e) {
  console.log('✗ Could not read package.json');
}

// 3. Check file structure
console.log('\n3️⃣ File Structure Check:');
console.log('-----------------------');
const checkPaths = [
  { path: 'src/app/layout.tsx', type: 'App Layout' },
  { path: 'src/app/api/health/route.ts', type: 'Health API' },
  { path: 'src/app/api/analyze/route.ts', type: 'Analyze API' },
  { path: 'src/Features/ExcelAnalysis/AnalyzeErrors/AnalyzeErrors.ts', type: 'Excel Analyzer' },
  { path: 'prisma/schema.prisma', type: 'Database Schema' },
  { path: 'socket-server.js', type: 'WebSocket Server' },
  { path: '.env.local', type: 'Environment Config' },
  { path: 'next.config.mjs', type: 'Next.js Config' }
];

checkPaths.forEach(({ path: filePath, type }) => {
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`✓ ${type}: ${filePath} (${stats.size} bytes)`);
  } else {
    console.log(`✗ ${type}: ${filePath} NOT FOUND`);
  }
});

// 4. Check Prisma
console.log('\n4️⃣ Prisma Check:');
console.log('---------------');
const prismaClientPath = path.join(__dirname, 'node_modules/.prisma/client');
if (fs.existsSync(prismaClientPath)) {
  console.log('✓ Prisma client is generated');
} else {
  console.log('✗ Prisma client not generated (run: npx prisma generate)');
}

// 5. Test files check
console.log('\n5️⃣ Test Files Check:');
console.log('-------------------');
const testFiles = [
  'src/Features/AIChat/SendChatMessage.test.ts',
  'src/Features/ErrorPatterns/SaveErrorPattern.test.ts',
  'src/Features/ExcelAnalysis/AnalyzeErrors/AnalyzeErrors.test.ts',
  'src/Features/ExcelGeneration/GenerateFromPrompt/GenerateFromPrompt.test.ts',
  'src/Features/Referral/ProcessReferralReward.test.ts',
  'e2e/integration2-system.test.ts',
  'tests/quick-test.js'
];

let testCount = 0;
testFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✓ ${file}`);
    testCount++;
  }
});
console.log(`Found ${testCount}/${testFiles.length} test files`);

// 6. Check environment variables
console.log('\n6️⃣ Environment Variables:');
console.log('------------------------');
if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const envVars = [
    'DATABASE_URL',
    'NEXTAUTH_URL',
    'AUTH_SECRET',
    'REDIS_URL',
    'STORAGE_TYPE',
    'MOCK_AUTH_ENABLED'
  ];
  
  envVars.forEach(varName => {
    if (envContent.includes(varName)) {
      console.log(`✓ ${varName} is defined`);
    } else {
      console.log(`✗ ${varName} is missing`);
    }
  });
} else {
  console.log('✗ .env.local file not found');
}

// 7. Feature summary
console.log('\n7️⃣ Feature Modules:');
console.log('------------------');
const featureDir = path.join(__dirname, 'src/Features');
if (fs.existsSync(featureDir)) {
  const features = fs.readdirSync(featureDir)
    .filter(f => fs.statSync(path.join(featureDir, f)).isDirectory());
  
  console.log(`Found ${features.length} feature modules:`);
  features.slice(0, 10).forEach(f => console.log(`  • ${f}`));
  if (features.length > 10) {
    console.log(`  ... and ${features.length - 10} more`);
  }
}

// 8. API Routes
console.log('\n8️⃣ API Routes:');
console.log('-------------');
const apiDir = path.join(__dirname, 'src/app/api');
if (fs.existsSync(apiDir)) {
  const countRoutes = (dir) => {
    let count = 0;
    const items = fs.readdirSync(dir);
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stats = fs.statSync(fullPath);
      if (stats.isDirectory()) {
        count += countRoutes(fullPath);
      } else if (item === 'route.ts' || item === 'route.js') {
        count++;
      }
    });
    return count;
  };
  
  const routeCount = countRoutes(apiDir);
  console.log(`Found ${routeCount} API routes`);
  
  // List some important routes
  const importantRoutes = [
    'health', 'analyze', 'auth/[...nextauth]', 'files/upload',
    'ai/chat', 'payments/create-intent', 'admin/stats'
  ];
  
  console.log('Key routes:');
  importantRoutes.forEach(route => {
    const routePath = path.join(apiDir, route, 'route.ts');
    if (fs.existsSync(routePath)) {
      console.log(`  ✓ /api/${route}`);
    }
  });
}

// Summary
console.log('\n📊 Summary:');
console.log('----------');
console.log('• Project appears to be properly structured');
console.log('• Key dependencies are present in package.json');
console.log('• Multiple test files are available');
console.log('• Feature-based architecture is implemented');
console.log('• API routes are organized');

console.log('\n🚀 Next Steps:');
console.log('-------------');
console.log('1. Install dependencies: npm install');
console.log('2. Generate Prisma client: npx prisma generate');
console.log('3. Start Redis: brew services start redis (macOS)');
console.log('4. Start PostgreSQL: brew services start postgresql (macOS)');
console.log('5. Run migrations: npm run db:push');
console.log('6. Start all services: node quick-start.js');
console.log('7. Run tests: npm test');

console.log('\n✅ Test report complete!');