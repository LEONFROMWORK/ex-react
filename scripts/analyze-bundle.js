#!/usr/bin/env node

/**
 * Bundle size analyzer for Next.js application
 * Helps identify large dependencies and optimization opportunities
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getDirSize(dirPath) {
  let totalSize = 0;
  
  function calculateSize(itemPath) {
    try {
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        const items = fs.readdirSync(itemPath);
        items.forEach(item => {
          calculateSize(path.join(itemPath, item));
        });
      } else {
        totalSize += stats.size;
      }
    } catch (error) {
      // Ignore permission errors
    }
  }
  
  calculateSize(dirPath);
  return totalSize;
}

function analyzeNodeModules() {
  console.log(`${colors.cyan}=== Node Modules Analysis ===${colors.reset}\n`);
  
  const nodeModulesPath = path.join(process.cwd(), 'node_modules');
  
  if (!fs.existsSync(nodeModulesPath)) {
    console.log(`${colors.red}node_modules directory not found!${colors.reset}`);
    return;
  }
  
  // Get total size
  console.log('Calculating total size...');
  const totalSize = getDirSize(nodeModulesPath);
  console.log(`${colors.yellow}Total node_modules size: ${formatBytes(totalSize)}${colors.reset}\n`);
  
  // Analyze individual packages
  console.log('Analyzing top packages by size...\n');
  const packages = fs.readdirSync(nodeModulesPath);
  const packageSizes = [];
  
  packages.forEach(pkg => {
    const pkgPath = path.join(nodeModulesPath, pkg);
    try {
      const stats = fs.statSync(pkgPath);
      if (stats.isDirectory() && !pkg.startsWith('.')) {
        const size = getDirSize(pkgPath);
        if (size > 1024 * 1024) { // Only show packages > 1MB
          packageSizes.push({ name: pkg, size });
        }
      }
    } catch (error) {
      // Ignore errors
    }
  });
  
  // Sort by size and show top 20
  packageSizes.sort((a, b) => b.size - a.size);
  const top20 = packageSizes.slice(0, 20);
  
  console.log(`${colors.magenta}Top 20 largest packages:${colors.reset}`);
  top20.forEach((pkg, index) => {
    const percentage = ((pkg.size / totalSize) * 100).toFixed(1);
    console.log(
      `${index + 1}. ${colors.blue}${pkg.name.padEnd(40)}${colors.reset} ` +
      `${formatBytes(pkg.size).padStart(10)} (${percentage}%)`
    );
  });
  
  // Identify duplicate packages
  console.log(`\n${colors.magenta}Checking for duplicate packages...${colors.reset}`);
  const allPackages = new Map();
  
  function findDuplicates(dir, prefix = '') {
    const items = fs.readdirSync(dir);
    items.forEach(item => {
      const itemPath = path.join(dir, item);
      try {
        const stats = fs.statSync(itemPath);
        if (stats.isDirectory() && item === 'node_modules') {
          const subModules = fs.readdirSync(itemPath);
          subModules.forEach(subPkg => {
            const key = subPkg;
            if (!allPackages.has(key)) {
              allPackages.set(key, []);
            }
            allPackages.get(key).push(path.relative(nodeModulesPath, path.join(itemPath, subPkg)));
          });
          findDuplicates(itemPath, prefix + '  ');
        }
      } catch (error) {
        // Ignore errors
      }
    });
  }
  
  findDuplicates(nodeModulesPath);
  
  const duplicates = Array.from(allPackages.entries())
    .filter(([_, locations]) => locations.length > 1)
    .sort((a, b) => b[1].length - a[1].length);
  
  if (duplicates.length > 0) {
    console.log(`\n${colors.yellow}Found ${duplicates.length} duplicate packages:${colors.reset}`);
    duplicates.slice(0, 10).forEach(([pkg, locations]) => {
      console.log(`\n${colors.blue}${pkg}${colors.reset} (${locations.length} instances)`);
      locations.slice(0, 3).forEach(loc => console.log(`  - ${loc}`));
      if (locations.length > 3) {
        console.log(`  ... and ${locations.length - 3} more`);
      }
    });
  } else {
    console.log(`${colors.green}No duplicate packages found!${colors.reset}`);
  }
  
  // Optimization suggestions
  console.log(`\n${colors.cyan}=== Optimization Suggestions ===${colors.reset}\n`);
  
  const suggestions = [];
  
  // Check for multiple AI SDKs
  const aiPackages = ['openai', '@anthropic-ai/sdk', '@google/generative-ai'];
  const foundAI = aiPackages.filter(pkg => packageSizes.some(p => p.name === pkg));
  if (foundAI.length > 1) {
    suggestions.push({
      issue: 'Multiple AI SDKs detected',
      packages: foundAI,
      suggestion: 'Consider using only the AI providers you actually need in production'
    });
  }
  
  // Check for large UI libraries
  const uiPackages = packageSizes.filter(p => p.name.startsWith('@radix-ui/'));
  if (uiPackages.length > 10) {
    suggestions.push({
      issue: 'Many Radix UI components',
      packages: `${uiPackages.length} @radix-ui packages`,
      suggestion: 'Consider creating a custom UI component bundle with only used components'
    });
  }
  
  // Check for development dependencies in production
  const devPackages = ['@types/', 'eslint', 'prettier', 'jest', '@testing-library'];
  const foundDev = packageSizes.filter(p => devPackages.some(dev => p.name.includes(dev)));
  if (foundDev.length > 0) {
    suggestions.push({
      issue: 'Possible dev dependencies in node_modules',
      packages: foundDev.map(p => p.name).slice(0, 5).join(', '),
      suggestion: 'Ensure you\'re installing with --production flag for deployment'
    });
  }
  
  suggestions.forEach((s, i) => {
    console.log(`${i + 1}. ${colors.yellow}${s.issue}${colors.reset}`);
    console.log(`   Packages: ${s.packages}`);
    console.log(`   ${colors.green}→ ${s.suggestion}${colors.reset}\n`);
  });
  
  // Final recommendations
  console.log(`${colors.cyan}=== Quick Wins ===${colors.reset}\n`);
  console.log('1. Run: npm prune --production');
  console.log('2. Use Next.js standalone output mode (already configured)');
  console.log('3. Implement dynamic imports for heavy libraries');
  console.log('4. Use the optimization script: ./scripts/optimize-dependencies.sh');
  console.log('5. Consider using pnpm instead of npm for better deduplication\n');
}

// Run the analysis
analyzeNodeModules();