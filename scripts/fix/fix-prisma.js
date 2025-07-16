const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Fixing Prisma client...\n');

// Change to project directory
process.chdir('/Users/kevin/excelapp');

// Function to run command
function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        reject(error);
        return;
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
      }
      console.log(stdout);
      resolve(stdout);
    });
  });
}

async function fixPrisma() {
  try {
    // 1. Remove old Prisma client
    const prismaClientPath = path.join(__dirname, 'node_modules', '.prisma');
    if (fs.existsSync(prismaClientPath)) {
      console.log('1. Removing old Prisma client...');
      fs.rmSync(prismaClientPath, { recursive: true, force: true });
    }

    // 2. Generate new Prisma client
    console.log('2. Generating new Prisma client...');
    await runCommand('npx prisma generate');

    // 3. Push database schema if needed
    const dbPath = path.join(__dirname, 'prisma', 'dev.db');
    if (!fs.existsSync(dbPath)) {
      console.log('3. Creating SQLite database...');
      await runCommand('npx prisma db push --skip-seed');
    } else {
      console.log('3. SQLite database already exists.');
    }

    console.log('\n✅ Prisma client fixed successfully!');
    
    // Now start the servers
    console.log('\n4. Starting all services...');
    const { startAllServices } = require('./start-services');
    await startAllServices();
    
  } catch (error) {
    console.error('Failed to fix Prisma:', error);
    process.exit(1);
  }
}

fixPrisma();