#!/bin/bash

# React Bundle Size Optimization Script
# Based on best practices from the optimization guide

echo "🚀 React Bundle Size Optimization"
echo "=================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 1. Backup current state
echo -e "\n${YELLOW}1. Creating backup...${NC}"
cp package.json package.json.backup-$(date +%Y%m%d-%H%M%S)
cp -r src src.backup-bundle-opt-$(date +%Y%m%d-%H%M%S) 2>/dev/null

# 2. Remove duplicate and unused dependencies
echo -e "\n${YELLOW}2. Removing unused dependencies...${NC}"

# Phase 1: Definitely unused packages
UNUSED_PACKAGES=(
  "@radix-ui/react-radio-group"
  "@radix-ui/react-separator"
  "@radix-ui/react-slider"
  "@radix-ui/react-menubar"
  "@radix-ui/react-navigation-menu"
  "@radix-ui/react-context-menu"
  "@radix-ui/react-alert-dialog"
  "@radix-ui/react-popover"
  "@radix-ui/react-tooltip"
  "@radix-ui/react-progress"
  "@radix-ui/react-select"
  "@radix-ui/react-switch"
  "@radix-ui/react-scroll-area"
  "@uploadthing/react"
  "uploadthing"
  "jose"
  "cmdk"
  "react-day-picker"
  "@tanstack/react-table"
  "@tosspayments/tosspayments-sdk"
)

echo "Removing ${#UNUSED_PACKAGES[@]} unused packages..."
npm uninstall "${UNUSED_PACKAGES[@]}" 2>/dev/null

# Phase 2: Remove duplicate Excel libraries (keep only exceljs)
echo -e "\n${YELLOW}3. Consolidating Excel libraries...${NC}"
npm uninstall xlsx hyperformula 2>/dev/null

# Phase 3: Remove unused AI SDKs
echo -e "\n${YELLOW}4. Removing unused AI SDKs...${NC}"
npm uninstall @google/generative-ai openai 2>/dev/null

# 3. Deduplicate dependencies
echo -e "\n${YELLOW}5. Deduplicating dependencies...${NC}"
npm dedupe

# 4. Clean and reinstall
echo -e "\n${YELLOW}6. Clean reinstall...${NC}"
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

# 5. Update imports to use tree-shakable imports
echo -e "\n${YELLOW}7. Creating import optimization script...${NC}"

cat > scripts/optimize-imports.js << 'EOF'
const fs = require('fs');
const path = require('path');

// Optimize lodash imports
function optimizeLodashImports(content) {
  // Convert: import _ from 'lodash' -> import specific functions
  return content.replace(
    /import\s+_\s+from\s+['"]lodash['"]/g,
    "import { get, set, debounce, throttle } from 'lodash'"
  );
}

// Optimize date-fns imports
function optimizeDateFnsImports(content) {
  // Convert: import * as dateFns from 'date-fns' -> import specific functions
  return content.replace(
    /import\s+\*\s+as\s+\w+\s+from\s+['"]date-fns['"]/g,
    "import { format, parseISO, differenceInDays } from 'date-fns'"
  );
}

// Process file
function processFile(filePath) {
  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  content = optimizeLodashImports(content);
  content = optimizeDateFnsImports(content);
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Optimized imports in: ${filePath}`);
  }
}

// Walk directory
function walkDir(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      walkDir(filePath);
    } else {
      processFile(filePath);
    }
  });
}

console.log('Optimizing imports...');
walkDir('src');
console.log('Import optimization complete!');
EOF

node scripts/optimize-imports.js

# 6. Create dynamic import helper
echo -e "\n${YELLOW}8. Creating dynamic import utilities...${NC}"

cat > src/lib/dynamic-imports.ts << 'EOF'
import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

// Helper for dynamic imports with loading states
export function dynamicImport<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options?: {
    loading?: ComponentType;
    ssr?: boolean;
  }
) {
  return dynamic(importFunc, {
    loading: options?.loading || (() => <div>Loading...</div>),
    ssr: options?.ssr ?? true,
  });
}

// Preload critical chunks
export function preloadComponent(componentPath: string) {
  if (typeof window !== 'undefined') {
    import(/* webpackPreload: true */ componentPath);
  }
}
EOF

# 7. Analyze bundle size
echo -e "\n${YELLOW}9. Bundle Analysis${NC}"
echo "To analyze bundle size, run:"
echo -e "${GREEN}npm run analyze${NC}"

# 8. Size comparison
echo -e "\n${YELLOW}10. Size Comparison${NC}"
BEFORE_SIZE=$(du -sh src.backup-bundle-opt-* 2>/dev/null | cut -f1 || echo "N/A")
AFTER_SIZE=$(du -sh src 2>/dev/null | cut -f1 || echo "N/A")
NODE_MODULES_SIZE=$(du -sh node_modules 2>/dev/null | cut -f1 || echo "N/A")

echo -e "Source size: ${RED}$BEFORE_SIZE${NC} → ${GREEN}$AFTER_SIZE${NC}"
echo -e "node_modules size: ${GREEN}$NODE_MODULES_SIZE${NC}"

# 9. Recommendations
echo -e "\n${YELLOW}11. Next Steps:${NC}"
echo "1. Run 'npm run analyze' to visualize bundle size"
echo "2. Convert heavy components to use dynamic imports"
echo "3. Implement route-based code splitting"
echo "4. Use React.lazy() for components not needed on initial load"
echo "5. Consider using Suspense boundaries for better UX"

echo -e "\n${GREEN}✅ Bundle optimization complete!${NC}"
echo -e "\nTo rollback: cp package.json.backup-* package.json && npm install"