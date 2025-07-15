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

# Check if environment is provided
if [ -z "$1" ]; then
    print_error "Please provide environment: staging or production"
    echo "Usage: ./scripts/rollback.sh [staging|production]"
    exit 1
fi

ENVIRONMENT=$1

# Validate environment
if [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ]; then
    print_error "Invalid environment. Use 'staging' or 'production'"
    exit 1
fi

print_status "Starting rollback for $ENVIRONMENT..."

if [ "$ENVIRONMENT" = "production" ]; then
    # Get the previous task definition
    print_status "Getting previous task definition..."
    PREVIOUS_TASK_DEF=$(aws ecs describe-services \
        --cluster exhell-cluster \
        --services exhell-service \
        --region ap-northeast-2 \
        --query 'services[0].deployments[1].taskDefinition' \
        --output text)
    
    if [ "$PREVIOUS_TASK_DEF" = "None" ]; then
        print_error "No previous deployment found to rollback to"
        exit 1
    fi
    
    print_status "Rolling back to task definition: $PREVIOUS_TASK_DEF"
    
    # Update service with previous task definition
    aws ecs update-service \
        --cluster exhell-cluster \
        --service exhell-service \
        --task-definition $PREVIOUS_TASK_DEF \
        --region ap-northeast-2
    
    # Wait for rollback to complete
    print_status "Waiting for rollback to stabilize..."
    aws ecs wait services-stable \
        --cluster exhell-cluster \
        --services exhell-service \
        --region ap-northeast-2
    
    # Invalidate CloudFront cache
    print_status "Invalidating CloudFront cache..."
    aws cloudfront create-invalidation \
        --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
        --paths "/*"
    
elif [ "$ENVIRONMENT" = "staging" ]; then
    print_status "Rolling back Vercel deployment..."
    
    # Get the previous deployment
    PREVIOUS_DEPLOYMENT=$(vercel ls --json | jq -r '.[1].uid')
    
    if [ -z "$PREVIOUS_DEPLOYMENT" ]; then
        print_error "No previous deployment found to rollback to"
        exit 1
    fi
    
    # Promote previous deployment
    vercel promote $PREVIOUS_DEPLOYMENT --scope=exhell
fi

print_status "Rollback completed for $ENVIRONMENT!"

# Run health check
print_status "Running health check..."
if [ "$ENVIRONMENT" = "staging" ]; then
    HEALTH_CHECK_URL="https://staging.exhell.com/api/health"
else
    HEALTH_CHECK_URL="https://exhell.com/api/health"
fi

sleep 10

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_CHECK_URL)
if [ "$HTTP_STATUS" = "200" ]; then
    print_status "Health check passed! Rollback successful."
else
    print_error "Health check failed with status: $HTTP_STATUS"
    exit 1
fi