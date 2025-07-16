#!/bin/bash

echo "🚀 Starting Exhell Development Server..."
echo "===================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json not found!"
  echo "Please run this script from the project root directory."
  exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
  echo "⚠️  Warning: .env.local not found!"
  echo "Creating .env.local with default values..."
  
  cat > .env.local << EOF
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/exhell"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# AI Services
ANTHROPIC_API_KEY="your-anthropic-api-key"

# Redis
REDIS_URL="redis://localhost:6379"

# File Storage
STORAGE_TYPE="local"
UPLOAD_DIR="./uploads"

# Mock Auth (for testing)
MOCK_AUTH_ENABLED="true"
EOF

  echo "✅ Created .env.local with default values"
  echo "Please update with your actual API keys!"
fi

# Start the development server
echo ""
echo "🌐 Starting server on http://localhost:3000"
echo "Press Ctrl+C to stop the server"
echo ""

npm run dev