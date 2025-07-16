#!/bin/bash

# Script to optimize node_modules for production deployment

echo "Starting dependency optimization..."

# 1. Clean install with production flag
echo "Cleaning node_modules..."
rm -rf node_modules package-lock.json

echo "Installing production dependencies only..."
npm install --production --legacy-peer-deps

# 2. Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# 3. Remove unnecessary files from node_modules
echo "Removing unnecessary files from node_modules..."
find node_modules -name "*.md" -type f -delete
find node_modules -name "*.txt" -type f -delete
find node_modules -name "*.yml" -type f -delete
find node_modules -name "*.yaml" -type f -delete
find node_modules -name ".npmignore" -type f -delete
find node_modules -name ".gitignore" -type f -delete
find node_modules -name "LICENSE*" -type f -delete
find node_modules -name "CHANGELOG*" -type f -delete
find node_modules -name "README*" -type f -delete
find node_modules -name "test" -type d -exec rm -rf {} +
find node_modules -name "tests" -type d -exec rm -rf {} +
find node_modules -name "__tests__" -type d -exec rm -rf {} +
find node_modules -name "example" -type d -exec rm -rf {} +
find node_modules -name "examples" -type d -exec rm -rf {} +
find node_modules -name ".github" -type d -exec rm -rf {} +
find node_modules -name "docs" -type d -exec rm -rf {} +

# 4. Remove type definitions for production (if not using TypeScript in production)
# find node_modules -name "*.d.ts" -type f -delete

# 5. Report size
echo "Optimization complete!"
echo "Node modules size:"
du -sh node_modules

# 6. Create production lock file
echo "Creating production lock file..."
npm install --package-lock-only --production

echo "Done!"