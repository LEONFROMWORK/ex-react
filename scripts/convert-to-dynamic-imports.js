const fs = require('fs');
const path = require('path');

// Components that should be dynamically imported
const HEAVY_COMPONENTS = [
  'ExcelAnalyzer',
  'AIChat',
  'AdminDashboard',
  'FileUpload',
  'DataTable',
  'Chart',
  'Editor',
  'ReferralDashboard',
  'PaymentForm',
  'FineTuning',
];

// Convert component imports to dynamic imports
function convertToDynamicImport(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Skip if already using dynamic imports
  if (content.includes('dynamic from') || content.includes('React.lazy')) {
    return false;
  }
  
  // Check for heavy component imports
  HEAVY_COMPONENTS.forEach(component => {
    const importRegex = new RegExp(
      `import\\s+(?:{[^}]*}|\\w+)\\s+from\\s+['"].*${component}['"]`,
      'g'
    );
    
    if (importRegex.test(content)) {
      // Add dynamic import at the top
      if (!content.includes("import dynamic from 'next/dynamic'")) {
        content = "import dynamic from 'next/dynamic';\n" + content;
      }
      
      // Replace import with dynamic import
      content = content.replace(importRegex, (match) => {
        const componentName = match.match(/import\s+(\w+)/)?.[1] || component;
        return `const ${componentName} = dynamic(() => import('${match.match(/from\s+['"]([^'"]+)['"]/)?.[1]}'), {
  loading: () => <div>Loading ${component}...</div>,
  ssr: false,
})`;
      });
      
      modified = true;
    }
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Converted to dynamic imports: ${filePath}`);
    return true;
  }
  
  return false;
}

// Find pages and components using heavy components
function findAndConvert(dir) {
  let count = 0;
  
  function walkDir(currentDir) {
    const files = fs.readdirSync(currentDir);
    
    files.forEach(file => {
      const filePath = path.join(currentDir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        walkDir(filePath);
      } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        if (convertToDynamicImport(filePath)) {
          count++;
        }
      }
    });
  }
  
  walkDir(dir);
  return count;
}

console.log('🔄 Converting heavy components to dynamic imports...');
console.log('================================================');

// Process app directory
const appCount = findAndConvert(path.join(process.cwd(), 'src/app'));
const componentsCount = findAndConvert(path.join(process.cwd(), 'src/components'));

console.log(`\n✅ Conversion complete!`);
console.log(`   - App pages converted: ${appCount}`);
console.log(`   - Components converted: ${componentsCount}`);
console.log(`\n💡 This will significantly reduce initial bundle size!`);