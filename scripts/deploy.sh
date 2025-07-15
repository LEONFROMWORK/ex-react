#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Check if environment is provided
if [ -z "$1" ]; then
    print_error "Please provide environment: staging or production"
    echo "Usage: ./scripts/deploy.sh [staging|production]"
    exit 1
fi

ENVIRONMENT=$1

# Validate environment
if [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ]; then
    print_error "Invalid environment. Use 'staging' or 'production'"
    exit 1
fi

print_status "Starting deployment to $ENVIRONMENT..."

# Load environment variables
if [ -f ".env.$ENVIRONMENT" ]; then
    print_status "Loading environment variables from .env.$ENVIRONMENT"
    export $(cat .env.$ENVIRONMENT | grep -v '^#' | xargs)
else
    print_warning ".env.$ENVIRONMENT file not found. Using existing environment variables."
fi

# Run tests
print_status "Running tests..."
npm run test:unit
npm run test:integration

# Build application
print_status "Building application..."
npm run build

# Database migrations
print_status "Running database migrations..."
npx prisma migrate deploy

# Deploy based on environment
if [ "$ENVIRONMENT" = "staging" ]; then
    print_status "Deploying to Vercel staging..."
    vercel --prod --env-file=.env.staging
elif [ "$ENVIRONMENT" = "production" ]; then
    print_status "Deploying to AWS production..."
    
    # Build Docker image
    print_status "Building Docker image..."
    docker build -t exhell-app:latest .
    
    # Tag and push to ECR
    print_status "Pushing to ECR..."
    aws ecr get-login-password --region ap-northeast-2 | docker login --username AWS --password-stdin $ECR_REGISTRY
    docker tag exhell-app:latest $ECR_REGISTRY/exhell-app:latest
    docker push $ECR_REGISTRY/exhell-app:latest
    
    # Update ECS service
    print_status "Updating ECS service..."
    aws ecs update-service \
        --cluster exhell-cluster \
        --service exhell-service \
        --force-new-deployment \
        --region ap-northeast-2
    
    # Wait for deployment to stabilize
    print_status "Waiting for deployment to stabilize..."
    aws ecs wait services-stable \
        --cluster exhell-cluster \
        --services exhell-service \
        --region ap-northeast-2
    
    # Invalidate CloudFront cache
    print_status "Invalidating CloudFront cache..."
    aws cloudfront create-invalidation \
        --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
        --paths "/*"
fi

print_status "Deployment to $ENVIRONMENT completed successfully!"

# Run post-deployment checks
print_status "Running post-deployment health checks..."
if [ "$ENVIRONMENT" = "staging" ]; then
    HEALTH_CHECK_URL="https://staging.exhell.com/api/health"
else
    HEALTH_CHECK_URL="https://exhell.com/api/health"
fi

# Wait a bit for the deployment to propagate
sleep 30

# Check health endpoint
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_CHECK_URL)
if [ "$HTTP_STATUS" = "200" ]; then
    print_status "Health check passed!"
else
    print_error "Health check failed with status: $HTTP_STATUS"
    exit 1
fi

print_status "Deployment completed and verified!"