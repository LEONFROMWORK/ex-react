#!/bin/bash

echo "Starting safe build process..."

# Set build-time environment variable
export BUILDING=true
export NODE_ENV=production

# Generate Prisma client without connecting to database
echo "Generating Prisma client..."
npx prisma generate

# Build Next.js app
echo "Building Next.js application..."
npx next build

# Unset build-time environment variable
unset BUILDING

echo "Build completed successfully!"