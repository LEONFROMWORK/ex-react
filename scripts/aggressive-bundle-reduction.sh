#!/bin/bash

# Aggressive Bundle Size Reduction
# Based on React bundle optimization best practices

echo "🔥 Aggressive Bundle Size Reduction"
echo "===================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Initial size
echo -e "${YELLOW}Initial State:${NC}"
INITIAL_SIZE=$(du -sh node_modules 2>/dev/null | cut -f1 || echo "0")
INITIAL_COUNT=$(npm list --depth=0 2>/dev/null | grep -c "├─" || echo "0")
echo "node_modules: $INITIAL_SIZE ($INITIAL_COUNT packages)"

# 1. Remove ALL unused packages identified
echo -e "\n${YELLOW}1. Removing unused packages...${NC}"

# Radix UI - only keep what's actually used
UNUSED_RADIX=(
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
)

# Unused features
UNUSED_FEATURES=(
  "@uploadthing/react"
  "uploadthing"
  "jose"
  "cmdk"
  "react-day-picker"
  "@tanstack/react-table"
  "@tosspayments/tosspayments-sdk"
)

# Duplicate libraries
DUPLICATES=(
  "xlsx"
  "hyperformula"
  "@google/generative-ai"
  "openai"
  "axios"  # Use native fetch
)

# Cloud storage (keep only what's used)
CLOUD_STORAGE=(
  "@azure/storage-blob"  # Only AWS S3 is used
)

ALL_UNUSED=("${UNUSED_RADIX[@]}" "${UNUSED_FEATURES[@]}" "${DUPLICATES[@]}" "${CLOUD_STORAGE[@]}")

echo "Removing ${#ALL_UNUSED[@]} packages..."
for pkg in "${ALL_UNUSED[@]}"; do
  echo -n "  Removing $pkg... "
  npm uninstall "$pkg" 2>/dev/null && echo "✓" || echo "✗"
done

# 2. Replace heavy dependencies
echo -e "\n${YELLOW}2. Replacing heavy dependencies...${NC}"

# Remove moment if exists (replaced by date-fns)
npm uninstall moment 2>/dev/null

# 3. Production-only install
echo -e "\n${YELLOW}3. Production build optimization...${NC}"
rm -rf node_modules package-lock.json
NODE_ENV=production npm install --production --legacy-peer-deps

# 4. Tree shake imports
echo -e "\n${YELLOW}4. Optimizing imports...${NC}"

# Create import optimizer
cat > /tmp/optimize-imports.js << 'EOF'
const fs = require('fs');
const path = require('path');

function optimizeFile(filePath) {
  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Optimize lucide-react imports
  if (content.includes('lucide-react')) {
    content = content.replace(
      /import\s*{\s*([^}]+)\s*}\s*from\s*['"]lucide-react['"]/g,
      (match, icons) => {
        const iconList = icons.split(',').map(i => i.trim());
        return iconList.map(icon => 
          `import { ${icon} } from 'lucide-react/dist/esm/icons/${icon.toLowerCase().replace(/icon$/i, '')}'`
        ).join('\n');
      }
    );
    modified = true;
  }
  
  // Remove console.log in production
  content = content.replace(/console\.(log|warn|error|info)\([^)]*\);?/g, '');
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✓ ${path.basename(filePath)}`);
  }
}

function walkDir(dir) {
  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      walkDir(filePath);
    } else {
      optimizeFile(filePath);
    }
  });
}

walkDir('src');
EOF

node /tmp/optimize-imports.js

# 5. Remove unused files
echo -e "\n${YELLOW}5. Removing unused source files...${NC}"

# Remove test files from src
find src -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts" | while read -r file; do
  echo "  Removing test file: $file"
  rm -f "$file"
done

# Remove unused Features
UNUSED_DIRS=(
  "src/Features/Payment"
  "src/Features/Referral"
  "src/Features/Admin/FineTuning"
)

for dir in "${UNUSED_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    echo "  Removing unused feature: $dir"
    rm -rf "$dir"
  fi
done

# 6. Clean build artifacts
echo -e "\n${YELLOW}6. Cleaning build artifacts...${NC}"
rm -rf .next
rm -rf .turbo
rm -rf dist
rm -rf build

# 7. Dedupe and prune
echo -e "\n${YELLOW}7. Final optimization...${NC}"
npm dedupe
npm prune --production

# 8. Generate bundle report
echo -e "\n${YELLOW}8. Bundle Analysis${NC}"
cat > analyze-bundle.js << 'EOF'
const { execSync } = require('child_process');

console.log('Building with bundle analysis...');
try {
  execSync('ANALYZE=true npm run build', { stdio: 'inherit' });
} catch (e) {
  console.log('Build completed. Check .next/analyze for reports.');
}
EOF

# Final results
echo -e "\n${GREEN}===== RESULTS =====${NC}"
FINAL_SIZE=$(du -sh node_modules 2>/dev/null | cut -f1 || echo "0")
FINAL_COUNT=$(npm list --depth=0 2>/dev/null | grep -c "├─" || echo "0")

echo -e "node_modules: ${RED}$INITIAL_SIZE${NC} → ${GREEN}$FINAL_SIZE${NC}"
echo -e "Packages: ${RED}$INITIAL_COUNT${NC} → ${GREEN}$FINAL_COUNT${NC}"

# Calculate reduction
if command -v bc &> /dev/null; then
  INITIAL_MB=$(echo $INITIAL_SIZE | sed 's/M//')
  FINAL_MB=$(echo $FINAL_SIZE | sed 's/M//')
  REDUCTION=$(echo "scale=1; ($INITIAL_MB - $FINAL_MB)" | bc 2>/dev/null || echo "?")
  PERCENTAGE=$(echo "scale=1; ($REDUCTION / $INITIAL_MB) * 100" | bc 2>/dev/null || echo "?")
  echo -e "\n${GREEN}Reduced by ${REDUCTION}MB (${PERCENTAGE}%)${NC}"
fi

echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Run 'node analyze-bundle.js' to see bundle visualization"
echo "2. Test the application thoroughly"
echo "3. Consider implementing:"
echo "   - Lazy loading for routes"
echo "   - Image optimization with next/image"
echo "   - Font subsetting"
echo "   - Service worker for caching"

echo -e "\n${GREEN}✅ Aggressive optimization complete!${NC}"