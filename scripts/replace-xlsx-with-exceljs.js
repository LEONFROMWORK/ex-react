const fs = require('fs');
const path = require('path');

// Files that use XLSX
const FILES_TO_UPDATE = [
  'src/Features/ExcelCorrection/CorrectWithAI.ts',
  'src/Features/ExcelCorrection/ApplyCorrections.ts',
  'src/Features/ExcelAnalysis/GenerateReport/GenerateErrorReport.ts',
  'src/Features/ExcelCorrection/CorrectWithAI.test.ts'
];

// XLSX to ExcelJS conversion mappings
const CONVERSIONS = {
  // Import statements
  'import * as XLSX from "xlsx"': 'import ExcelJS from "exceljs"',
  'import * as XLSX from \'xlsx\'': 'import ExcelJS from \'exceljs\'',
  
  // Read operations
  'XLSX.read(': 'await new ExcelJS.Workbook().xlsx.load(',
  'XLSX.readFile(': 'await new ExcelJS.Workbook().xlsx.readFile(',
  
  // Write operations
  'XLSX.write(': 'await workbook.xlsx.writeBuffer(',
  'XLSX.writeFile(': 'await workbook.xlsx.writeFile(',
  
  // Utils
  'XLSX.utils.': '// TODO: Convert XLSX.utils.',
  
  // Sheet operations
  'workbook.Sheets': 'workbook.worksheets',
  'workbook.SheetNames': 'workbook.worksheets.map(ws => ws.name)',
};

function convertFile(filePath) {
  console.log(`\nProcessing: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠️  File not found, skipping...`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Apply conversions
  for (const [from, to] of Object.entries(CONVERSIONS)) {
    if (content.includes(from)) {
      content = content.replace(new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), to);
      modified = true;
      console.log(`  ✓ Replaced: ${from}`);
    }
  }
  
  // Add TODO comments for manual review
  if (content.includes('XLSX.utils.')) {
    content = content.replace(/XLSX\.utils\./g, match => {
      console.log(`  ⚠️  Manual review needed for: ${match}`);
      return `/* TODO: Convert ${match} to ExcelJS */ ${match}`;
    });
  }
  
  if (modified) {
    // Backup original
    fs.writeFileSync(`${filePath}.xlsx-backup`, fs.readFileSync(filePath));
    
    // Write updated content
    fs.writeFileSync(filePath, content);
    console.log(`  ✅ File updated (backup saved as ${path.basename(filePath)}.xlsx-backup)`);
  } else {
    console.log(`  ℹ️  No XLSX usage found`);
  }
}

console.log('🔄 Converting XLSX to ExcelJS...');
console.log('================================');

FILES_TO_UPDATE.forEach(file => {
  convertFile(path.join(process.cwd(), file));
});

console.log('\n✅ Conversion complete!');
console.log('\n⚠️  Important:');
console.log('1. Review files marked with TODO comments');
console.log('2. Test thoroughly before removing xlsx package');
console.log('3. Some XLSX.utils functions may need manual conversion');
console.log('\nTo remove xlsx package: npm uninstall xlsx');