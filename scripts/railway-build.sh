#!/bin/bash
# Railway build script to bypass npm ci
echo "Starting custom build process..."
rm -rf node_modules package-lock.json
npm install
npx prisma generate
npm run build