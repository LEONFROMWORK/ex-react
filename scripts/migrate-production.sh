#!/bin/bash

# Production migration script for Railway

echo "Starting production database migration..."

# Generate Prisma Client
echo "Generating Prisma Client..."
npx prisma generate

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Seed database with initial data (optional)
# Uncomment if you need initial data
# echo "Seeding database..."
# npx prisma db seed

echo "Migration completed successfully!"