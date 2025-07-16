const fs = require('fs');
const path = require('path');

// API routes that need to be dynamic
const dynamicRoutes = [
  'src/app/api/admin/ai-routing/config/route.ts',
  'src/app/api/admin/error-patterns/stats/route.ts',
  'src/app/api/admin/ai-models/openrouter/models/route.ts',
  'src/app/api/admin/payments/stats/route.ts',
  'src/app/api/admin/payments/route.ts',
  'src/app/api/admin/ai-stats/route.ts',
  'src/app/api/admin/referrals/rewards/route.ts',
  'src/app/api/admin/users/export/route.ts',
  'src/app/api/admin/referrals/route.ts',
  'src/app/api/admin/referrals/stats/route.ts',
  'src/app/api/admin/reviews/route.ts',
  'src/app/api/admin/stats/route.ts',
  'src/app/api/ai/models/active/route.ts',
  'src/app/api/admin/users/route.ts',
  'src/app/api/payments/fail/route.ts',
  'src/app/api/features/excel-analysis/history/route.ts',
  'src/app/api/payments/success/route.ts',
  'src/app/api/referral/dashboard/route.ts',
  'src/app/api/referral/stats/route.ts',
  'src/app/api/usage/report/route.ts',
  'src/app/api/reviews/my/route.ts',
  'src/app/api/reviews/route.ts',
  'src/app/api/user/token-usage/route.ts',
  'src/app/api/user/profile/route.ts',
];

const dynamicExport = "export const dynamic = 'force-dynamic'\n\n";

dynamicRoutes.forEach(routePath => {
  const fullPath = path.join(__dirname, routePath);
  
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Check if already has dynamic export
    if (!content.includes("export const dynamic")) {
      // Find the first import statement
      const importMatch = content.match(/^import[\s\S]*?\n\n/m);
      if (importMatch) {
        // Insert after imports
        content = content.replace(importMatch[0], importMatch[0] + dynamicExport);
      } else {
        // Insert at the beginning
        content = dynamicExport + content;
      }
      
      fs.writeFileSync(fullPath, content);
      console.log(`✅ Fixed: ${routePath}`);
    } else {
      console.log(`⏭️  Skipped (already fixed): ${routePath}`);
    }
  } else {
    console.log(`❌ Not found: ${routePath}`);
  }
});

console.log('\n✨ Done!');